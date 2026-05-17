// ── NUUR DASHBOARD FEATURES ─────────────────────────────────────────
// Interview Scheduler, Salary Tracker, Networking, Kanban, Score,
// Cover Letters, Email Templates, Agent Goals, Saved Searches, Analytics
// Requires: newtab.js globals (DB, NUUR_USER_ID, callNuur, renderMarkdown)

// ══════════════════════════════════════════════════════════════════
// ── INTERVIEW SCHEDULER ───────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

async function loadInterviews() {
  const el = document.getElementById("dash-interviews");
  if (!el) return;

  try {
    const data = await DB.get("nuur_interviews", "?user_id=eq.${NUUR_USER_ID}&order=scheduled_at.asc&limit=10");
    if (!Array.isArray(data) || !data.length) return;

    el.replaceChildren();
    data.forEach(iv => renderInterviewRow(iv, el));
  } catch (_) {}
}

function renderInterviewRow(iv, container) {
  const row = document.createElement("div");
  row.style.cssText = "background:var(--bg1);border:1px solid var(--border);border-radius:12px;padding:13px 15px;margin-bottom:8px;box-shadow:var(--shadow-sm)";

  const top = document.createElement("div");
  top.style.cssText = "display:flex;align-items:center;gap:10px;margin-bottom:8px";

  // Round badge
  const round = document.createElement("div");
  round.style.cssText = "width:32px;height:32px;border-radius:8px;background:var(--teal3);border:1px solid rgba(13,148,136,0.2);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:var(--teal);flex-shrink:0";
  round.textContent = iv.round || "1";

  const info = document.createElement("div");
  info.style.flex = "1";
  const title = document.createElement("div");
  title.style.cssText = "font-size:13px;font-weight:500;color:var(--text0)";
  title.textContent = iv.company || "Unknown company";
  const sub = document.createElement("div");
  sub.style.cssText = "font-size:11px;color:var(--text3)";
  sub.textContent = [iv.role, iv.interview_type].filter(Boolean).join(" · ");
  info.appendChild(title);
  info.appendChild(sub);

  // Status badge
  const statusColors = {
    scheduled: ["var(--teal3)", "var(--teal)"],
    completed: ["rgba(22,163,74,0.08)", "var(--green)"],
    cancelled: ["rgba(239,68,68,0.08)", "var(--red)"],
    pending:   ["var(--bg3)", "var(--text3)"]
  };
  const [sbg, sc] = statusColors[iv.status] || statusColors.pending;
  const statusBadge = document.createElement("div");
  statusBadge.style.cssText = `background:${sbg};color:${sc};font-size:10px;font-weight:500;padding:3px 9px;border-radius:10px;flex-shrink:0`;
  statusBadge.textContent = (iv.status || "pending").charAt(0).toUpperCase() + (iv.status || "pending").slice(1);

  top.appendChild(round);
  top.appendChild(info);
  top.appendChild(statusBadge);

  // Details row
  const details = document.createElement("div");
  details.style.cssText = "display:flex;gap:16px;font-size:11px;color:var(--text3);flex-wrap:wrap";

  if (iv.scheduled_at) {
    const dateEl = document.createElement("span");
    dateEl.textContent = "📅 " + new Date(iv.scheduled_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    details.appendChild(dateEl);
  }
  if (iv.interviewer) {
    const intEl = document.createElement("span");
    intEl.textContent = "👤 " + iv.interviewer;
    details.appendChild(intEl);
  }
  if (iv.salary_discussed) {
    const salEl = document.createElement("span");
    salEl.style.color = "var(--green)";
    salEl.textContent = "💰 " + iv.salary_discussed;
    details.appendChild(salEl);
  }

  // Prep checklist
  if (iv.prep_checklist?.length) {
    const prep = document.createElement("div");
    prep.style.cssText = "margin-top:8px;padding-top:8px;border-top:1px solid var(--border3)";
    const prepTitle = document.createElement("div");
    prepTitle.style.cssText = "font-size:10px;font-weight:500;color:var(--text3);margin-bottom:5px;text-transform:uppercase;letter-spacing:.06em";
    prepTitle.textContent = "Prep checklist";
    prep.appendChild(prepTitle);
    iv.prep_checklist.forEach(item => {
      const chk = document.createElement("div");
      chk.style.cssText = "display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text2);margin-bottom:3px;cursor:pointer";
      const box = document.createElement("div");
      box.style.cssText = `width:14px;height:14px;border-radius:4px;border:1.5px solid ${item.done ? "var(--teal)" : "var(--border)"};background:${item.done ? "var(--teal)" : "transparent"};display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .12s`;
      if (item.done) { const tick = document.createElement("span"); tick.style.cssText = "color:#fff;font-size:9px;line-height:1"; tick.textContent = "✓"; box.appendChild(tick); }
      const lbl = document.createElement("span");
      lbl.textContent = item.text;
      if (item.done) lbl.style.cssText = "text-decoration:line-through;color:var(--text3)";
      chk.appendChild(box);
      chk.appendChild(lbl);
      chk.addEventListener("click", () => togglePrepItem(iv.id, iv.prep_checklist, item));
      prep.appendChild(chk);
    });
    row.appendChild(top);
    row.appendChild(details);
    row.appendChild(prep);
  } else {
    row.appendChild(top);
    row.appendChild(details);
  }

  // Action buttons
  const actions = document.createElement("div");
  actions.style.cssText = "display:flex;gap:6px;margin-top:10px";
  const editBtn = document.createElement("button");
  editBtn.className = "btn btn-secondary";
  editBtn.style.cssText = "padding:5px 12px;font-size:11px;border-radius:7px;background:var(--bg0);border:1px solid var(--border);color:var(--text2);cursor:pointer;font-family:var(--font)";
  editBtn.textContent = "Edit";
  editBtn.addEventListener("click", () => showInterviewModal(iv));
  const prepBtn = document.createElement("button");
  prepBtn.className = "btn btn-secondary";
  prepBtn.style.cssText = "padding:5px 12px;font-size:11px;border-radius:7px;background:var(--teal3);border:1px solid rgba(13,148,136,0.2);color:var(--teal);cursor:pointer;font-family:var(--font)";
  prepBtn.textContent = "AI Prep";
  prepBtn.addEventListener("click", () => generateInterviewPrep(iv));
  const debriefBtn = document.createElement("button");
  debriefBtn.style.cssText = "padding:5px 12px;font-size:11px;border-radius:7px;background:transparent;border:1px solid var(--border);color:var(--text3);cursor:pointer;font-family:var(--font)";
  debriefBtn.textContent = "Debrief";
  debriefBtn.dataset.nuurDebrief = iv.id;
  debriefBtn.addEventListener("click", () => generateInterviewDebrief(iv.id));
  actions.appendChild(editBtn);
  actions.appendChild(prepBtn);
  actions.appendChild(debriefBtn);
  row.appendChild(actions);

  container.appendChild(row);
}

async function togglePrepItem(interviewId, checklist, item) {
  item.done = !item.done;
  await DB.update("nuur_interviews", `id=eq.${interviewId}`, { prep_checklist: checklist });
  loadInterviews();
}

async function generateInterviewPrep(iv) {
  const prompt = `Generate a focused interview prep checklist for this role. Be specific and actionable.

Role: ${iv.role || "the position"}
Company: ${iv.company}
Round: ${iv.round || 1} (${iv.interview_type || "general"})
Interviewer: ${iv.interviewer || "unknown"}

Include:
1. 5 key topics to study for this specific company/role
2. 3 STAR stories to prepare (Situation, Task, Action, Result)
3. 5 smart questions to ask them
4. One thing to research about the interviewer if known
Keep it concise and practical.`;

  try {
    const response = await callNuur({ prompt, model: MODEL.DEFAULT });
    // Parse into checklist items and save
    const items = response.split("\n")
      .filter(l => l.trim().match(/^[\d\-\*•]/))
      .map(l => ({ text: l.replace(/^[\d\.\-\*•]\s*/, "").trim(), done: false }))
      .filter(i => i.text.length > 3)
      .slice(0, 12);

    await DB.update("nuur_interviews", `id=eq.${iv.id}`, { prep_checklist: items });
    loadInterviews();
  } catch (_) {}
}

function showInterviewModal(existing = null) {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;padding:20px;font-family:var(--font)";
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });

  const card = document.createElement("div");
  card.style.cssText = "background:var(--bg1);border:1px solid var(--border);border-radius:16px;width:100%;max-width:480px;padding:24px;box-shadow:var(--shadow-lg)";

  const title = document.createElement("div");
  title.style.cssText = "font-size:15px;font-weight:600;color:var(--text0);margin-bottom:18px";
  title.textContent = existing ? "Edit Interview" : "Schedule Interview";
  card.appendChild(title);

  const fields = [
    { label: "Company", key: "company", type: "text", placeholder: "e.g. Google, Deloitte" },
    { label: "Role", key: "role", type: "text", placeholder: "e.g. Junior GRC Analyst" },
    { label: "Round", key: "round", type: "number", placeholder: "1", min: 1, max: 10 },
    { label: "Interview type", key: "interview_type", type: "select", options: ["Phone screen", "Technical", "Behavioral", "Panel", "Final round", "HR", "Case study"] },
    { label: "Date & time", key: "scheduled_at", type: "datetime-local" },
    { label: "Interviewer name(s)", key: "interviewer", type: "text", placeholder: "e.g. Sarah Chen, Hiring Manager" },
    { label: "Salary discussed", key: "salary_discussed", type: "text", placeholder: "e.g. $65,000" },
    { label: "Location / Link", key: "location", type: "text", placeholder: "e.g. Zoom link or office address" },
    { label: "Notes", key: "notes", type: "textarea", placeholder: "Anything to remember..." },
  ];

  const values = {};
  fields.forEach(f => {
    const group = document.createElement("div");
    group.style.cssText = "margin-bottom:12px";
    const lbl = document.createElement("label");
    lbl.style.cssText = "display:block;font-size:11px;font-weight:500;color:var(--text2);margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em";
    lbl.textContent = f.label;
    group.appendChild(lbl);

    let input;
    if (f.type === "select") {
      input = document.createElement("select");
      input.className = "input";
      f.options.forEach(o => {
        const opt = document.createElement("option");
        opt.value = o; opt.textContent = o;
        if (existing?.[f.key] === o) opt.selected = true;
        input.appendChild(opt);
      });
    } else if (f.type === "textarea") {
      input = document.createElement("textarea");
      input.className = "input";
      input.rows = 2;
      input.style.resize = "vertical";
      if (existing?.[f.key]) input.value = existing[f.key];
    } else {
      input = document.createElement("input");
      input.className = "input";
      input.type = f.type;
      if (f.placeholder) input.placeholder = f.placeholder;
      if (f.min) input.min = f.min;
      if (f.max) input.max = f.max;
      if (existing?.[f.key]) {
        input.value = f.type === "datetime-local" && existing[f.key]
          ? new Date(existing[f.key]).toISOString().slice(0, 16)
          : existing[f.key];
      }
    }
    input.addEventListener("change", () => { values[f.key] = input.value; });
    input.addEventListener("input", () => { values[f.key] = input.value; });
    group.appendChild(input);
    card.appendChild(group);
    if (existing?.[f.key]) values[f.key] = existing[f.key];
  });

  // Status dropdown
  const statusGroup = document.createElement("div");
  statusGroup.style.cssText = "margin-bottom:16px";
  const statusLbl = document.createElement("label");
  statusLbl.style.cssText = "display:block;font-size:11px;font-weight:500;color:var(--text2);margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em";
  statusLbl.textContent = "Status";
  const statusSel = document.createElement("select");
  statusSel.className = "input";
  ["scheduled", "completed", "cancelled"].forEach(s => {
    const o = document.createElement("option");
    o.value = s; o.textContent = s.charAt(0).toUpperCase() + s.slice(1);
    if (existing?.status === s) o.selected = true;
    statusSel.appendChild(o);
  });
  statusSel.addEventListener("change", () => { values.status = statusSel.value; });
  values.status = existing?.status || "scheduled";
  statusGroup.appendChild(statusLbl);
  statusGroup.appendChild(statusSel);
  card.appendChild(statusGroup);

  // Buttons
  const btnRow = document.createElement("div");
  btnRow.style.cssText = "display:flex;gap:8px;justify-content:flex-end;margin-top:4px";
  const cancel = document.createElement("button");
  cancel.className = "btn btn-secondary";
  cancel.style.cssText = "padding:8px 16px;border-radius:9px;background:var(--bg0);border:1px solid var(--border);color:var(--text2);cursor:pointer;font-family:var(--font);font-size:12px";
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", () => overlay.remove());
  const save = document.createElement("button");
  save.className = "btn btn-primary";
  save.style.cssText = "padding:8px 20px;border-radius:9px;background:var(--teal);border:none;color:#fff;cursor:pointer;font-family:var(--font);font-size:12px;font-weight:500";
  save.textContent = existing ? "Save changes" : "Schedule";
  save.addEventListener("click", async () => {
    save.textContent = "Saving…";
    save.disabled = true;
    const payload = {
      user_id: NUUR_USER_ID,
      company: values.company || "",
      role: values.role || "",
      round: parseInt(values.round) || 1,
      interview_type: values.interview_type || "General",
      scheduled_at: values.scheduled_at || null,
      interviewer: values.interviewer || "",
      salary_discussed: values.salary_discussed || "",
      location: values.location || "",
      notes: values.notes || "",
      status: values.status || "scheduled",
      prep_checklist: existing?.prep_checklist || [],
      created_at: new Date().toISOString()
    };
    if (existing) {
      await DB.update("nuur_interviews", `id=eq.${existing.id}`, payload);
    } else {
      payload.id = `iv_${Date.now()}`;
      await DB.insert("nuur_interviews", payload);
    }
    overlay.remove();
    loadInterviews();
    // Auto-generate prep if new interview
    if (!existing) {
      generateInterviewPrep({ ...payload, id: payload.id });
    }
  });
  btnRow.appendChild(cancel);
  btnRow.appendChild(save);
  card.appendChild(btnRow);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  card.querySelector("input")?.focus();
}

// Wire add button
document.getElementById("add-interview-btn")?.addEventListener("click", e => {
  e.preventDefault();
  showInterviewModal();
});

// ══════════════════════════════════════════════════════════════════
// ── SALARY TRACKER ────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

async function loadSalaryTracker() {
  const el = document.getElementById("dash-salary");
  if (!el) return;

  try {
    const data = await DB.get("nuur_salary", "?user_id=eq.${NUUR_USER_ID}&order=logged_at.desc&limit=10");
    if (!Array.isArray(data) || !data.length) return;

    el.replaceChildren();

    // Summary stats
    const salaries = data.map(s => s.offered || s.expected || 0).filter(Boolean);
    if (salaries.length) {
      const avg = Math.round(salaries.reduce((a,b) => a+b, 0) / salaries.length);
      const max = Math.max(...salaries);
      const min = Math.min(...salaries);

      const stats = document.createElement("div");
      stats.style.cssText = "display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px";
      [
        { label: "Average", value: `$${avg.toLocaleString()}`, color: "var(--teal)" },
        { label: "Highest", value: `$${max.toLocaleString()}`, color: "var(--green)" },
        { label: "Lowest",  value: `$${min.toLocaleString()}`, color: "var(--text2)" },
      ].forEach(s => {
        const box = document.createElement("div");
        box.style.cssText = "background:var(--bg1);border:1px solid var(--border);border-radius:10px;padding:10px;text-align:center";
        const num = document.createElement("div");
        num.style.cssText = `font-size:16px;font-weight:700;color:${s.color};letter-spacing:-.03em`;
        num.textContent = s.value;
        const lbl = document.createElement("div");
        lbl.style.cssText = "font-size:10px;color:var(--text3);margin-top:2px";
        lbl.textContent = s.label;
        box.appendChild(num); box.appendChild(lbl);
        stats.appendChild(box);
      });
      el.appendChild(stats);
    }

    // Salary bar chart
    const chart = document.createElement("div");
    chart.style.cssText = "display:flex;flex-direction:column;gap:6px;margin-bottom:10px";
    const chartMax = Math.max(...data.map(s => Math.max(s.offered || 0, s.expected || 0, s.market_rate || 0)));

    data.slice(0, 5).forEach(s => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;gap:10px";
      const co = document.createElement("div");
      co.style.cssText = "width:100px;font-size:11px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0";
      co.textContent = s.company;
      const bars = document.createElement("div");
      bars.style.cssText = "flex:1;display:flex;flex-direction:column;gap:2px";

      if (s.expected) {
        const bar = makeBar(s.expected, chartMax, "var(--teal3)", "var(--teal)", `Expected: $${s.expected.toLocaleString()}`);
        bars.appendChild(bar);
      }
      if (s.offered) {
        const bar = makeBar(s.offered, chartMax, "rgba(22,163,74,0.12)", "var(--green)", `Offered: $${s.offered.toLocaleString()}`);
        bars.appendChild(bar);
      }
      if (s.market_rate) {
        const bar = makeBar(s.market_rate, chartMax, "rgba(217,119,6,0.08)", "var(--gold)", `Market: $${s.market_rate.toLocaleString()}`);
        bars.appendChild(bar);
      }
      row.appendChild(co);
      row.appendChild(bars);
      chart.appendChild(row);
    });
    el.appendChild(chart);

  } catch (_) {}
}

function makeBar(value, max, bg, color, label) {
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;align-items:center;gap:6px";
  const bar = document.createElement("div");
  bar.style.cssText = `height:16px;border-radius:4px;background:${bg};border:1px solid ${color};position:relative;transition:width .4s var(--ease)`;
  bar.style.width = Math.round((value / max) * 100) + "%";
  bar.title = label;
  const lbl = document.createElement("span");
  lbl.style.cssText = `font-size:10px;color:${color};white-space:nowrap`;
  lbl.textContent = label;
  wrap.appendChild(bar);
  wrap.appendChild(lbl);
  return wrap;
}

function showSalaryModal(existing = null) {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;padding:20px;font-family:var(--font)";
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });

  const card = document.createElement("div");
  card.style.cssText = "background:var(--bg1);border:1px solid var(--border);border-radius:16px;width:100%;max-width:420px;padding:24px;box-shadow:var(--shadow-lg)";

  const title = document.createElement("div");
  title.style.cssText = "font-size:15px;font-weight:600;color:var(--text0);margin-bottom:18px";
  title.textContent = existing ? "Edit Salary Entry" : "Log Salary Data";
  card.appendChild(title);

  const fields = [
    { label: "Company", key: "company", type: "text", placeholder: "e.g. Deloitte" },
    { label: "Role", key: "role", type: "text", placeholder: "e.g. GRC Analyst" },
    { label: "Your expectation ($)", key: "expected", type: "number", placeholder: "e.g. 65000" },
    { label: "Offered amount ($)", key: "offered", type: "number", placeholder: "e.g. 62000" },
    { label: "Market rate ($)", key: "market_rate", type: "number", placeholder: "e.g. 68000" },
    { label: "Benefits summary", key: "benefits", type: "text", placeholder: "e.g. 401k, health, 15 PTO days" },
    { label: "Outcome", key: "outcome", type: "select", options: ["Pending", "Accepted", "Declined", "Negotiating", "Rejected"] },
    { label: "Notes", key: "notes", type: "textarea", placeholder: "Negotiation notes, what worked..." },
  ];

  const values = {};
  fields.forEach(f => {
    const group = document.createElement("div");
    group.style.cssText = "margin-bottom:12px";
    const lbl = document.createElement("label");
    lbl.style.cssText = "display:block;font-size:11px;font-weight:500;color:var(--text2);margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em";
    lbl.textContent = f.label;
    group.appendChild(lbl);
    let input;
    if (f.type === "select") {
      input = document.createElement("select");
      input.className = "input";
      f.options.forEach(o => { const opt = document.createElement("option"); opt.value = o; opt.textContent = o; if (existing?.[f.key] === o) opt.selected = true; input.appendChild(opt); });
    } else if (f.type === "textarea") {
      input = document.createElement("textarea");
      input.className = "input"; input.rows = 2; input.style.resize = "vertical";
      if (existing?.[f.key]) input.value = existing[f.key];
    } else {
      input = document.createElement("input");
      input.className = "input"; input.type = f.type;
      if (f.placeholder) input.placeholder = f.placeholder;
      if (existing?.[f.key]) input.value = existing[f.key];
    }
    input.addEventListener("input", () => { values[f.key] = f.type === "number" ? parseFloat(input.value) || 0 : input.value; });
    if (existing?.[f.key]) values[f.key] = existing[f.key];
    group.appendChild(input);
    card.appendChild(group);
  });

  const btnRow = document.createElement("div");
  btnRow.style.cssText = "display:flex;gap:8px;justify-content:flex-end;margin-top:4px";
  const cancel = document.createElement("button");
  cancel.style.cssText = "padding:8px 16px;border-radius:9px;background:var(--bg0);border:1px solid var(--border);color:var(--text2);cursor:pointer;font-family:var(--font);font-size:12px";
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", () => overlay.remove());
  const save = document.createElement("button");
  save.style.cssText = "padding:8px 20px;border-radius:9px;background:var(--teal);border:none;color:#fff;cursor:pointer;font-family:var(--font);font-size:12px;font-weight:500";
  save.textContent = existing ? "Save" : "Log it";
  save.addEventListener("click", async () => {
    save.textContent = "Saving…"; save.disabled = true;
    const payload = { user_id: NUUR_USER_ID, logged_at: new Date().toISOString(), ...values };
    if (existing) { await DB.update("nuur_salary", `id=eq.${existing.id}`, payload); }
    else { payload.id = `sal_${Date.now()}`; await DB.insert("nuur_salary", payload); }
    overlay.remove();
    loadSalaryTracker();
  });
  btnRow.appendChild(cancel); btnRow.appendChild(save);
  card.appendChild(btnRow);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  card.querySelector("input")?.focus();
}

document.getElementById("add-salary-btn")?.addEventListener("click", e => { e.preventDefault(); showSalaryModal(); });

// ══════════════════════════════════════════════════════════════════
// ── NETWORKING TRACKER ────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

async function loadNetworkingTracker() {
  const el = document.getElementById("dash-network");
  if (!el) return;

  try {
    const data = await DB.get("nuur_contacts", "?user_id=eq.${NUUR_USER_ID}&order=last_contacted.desc&limit=10");
    if (!Array.isArray(data) || !data.length) return;

    el.replaceChildren();
    data.forEach(contact => renderContactCard(contact, el));
  } catch (_) {}
}

function renderContactCard(c, container) {
  const row = document.createElement("div");
  row.style.cssText = "display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border3);cursor:pointer";
  row.addEventListener("mouseenter", () => row.style.background = "var(--bg0)");
  row.addEventListener("mouseleave", () => row.style.background = "transparent");
  row.addEventListener("click", () => showContactModal(c));

  const avatar = document.createElement("div");
  avatar.style.cssText = "width:36px;height:36px;border-radius:10px;background:var(--teal3);border:1px solid rgba(13,148,136,0.15);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;font-weight:600;color:var(--teal)";
  avatar.textContent = (c.name || "?").charAt(0).toUpperCase();

  const info = document.createElement("div");
  info.style.flex = "1"; info.style.minWidth = "0";

  const nameRow = document.createElement("div");
  nameRow.style.cssText = "display:flex;align-items:center;gap:6px";
  const name = document.createElement("div");
  name.style.cssText = "font-size:13px;font-weight:500;color:var(--text0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
  name.textContent = c.name || "Unknown";
  nameRow.appendChild(name);

  if (c.is_referral) {
    const ref = document.createElement("span");
    ref.style.cssText = "background:var(--teal3);color:var(--teal);font-size:9px;font-weight:600;padding:1px 6px;border-radius:8px;flex-shrink:0";
    ref.textContent = "REFERRAL";
    nameRow.appendChild(ref);
  }

  const sub = document.createElement("div");
  sub.style.cssText = "font-size:11px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px";
  sub.textContent = [c.title, c.company].filter(Boolean).join(" at ") || "";

  info.appendChild(nameRow);
  info.appendChild(sub);

  const right = document.createElement("div");
  right.style.cssText = "flex-shrink:0;text-align:right";

  if (c.follow_up_at) {
    const fu = new Date(c.follow_up_at);
    const isPast = fu < new Date();
    const fuEl = document.createElement("div");
    fuEl.style.cssText = `font-size:10px;font-weight:500;color:${isPast ? "var(--red)" : "var(--gold)"};white-space:nowrap`;
    fuEl.textContent = isPast ? "⚠ Follow up due" : `Follow up ${fu.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    right.appendChild(fuEl);
  }

  if (c.last_contacted) {
    const lc = document.createElement("div");
    lc.style.cssText = "font-size:10px;color:var(--text4);margin-top:2px";
    lc.textContent = "Last: " + new Date(c.last_contacted).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    right.appendChild(lc);
  }

  row.appendChild(avatar);
  row.appendChild(info);
  row.appendChild(right);
  container.appendChild(row);
}

function showContactModal(existing = null) {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;padding:20px;font-family:var(--font)";
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });

  const card = document.createElement("div");
  card.style.cssText = "background:var(--bg1);border:1px solid var(--border);border-radius:16px;width:100%;max-width:460px;padding:24px;box-shadow:var(--shadow-lg)";

  const title = document.createElement("div");
  title.style.cssText = "font-size:15px;font-weight:600;color:var(--text0);margin-bottom:18px";
  title.textContent = existing ? "Edit Contact" : "Add Contact";
  card.appendChild(title);

  const fields = [
    { label: "Name", key: "name", type: "text", placeholder: "Full name" },
    { label: "Title / Role", key: "title", type: "text", placeholder: "e.g. Senior GRC Manager" },
    { label: "Company", key: "company", type: "text", placeholder: "e.g. Deloitte" },
    { label: "LinkedIn URL", key: "linkedin", type: "url", placeholder: "https://linkedin.com/in/..." },
    { label: "Email", key: "email", type: "email", placeholder: "their@email.com" },
    { label: "How we met", key: "how_met", type: "select", options: ["LinkedIn", "Job event", "Referral", "Alumni network", "Conference", "Online community", "Cold outreach", "Other"] },
    { label: "Follow-up date", key: "follow_up_at", type: "date" },
    { label: "Last contacted", key: "last_contacted", type: "date" },
    { label: "Notes", key: "notes", type: "textarea", placeholder: "What you discussed, what they offered to help with..." },
  ];

  const values = {};
  fields.forEach(f => {
    const group = document.createElement("div");
    group.style.cssText = "margin-bottom:11px";
    const lbl = document.createElement("label");
    lbl.style.cssText = "display:block;font-size:11px;font-weight:500;color:var(--text2);margin-bottom:3px;text-transform:uppercase;letter-spacing:.06em";
    lbl.textContent = f.label;
    group.appendChild(lbl);
    let input;
    if (f.type === "select") {
      input = document.createElement("select"); input.className = "input";
      f.options.forEach(o => { const opt = document.createElement("option"); opt.value = o; opt.textContent = o; if (existing?.[f.key] === o) opt.selected = true; input.appendChild(opt); });
    } else if (f.type === "textarea") {
      input = document.createElement("textarea"); input.className = "input"; input.rows = 2; input.style.resize = "vertical";
      if (existing?.[f.key]) input.value = existing[f.key];
    } else {
      input = document.createElement("input"); input.className = "input"; input.type = f.type;
      if (f.placeholder) input.placeholder = f.placeholder;
      if (existing?.[f.key]) input.value = f.type.includes("date") ? existing[f.key]?.split("T")[0] : existing[f.key];
    }
    input.addEventListener("input", () => { values[f.key] = input.value; });
    if (existing?.[f.key]) values[f.key] = existing[f.key];
    group.appendChild(input); card.appendChild(group);
  });

  // Is referral toggle
  const refRow = document.createElement("div");
  refRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding:10px;background:var(--bg0);border-radius:9px;border:1px solid var(--border3)";
  const refLbl = document.createElement("span");
  refLbl.style.cssText = "font-size:12px;color:var(--text1)";
  refLbl.textContent = "This person offered a referral";
  const toggle = document.createElement("div");
  toggle.className = "toggle " + (existing?.is_referral ? "on" : "off");
  const dot = document.createElement("div"); dot.className = "toggle-dot";
  toggle.appendChild(dot);
  let isReferral = existing?.is_referral || false;
  toggle.addEventListener("click", () => {
    isReferral = !isReferral;
    toggle.className = "toggle " + (isReferral ? "on" : "off");
    dot.style.left = isReferral ? "19px" : "3px";
  });
  refRow.appendChild(refLbl); refRow.appendChild(toggle);
  card.appendChild(refRow);

  const btnRow = document.createElement("div");
  btnRow.style.cssText = "display:flex;gap:8px;justify-content:flex-end";
  const cancel = document.createElement("button");
  cancel.style.cssText = "padding:8px 16px;border-radius:9px;background:var(--bg0);border:1px solid var(--border);color:var(--text2);cursor:pointer;font-family:var(--font);font-size:12px";
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", () => overlay.remove());
  const save = document.createElement("button");
  save.style.cssText = "padding:8px 20px;border-radius:9px;background:var(--teal);border:none;color:#fff;cursor:pointer;font-family:var(--font);font-size:12px;font-weight:500";
  save.textContent = existing ? "Save" : "Add contact";
  save.addEventListener("click", async () => {
    save.textContent = "Saving…"; save.disabled = true;
    const payload = { user_id: NUUR_USER_ID, is_referral: isReferral, created_at: new Date().toISOString(), ...values };
    if (existing) { await DB.update("nuur_contacts", `id=eq.${existing.id}`, payload); }
    else { payload.id = `con_${Date.now()}`; await DB.insert("nuur_contacts", payload); }
    overlay.remove();
    loadNetworkingTracker();
  });
  btnRow.appendChild(cancel); btnRow.appendChild(save);
  card.appendChild(btnRow);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  card.querySelector("input")?.focus();
}

document.getElementById("add-contact-btn")?.addEventListener("click", e => { e.preventDefault(); showContactModal(); });

// Dashboard section loaders are called directly inside loadDashboard above

// ══════════════════════════════════════════════════════════════════
// ── COVER LETTER VERSION HISTORY ──────────────────────────────────
// ══════════════════════════════════════════════════════════════════

async function saveCoverLetter(jobTitle, company, content, applicationId = null) {
  const id = `cl_${Date.now()}`;
  await DB.insert("nuur_cover_letters", {
    id,
    user_id: NUUR_USER_ID,
    job_title: jobTitle,
    company,
    content,
    application_id: applicationId,
    word_count: content.split(/\s+/).length,
    created_at: new Date().toISOString()
  });
  return id;
}

async function showCoverLetterHistory() {
  const existing = document.getElementById("nuur-cl-history");
  if (existing) { existing.remove(); return; }

  const overlay = document.createElement("div");
  overlay.id = "nuur-cl-history";
  overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;padding:20px;font-family:var(--font)";
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });

  const card = document.createElement("div");
  card.style.cssText = "background:var(--bg1);border:1px solid var(--border);border-radius:16px;width:100%;max-width:660px;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:var(--shadow-lg)";

  // Header
  const hdr = document.createElement("div");
  hdr.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border);flex-shrink:0";
  const hl = document.createElement("div");
  hl.style.cssText = "font-size:14px;font-weight:600;color:var(--text0)";
  hl.textContent = "📝 Cover Letter History";
  const hx = document.createElement("button");
  hx.style.cssText = "background:none;border:none;color:var(--text3);cursor:pointer;font-size:18px;padding:0";
  hx.textContent = "×";
  hx.addEventListener("click", () => overlay.remove());
  hdr.appendChild(hl); hdr.appendChild(hx);

  const body = document.createElement("div");
  body.style.cssText = "display:flex;flex:1;overflow:hidden";

  // Left — list
  const list = document.createElement("div");
  list.style.cssText = "width:220px;border-right:1px solid var(--border3);overflow-y:auto;padding:8px;flex-shrink:0";

  // Right — preview
  const preview = document.createElement("div");
  preview.style.cssText = "flex:1;overflow-y:auto;padding:20px;font-size:13px;color:var(--text1);line-height:1.7;white-space:pre-wrap";
  preview.textContent = "Select a cover letter to preview it";

  card.appendChild(hdr);
  body.appendChild(list);
  body.appendChild(preview);
  card.appendChild(body);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // Load letters
  try {
    const data = await DB.get("nuur_cover_letters", `?user_id=eq.${NUUR_USER_ID}&order=created_at.desc&limit=30`);
    list.replaceChildren();
    if (!Array.isArray(data) || !data.length) {
      const empty = document.createElement("div");
      empty.style.cssText = "padding:20px;text-align:center;font-size:12px;color:var(--text3)";
      empty.textContent = "No saved cover letters yet. Generate one from any job page.";
      list.appendChild(empty);
      return;
    }

    hl.textContent = `📝 Cover Letters (${data.length})`;

    data.forEach((cl, idx) => {
      const item = document.createElement("div");
      item.style.cssText = "padding:9px 10px;border-radius:8px;cursor:pointer;margin-bottom:3px;border:1px solid transparent;transition:all .12s";
      item.addEventListener("mouseenter", () => { if (!item.classList.contains("active")) item.style.background = "var(--bg0)"; });
      item.addEventListener("mouseleave", () => { if (!item.classList.contains("active")) { item.style.background = "transparent"; item.style.borderColor = "transparent"; } });

      const co = document.createElement("div");
      co.style.cssText = "font-size:12px;font-weight:500;color:var(--text0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
      co.textContent = cl.company || "Unknown company";
      const role = document.createElement("div");
      role.style.cssText = "font-size:11px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px";
      role.textContent = cl.job_title || "";
      const meta = document.createElement("div");
      meta.style.cssText = "font-size:10px;color:var(--text4);margin-top:3px;display:flex;gap:6px";
      const dateEl = document.createElement("span");
      dateEl.textContent = new Date(cl.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const wc = document.createElement("span");
      wc.textContent = `${cl.word_count || "?"} words`;
      meta.appendChild(dateEl); meta.appendChild(wc);

      item.appendChild(co); item.appendChild(role); item.appendChild(meta);
      item.addEventListener("click", () => {
        list.querySelectorAll("div").forEach(d => { d.classList.remove("active"); d.style.background = "transparent"; d.style.borderColor = "transparent"; });
        item.classList.add("active");
        item.style.background = "var(--teal3)";
        item.style.borderColor = "rgba(13,148,136,0.2)";
        co.style.color = "var(--teal)";

        // Show in preview with action buttons
        preview.replaceChildren();
        const actions = document.createElement("div");
        actions.style.cssText = "display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap";

        const copyBtn = document.createElement("button");
        copyBtn.style.cssText = "padding:6px 12px;border-radius:8px;background:var(--teal3);border:1px solid rgba(13,148,136,0.2);color:var(--teal);font-size:11px;cursor:pointer;font-family:var(--font)";
        copyBtn.textContent = "📋 Copy";
        copyBtn.addEventListener("click", () => {
          navigator.clipboard.writeText(cl.content).catch(() => {});
          copyBtn.textContent = "Copied!";
          setTimeout(() => { copyBtn.textContent = "📋 Copy"; }, 2000);
        });

        const deleteBtn = document.createElement("button");
        deleteBtn.style.cssText = "padding:6px 12px;border-radius:8px;background:transparent;border:1px solid var(--border);color:var(--text3);font-size:11px;cursor:pointer;font-family:var(--font)";
        deleteBtn.textContent = "🗑 Delete";
        deleteBtn.addEventListener("click", async () => {
          await DB.delete("nuur_cover_letters", `id=eq.${cl.id}`);
          item.remove();
          preview.textContent = "Select a cover letter to preview it";
          hl.textContent = `📝 Cover Letters (${data.length - 1})`;
        });

        actions.appendChild(copyBtn); actions.appendChild(deleteBtn);

        const header = document.createElement("div");
        header.style.cssText = "font-size:13px;font-weight:600;color:var(--text0);margin-bottom:4px";
        header.textContent = `${cl.job_title} at ${cl.company}`;
        const dateLine = document.createElement("div");
        dateLine.style.cssText = "font-size:11px;color:var(--text3);margin-bottom:14px";
        dateLine.textContent = new Date(cl.created_at).toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

        const content = document.createElement("div");
        content.style.cssText = "font-size:13px;color:var(--text1);line-height:1.75;white-space:pre-wrap";
        content.textContent = cl.content;

        preview.appendChild(actions);
        preview.appendChild(header);
        preview.appendChild(dateLine);
        preview.appendChild(content);
      });

      // Auto-select first
      if (idx === 0) item.click();
      list.appendChild(item);
    });
  } catch (e) {
    list.textContent = "Error loading: " + e.message;
  }
}

// Hook into document writer — auto-save cover letters when generated
window.addEventListener("nuur-cover-letter-generated", async (e) => {
  const { jobTitle, company, content, applicationId } = e.detail || {};
  if (content && company) {
    await saveCoverLetter(jobTitle, company, content, applicationId);
  }
});

// nav-cover-letters is wired above — no duplicate needed here

// ══════════════════════════════════════════════════════════════════
// ── APPLICATION KANBAN PIPELINE ───────────────────────────────════
// ══════════════════════════════════════════════════════════════════

const KANBAN_COLUMNS = [
  { key: "applied",   label: "Applied",   color: "var(--text3)",  bg: "var(--bg3)" },
  { key: "responded", label: "Responded", color: "var(--blue)",   bg: "rgba(59,130,246,0.06)" },
  { key: "interview", label: "Interview", color: "var(--teal)",   bg: "var(--teal3)" },
  { key: "offer",     label: "Offer",     color: "var(--gold)",   bg: "rgba(217,119,6,0.06)" },
  { key: "rejected",  label: "No",        color: "var(--red)",    bg: "rgba(239,68,68,0.05)" },
];

async function loadKanban() {
  const el = document.getElementById("dash-kanban");
  if (!el) return;

  try {
    const apps = await DB.get("nuur_applications", `?user_id=eq.${NUUR_USER_ID}&order=applied_at.desc&limit=50`);
    if (!Array.isArray(apps)) return;

    el.replaceChildren();

    KANBAN_COLUMNS.forEach(col => {
      const colApps = apps.filter(a => (a.status || "applied") === col.key);

      const column = document.createElement("div");
      column.style.cssText = `flex-shrink:0;width:170px;background:${col.bg};border:1px solid var(--border);border-radius:12px;overflow:hidden`;
      column.dataset.status = col.key;

      const colHdr = document.createElement("div");
      colHdr.style.cssText = `padding:10px 12px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border3)`;
      const colLabel = document.createElement("span");
      colLabel.style.cssText = `font-size:11px;font-weight:600;color:${col.color};text-transform:uppercase;letter-spacing:.08em`;
      colLabel.textContent = col.label;
      const colCount = document.createElement("span");
      colCount.style.cssText = `font-size:10px;color:${col.color};background:${col.bg};padding:1px 7px;border-radius:10px;border:1px solid currentColor;opacity:.7`;
      colCount.textContent = colApps.length;
      colHdr.appendChild(colLabel); colHdr.appendChild(colCount);

      const colBody = document.createElement("div");
      colBody.style.cssText = "padding:8px;display:flex;flex-direction:column;gap:5px;min-height:60px";
      colBody.dataset.status = col.key;

      colApps.slice(0, 8).forEach(app => {
        const card = makeKanbanCard(app, col);
        colBody.appendChild(card);
      });

      column.appendChild(colHdr);
      column.appendChild(colBody);
      el.appendChild(column);
    });

  } catch (_) {}
}

function makeKanbanCard(app, col) {
  const card = document.createElement("div");
  card.style.cssText = "background:var(--bg1);border:1px solid var(--border);border-radius:9px;padding:9px 10px;cursor:pointer;transition:all .12s;box-shadow:var(--shadow-sm)";
  card.dataset.appId = app.id;
  card.addEventListener("mouseenter", () => { card.style.borderColor = col.color; card.style.transform = "translateY(-1px)"; card.style.boxShadow = "var(--shadow)"; });
  card.addEventListener("mouseleave", () => { card.style.borderColor = "var(--border)"; card.style.transform = ""; card.style.boxShadow = "var(--shadow-sm)"; });

  const company = document.createElement("div");
  company.style.cssText = "font-size:12px;font-weight:500;color:var(--text0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px";
  company.textContent = app.company || "Unknown";

  const role = document.createElement("div");
  role.style.cssText = "font-size:10.5px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:6px";
  role.textContent = app.job_title || "";

  // Days since applied
  const days = Math.round((Date.now() - new Date(app.applied_at)) / 86400000);
  const daysEl = document.createElement("div");
  daysEl.style.cssText = `font-size:10px;color:${days > 7 ? "var(--gold)" : "var(--text4)"}`;
  daysEl.textContent = days === 0 ? "Today" : `${days}d ago`;

  // Move status buttons
  const moveRow = document.createElement("div");
  moveRow.style.cssText = "display:flex;gap:3px;margin-top:6px";
  KANBAN_COLUMNS
    .filter(c => c.key !== col.key)
    .slice(0, 3)
    .forEach(c => {
      const btn = document.createElement("button");
      btn.style.cssText = `padding:2px 6px;border-radius:5px;background:transparent;border:1px solid var(--border);font-size:9px;color:var(--text3);cursor:pointer;font-family:var(--font);transition:all .1s`;
      btn.textContent = "→ " + c.label;
      btn.title = `Move to ${c.label}`;
      btn.addEventListener("mouseenter", () => { btn.style.borderColor = c.color; btn.style.color = c.color; });
      btn.addEventListener("mouseleave", () => { btn.style.borderColor = "var(--border)"; btn.style.color = "var(--text3)"; });
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        await DB.update("nuur_applications", `id=eq.${app.id}`, { status: c.key });
        loadKanban();
        loadDashboard();
      });
      moveRow.appendChild(btn);
    });

  card.appendChild(company);
  card.appendChild(role);
  card.appendChild(daysEl);
  card.appendChild(moveRow);
  return card;
}

// ══════════════════════════════════════════════════════════════════
// ── EMAIL DRAFT TEMPLATES PER STAGE ───────────────────────────────
// ══════════════════════════════════════════════════════════════════

const EMAIL_TEMPLATES = {
  applied: {
    subject: "Application follow-up — {role} at {company}",
    prompt: `Write a 3-sentence follow-up email for a job application. From Mohamud Mohamed. Professional, direct, no em dashes, no "I'm excited", no "passionate about".\nRole: {role}\nCompany: {company}\nApplied: {date}`
  },
  responded: {
    subject: "Re: {role} opportunity — thank you",
    prompt: `Write a brief, warm acknowledgment email. They just responded to my application. Express genuine interest and ask about next steps. From Mohamud Mohamed. 3 sentences max, no AI phrases, no em dashes.\nRole: {role}\nCompany: {company}`
  },
  interview: {
    subject: "Interview confirmation — {role} at {company}",
    prompt: `Write an interview confirmation email. Confirm attendance, mention I've done research on the company, express that I look forward to the conversation. Professional, direct, 3-4 sentences. From Mohamud Mohamed. No em dashes, no AI phrases.\nRole: {role}\nCompany: {company}`
  },
  offer: {
    subject: "Re: Offer for {role} — request for one week",
    prompt: `Write a professional email asking for one week to review a job offer. Express genuine interest in the role. Don't tip my hand on whether I'll accept. From Mohamud Mohamed. 3 sentences, no em dashes, no AI phrases.\nRole: {role}\nCompany: {company}`
  },
  rejected: {
    subject: "Re: {role} at {company} — staying in touch",
    prompt: `Write a graceful, brief rejection acceptance email. Thank them for their time, express that I'd like to stay in their network for future opportunities, leave the door open. From Mohamud Mohamed. 3 sentences max, warm but professional, no em dashes, no AI phrases.\nRole: {role}\nCompany: {company}`
  }
};

async function generateStageEmail(app, stage) {
  const template = EMAIL_TEMPLATES[stage];
  if (!template) return;

  const fill = s => s
    .replace("{role}", app.job_title || "the position")
    .replace("{company}", app.company || "your company")
    .replace("{date}", app.applied_at ? new Date(app.applied_at).toLocaleDateString("en-US", { month: "long", day: "numeric" }) : "recently");

  const subject = fill(template.subject);
  const prompt = fill(template.prompt);

  // Show generating toast
  const toastId = `stage-email-${Date.now()}`;
  showStatusToast("Drafting email…", toastId, true);

  try {
    const response = await callNuur({ prompt, model: MODEL.FAST });

    document.getElementById(toastId)?.remove();
    showEmailDraftModal(subject, response, app);
  } catch (_) {
    document.getElementById(toastId)?.remove();
  }
}

function showStatusToast(msg, id, loading) {
  const t = document.createElement("div");
  t.id = id;
  t.style.cssText = "position:fixed;bottom:24px;right:24px;z-index:9999;background:var(--bg1);border:1px solid var(--border);border-radius:10px;padding:10px 16px;font-size:12px;color:var(--text2);box-shadow:var(--shadow);font-family:var(--font)";
  t.textContent = (loading ? "⏳ " : "✓ ") + msg;
  document.body.appendChild(t);
  if (!loading) setTimeout(() => t.remove(), 3000);
}

function showEmailDraftModal(subject, body, app) {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;padding:20px;font-family:var(--font)";
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });

  const card = document.createElement("div");
  card.style.cssText = "background:var(--bg1);border:1px solid var(--border);border-radius:16px;width:100%;max-width:540px;padding:22px;box-shadow:var(--shadow-lg)";

  const title = document.createElement("div");
  title.style.cssText = "font-size:14px;font-weight:600;color:var(--text0);margin-bottom:14px";
  title.textContent = `📧 Email draft — ${app.company}`;

  const subjectEl = document.createElement("div");
  subjectEl.style.cssText = "margin-bottom:8px";
  const subLbl = document.createElement("div");
  subLbl.style.cssText = "font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px";
  subLbl.textContent = "Subject";
  const subInput = document.createElement("input");
  subInput.className = "input";
  subInput.value = subject;
  subjectEl.appendChild(subLbl); subjectEl.appendChild(subInput);

  const bodyEl = document.createElement("div");
  bodyEl.style.cssText = "margin-bottom:12px";
  const bodyLbl = document.createElement("div");
  bodyLbl.style.cssText = "font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px";
  bodyLbl.textContent = "Body";
  const bodyTA = document.createElement("textarea");
  bodyTA.className = "input";
  bodyTA.value = body;
  bodyTA.rows = 7;
  bodyTA.style.resize = "vertical";
  bodyEl.appendChild(bodyLbl); bodyEl.appendChild(bodyTA);

  const btns = document.createElement("div");
  btns.style.cssText = "display:flex;gap:7px";
  const copyBtn = document.createElement("button");
  copyBtn.style.cssText = "flex:2;padding:9px;border-radius:9px;background:var(--teal);border:none;color:#fff;font-family:var(--font);font-size:12px;font-weight:500;cursor:pointer";
  copyBtn.textContent = "Copy full email";
  copyBtn.addEventListener("click", () => {
    const full = `Subject: ${subInput.value}\n\n${bodyTA.value}`;
    navigator.clipboard.writeText(full).catch(() => {});
    copyBtn.textContent = "Copied!";
    setTimeout(() => { copyBtn.textContent = "Copy full email"; }, 2000);
  });
  const closeBtn = document.createElement("button");
  closeBtn.style.cssText = "flex:1;padding:9px;border-radius:9px;background:var(--bg0);border:1px solid var(--border);color:var(--text2);font-family:var(--font);font-size:12px;cursor:pointer";
  closeBtn.textContent = "Close";
  closeBtn.addEventListener("click", () => overlay.remove());
  btns.appendChild(copyBtn); btns.appendChild(closeBtn);

  card.appendChild(title); card.appendChild(subjectEl);
  card.appendChild(bodyEl); card.appendChild(btns);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

// ══════════════════════════════════════════════════════════════════
// ── AGENT GOAL TEMPLATES ──────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

const AGENT_TEMPLATES_KEY = "nuur_agent_templates";

function getAgentTemplates() {
  try {
    return JSON.parse(localStorage.getItem(AGENT_TEMPLATES_KEY) || "[]");
  } catch (_) { return []; }
}

function saveAgentTemplate(goal) {
  if (!goal?.trim()) return;
  const templates = getAgentTemplates();
  if (templates.includes(goal)) return; // no duplicates
  templates.unshift(goal);
  const trimmed = templates.slice(0, 15); // max 15
  localStorage.setItem(AGENT_TEMPLATES_KEY, JSON.stringify(trimmed));
  renderAgentTemplates();
}

function deleteAgentTemplate(goal) {
  const updated = getAgentTemplates().filter(t => t !== goal);
  localStorage.setItem(AGENT_TEMPLATES_KEY, JSON.stringify(updated));
  renderAgentTemplates();
}

function renderAgentTemplates() {
  const container = document.getElementById("agent-templates");
  if (!container) return;
  const templates = getAgentTemplates();
  container.replaceChildren();

  if (!templates.length) {
    const hint = document.createElement("span");
    hint.style.cssText = "font-size:11px;color:var(--text4)";
    hint.textContent = "No saved templates yet";
    container.appendChild(hint);
    return;
  }

  templates.forEach(goal => {
    const chip = document.createElement("div");
    chip.style.cssText = "display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border-radius:20px;background:var(--bg1);border:1px solid var(--border);font-size:11px;color:var(--text2);cursor:pointer;transition:all .12s;max-width:200px";
    chip.title = goal;

    const lbl = document.createElement("span");
    lbl.style.cssText = "white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
    lbl.textContent = goal.length > 28 ? goal.substring(0, 28) + "…" : goal;

    const del = document.createElement("span");
    del.style.cssText = "color:var(--text4);font-size:13px;line-height:1;flex-shrink:0;transition:color .1s";
    del.textContent = "×";

    chip.appendChild(lbl);
    chip.appendChild(del);

    chip.addEventListener("mouseenter", () => { chip.style.borderColor = "var(--teal)"; chip.style.background = "var(--teal3)"; chip.style.color = "var(--teal)"; del.style.color = "var(--teal)"; });
    chip.addEventListener("mouseleave", () => { chip.style.borderColor = "var(--border)"; chip.style.background = "var(--bg1)"; chip.style.color = "var(--text2)"; del.style.color = "var(--text4)"; });

    lbl.addEventListener("click", () => {
      const agentInput = document.getElementById("agent-input");
      if (agentInput) { agentInput.value = goal; agentInput.focus(); }
    });

    del.addEventListener("click", e => {
      e.stopPropagation();
      deleteAgentTemplate(goal);
    });

    container.appendChild(chip);
  });
}

// Wire save button
document.getElementById("save-goal-btn")?.addEventListener("click", () => {
  const input = document.getElementById("agent-input");
  const goal = input?.value?.trim();
  if (!goal) { input?.focus(); return; }
  saveAgentTemplate(goal);
  showStatusToast("Goal saved as template", "save-tmpl", false);
});

// Render on load
setTimeout(renderAgentTemplates, 400);

// ══════════════════════════════════════════════════════════════════
// ── JOB SEARCH SCORE WIDGET ───────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

async function loadJobSearchScore() {
  const el = document.getElementById("dash-score");
  if (!el) return;

  try {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    // Gather all activity in parallel
    const [apps, interviews, contacts, agentRuns] = await Promise.allSettled([
      DB.get("nuur_applications", `?user_id=eq.${NUUR_USER_ID}&applied_at=gte.${weekAgo}`),
      DB.get("nuur_interviews", `?user_id=eq.${NUUR_USER_ID}&created_at=gte.${weekAgo}`),
      DB.get("nuur_contacts", `?user_id=eq.${NUUR_USER_ID}&created_at=gte.${weekAgo}`),
      DB.get("nuur_agent_sessions", `?user_id=eq.${NUUR_USER_ID}&session_date=gte.${weekAgo}&success=eq.true`)
    ]);

    const appsCount = apps.value?.length || 0;
    const ivsCount = interviews.value?.length || 0;
    const contactsCount = contacts.value?.length || 0;
    const agentCount = agentRuns.value?.length || 0;

    // Scoring
    const TARGETS = { apps: 5, interviews: 1, contacts: 3, agentRuns: 3 };
    const metrics = [
      { label: "Applications sent",   value: appsCount,     target: TARGETS.apps,      icon: "💼", points: Math.min(appsCount / TARGETS.apps, 1) * 35 },
      { label: "Interviews scheduled",value: ivsCount,      target: TARGETS.interviews, icon: "🎤", points: Math.min(ivsCount / TARGETS.interviews, 1) * 30 },
      { label: "Network contacts",    value: contactsCount, target: TARGETS.contacts,   icon: "🤝", points: Math.min(contactsCount / TARGETS.contacts, 1) * 20 },
      { label: "Agent tasks run",     value: agentCount,    target: TARGETS.agentRuns,  icon: "🤖", points: Math.min(agentCount / TARGETS.agentRuns, 1) * 15 },
    ];

    const totalScore = Math.round(metrics.reduce((sum, m) => sum + m.points, 0));

    const scoreLabel = totalScore >= 80 ? ["On fire 🔥", "var(--teal)"]
      : totalScore >= 50 ? ["Good progress 👍", "var(--blue)"]
      : totalScore >= 25 ? ["Getting started 📈", "var(--gold)"]
      : ["Need a push 💪", "var(--text3)"];

    el.replaceChildren();

    // Score display
    const scoreRow = document.createElement("div");
    scoreRow.style.cssText = "display:flex;align-items:center;gap:16px;margin-bottom:14px";

    const scoreCircle = document.createElement("div");
    scoreCircle.style.cssText = `width:64px;height:64px;border-radius:50%;border:3px solid ${scoreLabel[1]};display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0`;
    const scoreNum = document.createElement("div");
    scoreNum.style.cssText = `font-size:22px;font-weight:700;color:${scoreLabel[1]};letter-spacing:-.03em;line-height:1`;
    scoreNum.textContent = totalScore;
    const scoreMax = document.createElement("div");
    scoreMax.style.cssText = "font-size:9px;color:var(--text3)";
    scoreMax.textContent = "/ 100";
    scoreCircle.appendChild(scoreNum); scoreCircle.appendChild(scoreMax);

    const scoreInfo = document.createElement("div");
    const scoreLbl = document.createElement("div");
    scoreLbl.style.cssText = `font-size:14px;font-weight:600;color:${scoreLabel[1]};margin-bottom:3px`;
    scoreLbl.textContent = scoreLabel[0];
    const scoreWeek = document.createElement("div");
    scoreWeek.style.cssText = "font-size:11px;color:var(--text3)";
    scoreWeek.textContent = "This week's job search activity";
    scoreInfo.appendChild(scoreLbl); scoreInfo.appendChild(scoreWeek);
    scoreRow.appendChild(scoreCircle); scoreRow.appendChild(scoreInfo);
    el.appendChild(scoreRow);

    // Metric bars
    const barsEl = document.createElement("div");
    barsEl.style.cssText = "display:flex;flex-direction:column;gap:7px";
    metrics.forEach(m => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;gap:10px";
      const icon = document.createElement("span");
      icon.style.cssText = "font-size:13px;width:18px;flex-shrink:0";
      icon.textContent = m.icon;
      const lbl = document.createElement("div");
      lbl.style.cssText = "font-size:11px;color:var(--text2);width:140px;flex-shrink:0";
      lbl.textContent = m.label;
      const barWrap = document.createElement("div");
      barWrap.style.cssText = "flex:1;background:var(--bg0);border-radius:4px;height:7px;overflow:hidden";
      const bar = document.createElement("div");
      const pct = Math.min((m.value / m.target) * 100, 100);
      bar.style.cssText = `height:100%;border-radius:4px;background:${pct >= 100 ? "var(--green)" : "var(--teal)"};width:${pct}%;transition:width .6s var(--ease)`;
      barWrap.appendChild(bar);
      const count = document.createElement("div");
      count.style.cssText = "font-size:11px;color:var(--text3);width:32px;text-align:right;flex-shrink:0";
      count.textContent = `${m.value}/${m.target}`;
      row.appendChild(icon); row.appendChild(lbl); row.appendChild(barWrap); row.appendChild(count);
      barsEl.appendChild(row);
    });
    el.appendChild(barsEl);

  } catch (_) {
    el.replaceChildren();
    const empty = document.createElement("div");
    empty.className = "dash-empty";
    empty.textContent = "Could not load score data";
    el.appendChild(empty);
  }
}

// ══════════════════════════════════════════════════════════════════
// ── AGENT STEP REPLAY ─────────────────────────────────────────────
// Saves full step history per session, lets you click any step
// to see exactly what the agent was thinking at that moment
// ══════════════════════════════════════════════════════════════════

let agentStepHistory = []; // stores { step, status, message, thought, action, ts }

// Wrap addAgentStep to also record history
const _origAddAgentStep = addAgentStep;
// Reassign by name AND window so every call path is intercepted
addAgentStep = window.addAgentStep = function(data) {
  // Record every step for replay
  agentStepHistory.push({ ...data, ts: Date.now() });
  _origAddAgentStep(data);

  // If it's a final step, show replay button
  if (data.complete && agentStepHistory.length > 2) {
    const replayBtn = document.createElement("button");
    replayBtn.style.cssText = "display:block;width:100%;margin-top:6px;padding:8px;border-radius:9px;background:transparent;border:1px solid var(--border);color:var(--text3);font-size:11px;font-family:var(--font);cursor:pointer;transition:all .15s;text-align:center";
    replayBtn.textContent = `↩ Replay ${agentStepHistory.length} steps`;
    replayBtn.addEventListener("mouseenter", () => { replayBtn.style.borderColor = "var(--teal)"; replayBtn.style.color = "var(--teal)"; });
    replayBtn.addEventListener("mouseleave", () => { replayBtn.style.borderColor = "var(--border)"; replayBtn.style.color = "var(--text3)"; });
    replayBtn.addEventListener("click", () => showAgentReplay(agentStepHistory));
    agentLog.appendChild(replayBtn);
  }
};

function showAgentReplay(steps) {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;padding:20px;font-family:var(--font)";
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });

  const card = document.createElement("div");
  card.style.cssText = "background:var(--bg1);border:1px solid var(--border);border-radius:16px;width:100%;max-width:600px;max-height:86vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:var(--shadow-lg)";

  const hdr = document.createElement("div");
  hdr.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--border);flex-shrink:0";
  const ht = document.createElement("div");
  ht.style.cssText = "font-size:13px;font-weight:600;color:var(--text0)";
  ht.textContent = `↩ Step Replay — ${steps.length} steps`;
  const hx = document.createElement("button");
  hx.style.cssText = "background:none;border:none;color:var(--text3);cursor:pointer;font-size:18px;padding:0";
  hx.textContent = "×";
  hx.addEventListener("click", () => overlay.remove());
  hdr.appendChild(ht); hdr.appendChild(hx);

  const timeline = document.createElement("div");
  timeline.style.cssText = "flex:1;overflow-y:auto;padding:14px 18px;display:flex;flex-direction:column;gap:6px";

  const detail = document.createElement("div");
  detail.style.cssText = "padding:14px 18px;border-top:1px solid var(--border);flex-shrink:0;min-height:100px;font-size:12.5px;color:var(--text2);line-height:1.65";
  detail.textContent = "Click any step to see what Nuur was thinking";

  const colorMap = { thinking: "var(--text3)", acting: "var(--teal)", complete: "var(--green)", failed: "var(--red)", paused: "var(--gold)" };
  const iconMap  = { thinking: "◌", acting: "◉", complete: "✓", failed: "✗", paused: "⏸" };

  steps.forEach((step, idx) => {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:flex-start;gap:10px;padding:9px 10px;border-radius:9px;cursor:pointer;border:1px solid transparent;transition:all .12s";
    row.addEventListener("mouseenter", () => { row.style.background = "var(--bg0)"; row.style.borderColor = "var(--border3)"; });
    row.addEventListener("mouseleave", () => { row.style.background = "transparent"; row.style.borderColor = "transparent"; });

    const color = colorMap[step.status] || "var(--teal)";
    const num = document.createElement("div");
    num.style.cssText = `width:22px;height:22px;border-radius:6px;background:${color}15;border:1px solid ${color}30;display:flex;align-items:center;justify-content:center;font-size:10px;color:${color};flex-shrink:0;font-weight:600`;
    num.textContent = iconMap[step.status] || idx + 1;

    const info = document.createElement("div");
    info.style.flex = "1";
    const msg = document.createElement("div");
    msg.style.cssText = "font-size:12px;color:var(--text1);margin-bottom:2px";
    msg.textContent = step.message || `Step ${idx + 1}`;
    if (step.action && !["done","fail"].includes(step.action)) {
      const act = document.createElement("div");
      act.style.cssText = "font-size:11px;color:var(--teal)";
      act.textContent = `→ ${step.action}`;
      info.appendChild(msg); info.appendChild(act);
    } else {
      info.appendChild(msg);
    }

    const ts = document.createElement("div");
    ts.style.cssText = "font-size:10px;color:var(--text4);flex-shrink:0;margin-top:2px";
    ts.textContent = step.ts ? new Date(step.ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "";

    row.appendChild(num); row.appendChild(info); row.appendChild(ts);

    row.addEventListener("click", () => {
      timeline.querySelectorAll("div").forEach(d => { d.style.background = "transparent"; d.style.borderColor = "transparent"; });
      row.style.background = "var(--teal3)";
      row.style.borderColor = "rgba(13,148,136,0.2)";

      detail.replaceChildren();
      const dtitle = document.createElement("div");
      dtitle.style.cssText = `font-size:12px;font-weight:600;color:${color};margin-bottom:8px`;
      dtitle.textContent = `Step ${idx + 1} — ${step.status}`;
      detail.appendChild(dtitle);

      if (step.message) {
        const dm = document.createElement("div");
        dm.style.cssText = "font-size:12.5px;color:var(--text1);margin-bottom:6px;line-height:1.6";
        dm.textContent = step.message;
        detail.appendChild(dm);
      }
      if (step.thought) {
        const dth = document.createElement("div");
        dth.style.cssText = "font-size:11.5px;color:var(--text3);font-style:italic;padding:8px;background:var(--bg0);border-radius:7px;line-height:1.6;margin-bottom:6px";
        dth.textContent = `💭 ${step.thought}`;
        detail.appendChild(dth);
      }
      if (step.action && !["done","fail"].includes(step.action)) {
        const da = document.createElement("div");
        da.style.cssText = "font-size:11px;color:var(--teal);padding:5px 8px;background:var(--teal3);border-radius:6px;display:inline-block";
        da.textContent = `→ ${step.action}`;
        detail.appendChild(da);
      }
    });

    timeline.appendChild(row);
  });

  card.appendChild(hdr); card.appendChild(timeline); card.appendChild(detail);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}


// ══════════════════════════════════════════════════════════════════
// ── BILINGUAL CONTENT CALENDAR ────────────────────────────────────
// Plan English/Somali posts for LinkedIn, Twitter, TikTok, Podcast
// ══════════════════════════════════════════════════════════════════

function showContentCalendar() {
  const existing = document.getElementById("nuur-content-cal");
  if (existing) { existing.remove(); return; }

  const overlay = document.createElement("div");
  overlay.id = "nuur-content-cal";
  overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;padding:20px;font-family:var(--font)";
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });

  const card = document.createElement("div");
  card.style.cssText = "background:var(--bg1);border:1px solid var(--border);border-radius:16px;width:100%;max-width:760px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:var(--shadow-lg)";

  const hdr = document.createElement("div");
  hdr.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border);flex-shrink:0";
  const ht = document.createElement("div");
  ht.style.cssText = "font-size:14px;font-weight:600;color:var(--text0);display:flex;align-items:center;gap:8px";
  ht.textContent = "📅 Bilingual Content Calendar";
  const hx = document.createElement("button");
  hx.style.cssText = "background:none;border:none;color:var(--text3);cursor:pointer;font-size:18px;padding:0";
  hx.textContent = "×";
  hx.addEventListener("click", () => overlay.remove());
  hdr.appendChild(ht); hdr.appendChild(hx);

  // Controls
  const controls = document.createElement("div");
  controls.style.cssText = "padding:12px 20px;border-bottom:1px solid var(--border3);display:flex;gap:10px;align-items:center;flex-wrap:wrap;flex-shrink:0";

  const topicInput = document.createElement("input");
  topicInput.className = "input";
  topicInput.style.cssText = "flex:1;min-width:200px;font-size:12.5px";
  topicInput.placeholder = "Topic or theme (e.g. Security+, AI in Africa, GRC career…)";

  const platforms = ["LinkedIn", "Twitter/X", "TikTok", "Intel Cast Podcast", "Instagram"];
  const platformSel = document.createElement("select");
  platformSel.className = "input";
  platformSel.style.cssText = "width:auto;font-size:12px";
  platforms.forEach(p => { const o = document.createElement("option"); o.value = p; o.textContent = p; platformSel.appendChild(o); });

  const weekCount = document.createElement("select");
  weekCount.className = "input";
  weekCount.style.cssText = "width:auto;font-size:12px";
  [1, 2, 4].forEach(w => { const o = document.createElement("option"); o.value = w; o.textContent = `${w} week${w > 1 ? "s" : ""}`; weekCount.appendChild(o); });

  const genBtn = document.createElement("button");
  genBtn.style.cssText = "padding:8px 16px;border-radius:9px;background:var(--teal);border:none;color:#fff;font-family:var(--font);font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap";
  genBtn.textContent = "Generate calendar";

  controls.appendChild(topicInput);
  controls.appendChild(platformSel);
  controls.appendChild(weekCount);
  controls.appendChild(genBtn);

  // Calendar output
  const output = document.createElement("div");
  output.style.cssText = "flex:1;overflow-y:auto;padding:16px 20px";
  output.innerHTML = "";

  const placeholder = document.createElement("div");
  placeholder.className = "dash-empty";
  placeholder.innerHTML = "<div class='dash-empty-icon'>📅</div><div class='dash-empty-title'>Enter a topic and generate your calendar</div><div class='dash-empty-sub'>Nuur plans bilingual English/Somali posts across your chosen platform and timeframe</div>";
  output.appendChild(placeholder);

  genBtn.addEventListener("click", async () => {
    const topic = topicInput.value.trim();
    if (!topic) { topicInput.focus(); return; }

    const platform = platformSel.value;
    const weeks = parseInt(weekCount.value);
    const days = weeks * 7;
    const postsPerWeek = platform === "Intel Cast Podcast" ? 1 : platform === "LinkedIn" ? 3 : 5;

    output.replaceChildren();
    const loading = document.createElement("div");
    loading.style.cssText = "text-align:center;padding:40px;color:var(--text3);font-size:13px;font-style:italic";
    loading.textContent = `Generating ${weeks}-week ${platform} calendar on "${topic}"…`;
    output.appendChild(loading);

    genBtn.disabled = true;
    genBtn.textContent = "Generating…";

    try {
      const prompt = `Create a ${weeks}-week bilingual content calendar for ${platform} about "${topic}".

I'm Mohamud Mohamed — Security+ certified cybersecurity professional, founder of Kulan Group Ltd, and co-host of the Intel Cast podcast. My audience includes Somali diaspora tech professionals, job seekers, and cybersecurity learners.

Format as a structured plan with ${postsPerWeek} posts per week, ${days} days total. For each post provide:
- Day and date offset (Day 1, Day 3, etc)
- Platform: ${platform}
- English title/hook (one punchy line, no em dashes, no AI phrases)
- English post body (appropriate length for ${platform}, first person, conversational)
- Somali version (af Soomaali — full translation of the post)
- Content type (Educational, Story, Opinion, Question, Announcement)
- Best posting time

Keep all posts grounded in real cybersecurity, GRC, or tech career value. No filler.`;

      const response = await callNuur({ prompt, model: MODEL.DEFAULT });

      output.replaceChildren();

      // Parse into cards
      const sections = response.split(/Day \d+/g).filter(s => s.trim().length > 20);
      const dayMatches = response.match(/Day \d+/g) || [];

      if (!sections.length) {
        const raw = document.createElement("div");
        raw.style.cssText = "white-space:pre-wrap;font-size:12.5px;color:var(--text1);line-height:1.75";
        raw.textContent = response;
        output.appendChild(raw);
      } else {
        sections.forEach((section, idx) => {
          const dayLabel = dayMatches[idx] || `Post ${idx + 1}`;

          const dayCard = document.createElement("div");
          dayCard.style.cssText = "background:var(--bg1);border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:10px;box-shadow:var(--shadow-sm)";

          const dayHdr = document.createElement("div");
          dayHdr.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:10px";
          const dlbl = document.createElement("div");
          dlbl.style.cssText = "font-size:12px;font-weight:600;color:var(--teal);background:var(--teal3);padding:3px 10px;border-radius:10px;border:1px solid rgba(13,148,136,0.2)";
          dlbl.textContent = dayLabel;

          const copyBtn = document.createElement("button");
          copyBtn.style.cssText = "padding:4px 10px;border-radius:7px;background:transparent;border:1px solid var(--border);font-size:10px;color:var(--text3);cursor:pointer;font-family:var(--font)";
          copyBtn.textContent = "Copy";
          copyBtn.addEventListener("click", () => {
            navigator.clipboard.writeText(section.trim()).catch(() => {});
            copyBtn.textContent = "Copied!";
            setTimeout(() => { copyBtn.textContent = "Copy"; }, 2000);
          });
          dayHdr.appendChild(dlbl); dayHdr.appendChild(copyBtn);

          // Split English and Somali sections
          const somaliSplit = section.indexOf("Somali");
          let engText = section;
          let soText = "";
          if (somaliSplit > 0) {
            engText = section.substring(0, somaliSplit);
            soText = section.substring(somaliSplit);
          }

          const engEl = document.createElement("div");
          engEl.style.cssText = "font-size:12px;color:var(--text1);line-height:1.65;margin-bottom:8px;white-space:pre-wrap";
          engEl.textContent = engText.trim();

          dayCard.appendChild(dayHdr);
          dayCard.appendChild(engEl);

          if (soText) {
            const divider = document.createElement("div");
            divider.style.cssText = "height:1px;background:var(--border3);margin:8px 0";
            const soLbl = document.createElement("div");
            soLbl.style.cssText = "font-size:10px;font-weight:600;color:var(--gold);letter-spacing:.08em;margin-bottom:5px;text-transform:uppercase";
            soLbl.textContent = "🌍 Af Soomaali";
            const soEl = document.createElement("div");
            soEl.style.cssText = "font-size:12px;color:var(--text2);line-height:1.65;white-space:pre-wrap";
            soEl.textContent = soText.trim();
            dayCard.appendChild(divider);
            dayCard.appendChild(soLbl);
            dayCard.appendChild(soEl);
          }

          output.appendChild(dayCard);
        });
      }

      // Copy all button
      const copyAll = document.createElement("button");
      copyAll.style.cssText = "width:100%;padding:10px;border-radius:10px;background:var(--teal3);border:1px solid rgba(13,148,136,0.2);color:var(--teal);font-family:var(--font);font-size:12px;font-weight:500;cursor:pointer;margin-top:4px";
      copyAll.textContent = "📋 Copy entire calendar";
      copyAll.addEventListener("click", () => {
        navigator.clipboard.writeText(response).catch(() => {});
        copyAll.textContent = "Copied!";
        setTimeout(() => { copyAll.textContent = "📋 Copy entire calendar"; }, 2000);
      });
      output.appendChild(copyAll);

    } catch (e) {
      output.replaceChildren();
      const err = document.createElement("div");
      err.style.cssText = "text-align:center;padding:20px;color:var(--red);font-size:12px";
      err.textContent = "Error: " + e.message;
      output.appendChild(err);
    }

    genBtn.disabled = false;
    genBtn.textContent = "Generate calendar";
  });

  card.appendChild(hdr); card.appendChild(controls); card.appendChild(output);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  topicInput.focus();
}

// Wire to hint chip — guard against duplicates on reload
if (!document.getElementById("nuur-cal-hint")) {
  const calHint = document.createElement("div");
  calHint.id = "nuur-cal-hint";
  calHint.className = "hint-chip";
  calHint.textContent = "📅 Content calendar";
  calHint.addEventListener("click", showContentCalendar);
  document.querySelector(".input-hints")?.appendChild(calHint);
}

// ══════════════════════════════════════════════════════════════════
// ── EXPORT ALL DATA AS CSV ────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

async function exportAllDataCSV() {
  const btn = document.getElementById("btn-export-csv");
  if (btn) { btn.textContent = "⏳ Exporting…"; btn.disabled = true; }

  const TABLES = [
    { name: "applications", table: "nuur_applications",  fields: ["id","job_title","company","status","platform","job_url","salary_estimate","applied_at","notes"] },
    { name: "interviews",   table: "nuur_interviews",    fields: ["id","company","role","round","interview_type","status","scheduled_at","interviewer","salary_discussed","notes"] },
    { name: "salary",       table: "nuur_salary",        fields: ["id","company","role","expected","offered","market_rate","outcome","benefits","notes","logged_at"] },
    { name: "contacts",     table: "nuur_contacts",      fields: ["id","name","title","company","email","linkedin","how_met","is_referral","last_contacted","follow_up_at","notes"] },
    { name: "bookmarks",    table: "nuur_bookmarks",     fields: ["id","title","url","summary","tags","saved_at"] },
    { name: "cover_letters",table: "nuur_cover_letters", fields: ["id","job_title","company","word_count","created_at"] },
  ];

  const zip = [];

  for (const t of TABLES) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/${t.table}?user_id=eq.${NUUR_USER_ID}&limit=500`,
        { headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` } }
      );
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) continue;

      // Build CSV
      const header = t.fields.join(",");
      const rows = data.map(row =>
        t.fields.map(f => {
          const val = row[f];
          if (val === null || val === undefined) return "";
          const str = Array.isArray(val) ? val.join(";") : String(val);
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"` : str;
        }).join(",")
      );
      const csv = [header, ...rows].join("\n");
      zip.push({ name: `nuur_${t.name}.csv`, content: csv });
    } catch (_) {}
  }

  if (!zip.length) {
    if (btn) { btn.textContent = "📥 Export all data as CSV"; btn.disabled = false; }
    return;
  }

  // Download each CSV file
  zip.forEach(file => {
    const blob = new Blob([file.content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  if (btn) { btn.textContent = `✓ Downloaded ${zip.length} CSV files`; btn.disabled = false; }
  setTimeout(() => { if (btn) btn.textContent = "📥 Export all data as CSV"; }, 3000);
}

// ══════════════════════════════════════════════════════════════════
// ── WEEKLY DIGEST ─────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

async function generateWeeklyDigest() {
  const btn = document.getElementById("btn-weekly-digest");
  if (btn) { btn.textContent = "⏳ Generating…"; btn.disabled = true; }

  try {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    // Gather all activity in parallel
    const [apps, newApps, interviews, contacts, agentRuns, bookmarks] = await Promise.allSettled([
      DB.get("nuur_applications", `?user_id=eq.${NUUR_USER_ID}&order=applied_at.desc&limit=20`),
      DB.get("nuur_applications", `?user_id=eq.${NUUR_USER_ID}&applied_at=gte.${weekAgo}`),
      DB.get("nuur_interviews",   `?user_id=eq.${NUUR_USER_ID}&created_at=gte.${weekAgo}`),
      DB.get("nuur_contacts",     `?user_id=eq.${NUUR_USER_ID}&created_at=gte.${weekAgo}`),
      DB.get("nuur_agent_sessions",`?user_id=eq.${NUUR_USER_ID}&session_date=gte.${weekAgo}&success=eq.true`),
      DB.get("nuur_bookmarks",    `?user_id=eq.${NUUR_USER_ID}&saved_at=gte.${weekAgo}`)
    ]);

    const allApps     = apps.value || [];
    const weekApps    = newApps.value || [];
    const weekIvs     = interviews.value || [];
    const weekCons    = contacts.value || [];
    const weekAgent   = agentRuns.value || [];
    const weekBmarks  = bookmarks.value || [];

    const upcoming = allApps.filter(a => a.status === "interview").slice(0, 3);
    const followUps = allApps.filter(a => {
      const days = Math.round((Date.now() - new Date(a.applied_at)) / 86400000);
      return a.status === "applied" && days >= 5;
    }).slice(0, 3);

    const dateRange = `${new Date(weekAgo).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

    // Generate digest with Claude
    const dataContext = `
Week: ${dateRange}

NEW APPLICATIONS (${weekApps.length}):
${weekApps.map(a => `- ${a.job_title} at ${a.company} (${a.platform || "Other"})`).join("\n") || "None"}

UPCOMING INTERVIEWS (${upcoming.length}):
${upcoming.map(a => `- ${a.job_title} at ${a.company}`).join("\n") || "None"}

FOLLOW-UPS NEEDED (${followUps.length} applications 5+ days old):
${followUps.map(a => {
  const days = Math.round((Date.now() - new Date(a.applied_at)) / 86400000);
  return `- ${a.job_title} at ${a.company} (${days} days ago)`;
}).join("\n") || "None"}

TOTAL PIPELINE:
${allApps.filter(a => a.status === "applied").length} applied |
${allApps.filter(a => a.status === "interview").length} in interview |
${allApps.filter(a => a.status === "offer").length} offers

OTHER ACTIVITY:
- Contacts added: ${weekCons.length}
- Agent tasks completed: ${weekAgent.length}
- Pages bookmarked: ${weekBmarks.length}`;

    const prompt = `Generate a concise weekly job search digest for Mohamud Mohamed based on this data:

${dataContext}

Format as a clean email digest with:
- Subject line
- Brief intro (1 sentence)
- This week at a glance (bullet summary)
- Applications to follow up on (if any)
- Upcoming interviews to prep for (if any)
- One actionable tip for next week based on the data
- Sign-off

Keep it under 300 words. Professional but conversational. No em dashes. No AI phrases.`;

    const response = await callNuur({ prompt, model: MODEL.DEFAULT });

    if (btn) { btn.textContent = "📊 Generate weekly digest"; btn.disabled = false; }
    showDigestModal(response, dateRange);

  } catch (e) {
    if (btn) { btn.textContent = "📊 Generate weekly digest"; btn.disabled = false; }
    console.error("Digest error:", e);
  }
}

function showDigestModal(content, dateRange) {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;padding:20px;font-family:var(--font)";
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });

  const card = document.createElement("div");
  card.style.cssText = "background:var(--bg1);border:1px solid var(--border);border-radius:16px;width:100%;max-width:580px;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:var(--shadow-lg)";

  // Header
  const hdr = document.createElement("div");
  hdr.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border);flex-shrink:0";
  const hl = document.createElement("div");
  hl.innerHTML = "";
  const hlTitle = document.createElement("div");
  hlTitle.style.cssText = "font-size:14px;font-weight:600;color:var(--text0)";
  hlTitle.textContent = "📊 Weekly Digest";
  const hlSub = document.createElement("div");
  hlSub.style.cssText = "font-size:11px;color:var(--text3);margin-top:2px";
  hlSub.textContent = dateRange;
  hl.appendChild(hlTitle); hl.appendChild(hlSub);
  const hx = document.createElement("button");
  hx.style.cssText = "background:none;border:none;color:var(--text3);cursor:pointer;font-size:18px;padding:0";
  hx.textContent = "×";
  hx.addEventListener("click", () => overlay.remove());
  hdr.appendChild(hl); hdr.appendChild(hx);

  // Body
  const body = document.createElement("div");
  body.style.cssText = "flex:1;overflow-y:auto;padding:20px";

  const ta = document.createElement("textarea");
  ta.style.cssText = "width:100%;height:320px;background:var(--bg0);border:1px solid var(--border);border-radius:10px;padding:14px;font-family:var(--font);font-size:13px;color:var(--text1);line-height:1.7;resize:vertical;outline:none;caret-color:var(--teal)";
  ta.value = content;
  ta.addEventListener("focus", () => ta.style.borderColor = "var(--teal)");
  ta.addEventListener("blur", () => ta.style.borderColor = "var(--border)");
  body.appendChild(ta);

  // Footer
  const foot = document.createElement("div");
  foot.style.cssText = "padding:14px 20px;border-top:1px solid var(--border);display:flex;gap:8px;flex-shrink:0";

  const copyBtn = document.createElement("button");
  copyBtn.style.cssText = "flex:2;padding:10px;border-radius:9px;background:var(--teal);border:none;color:#fff;font-family:var(--font);font-size:12px;font-weight:500;cursor:pointer";
  copyBtn.textContent = "📋 Copy digest";
  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(ta.value).catch(() => {});
    copyBtn.textContent = "Copied!";
    setTimeout(() => { copyBtn.textContent = "📋 Copy digest"; }, 2000);
  });

  const schedBtn = document.createElement("button");
  schedBtn.style.cssText = "flex:1;padding:10px;border-radius:9px;background:var(--bg0);border:1px solid var(--border);color:var(--text2);font-family:var(--font);font-size:12px;cursor:pointer";
  schedBtn.textContent = "⏰ Schedule weekly";
  schedBtn.addEventListener("click", () => scheduleWeeklyDigest());

  const closeBtn = document.createElement("button");
  closeBtn.style.cssText = "flex:1;padding:10px;border-radius:9px;background:transparent;border:1px solid var(--border);color:var(--text3);font-family:var(--font);font-size:12px;cursor:pointer";
  closeBtn.textContent = "Close";
  closeBtn.addEventListener("click", () => overlay.remove());

  foot.appendChild(copyBtn);
  foot.appendChild(schedBtn);
  foot.appendChild(closeBtn);

  card.appendChild(hdr);
  card.appendChild(body);
  card.appendChild(foot);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

function scheduleWeeklyDigest() {
  // Set alarm for Sunday 9am via background
  chrome.runtime.sendMessage({ type: "SET_WEEKLY_DIGEST_ALARM" }, () => { chrome.runtime.lastError; });
  const s = document.createElement("div");
  s.style.cssText = "position:fixed;bottom:24px;right:24px;z-index:99999;background:var(--bg1);border:1px solid var(--border);border-radius:10px;padding:10px 16px;font-size:12px;color:var(--text1);font-family:var(--font);box-shadow:var(--shadow)";
  s.textContent = "✓ Weekly digest scheduled for Sunday 9am";
  document.body.appendChild(s);
  setTimeout(() => s.remove(), 3000);
}

// Wire buttons when settings tab opens
document.getElementById("btn-export-csv")?.addEventListener("click", exportAllDataCSV);
document.getElementById("btn-weekly-digest")?.addEventListener("click", generateWeeklyDigest);

// ══════════════════════════════════════════════════════════════════
// ── SAVED SEARCH MONITOR ──────────────────────────────────────────
// Save agent job searches, run them on a schedule, alert on new results
// ══════════════════════════════════════════════════════════════════

const SAVED_SEARCHES_KEY = "nuur_saved_searches";

function getSavedSearches() {
  try { return JSON.parse(localStorage.getItem(SAVED_SEARCHES_KEY) || "[]"); }
  catch (_) { return []; }
}

function saveSavedSearch(search) {
  const searches = getSavedSearches();
  searches.unshift({ ...search, id: `srch_${Date.now()}`, created_at: new Date().toISOString(), last_run: null, results_count: 0 });
  localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(searches.slice(0, 10)));
}

function deleteSavedSearch(id) {
  const updated = getSavedSearches().filter(s => s.id !== id);
  localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(updated));
}

function showSavedSearchManager() {
  const existing = document.getElementById("nuur-search-monitor");
  if (existing) { existing.remove(); return; }

  const overlay = document.createElement("div");
  overlay.id = "nuur-search-monitor";
  overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;padding:20px;font-family:var(--font)";
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });

  const card = document.createElement("div");
  card.style.cssText = "background:var(--bg1);border:1px solid var(--border);border-radius:16px;width:100%;max-width:560px;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:var(--shadow-lg)";

  // Header
  const hdr = document.createElement("div");
  hdr.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border);flex-shrink:0";
  const ht = document.createElement("div");
  ht.style.cssText = "font-size:14px;font-weight:600;color:var(--text0)";
  ht.textContent = "🔍 Saved Search Monitor";
  const hx = document.createElement("button");
  hx.style.cssText = "background:none;border:none;color:var(--text3);cursor:pointer;font-size:18px;padding:0";
  hx.textContent = "×";
  hx.addEventListener("click", () => overlay.remove());
  hdr.appendChild(ht); hdr.appendChild(hx);

  // Add new search
  const addRow = document.createElement("div");
  addRow.style.cssText = "padding:14px 20px;border-bottom:1px solid var(--border3);display:flex;gap:8px;flex-shrink:0";
  const input = document.createElement("input");
  input.className = "input";
  input.style.fontSize = "12.5px";
  input.placeholder = "e.g. GRC Analyst Columbus OH posted this week";
  const addBtn = document.createElement("button");
  addBtn.style.cssText = "padding:8px 14px;border-radius:9px;background:var(--teal);border:none;color:#fff;font-family:var(--font);font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap";
  addBtn.textContent = "+ Save search";
  addBtn.addEventListener("click", () => {
    const q = input.value.trim();
    if (!q) { input.focus(); return; }
    saveSavedSearch({ query: q, frequency: "daily" });
    input.value = "";
    renderSearches();
    chrome.runtime.sendMessage({ type: "SCHEDULE_SEARCH_MONITOR" }, () => { chrome.runtime.lastError; });
  });
  addRow.appendChild(input); addRow.appendChild(addBtn);

  // List
  const list = document.createElement("div");
  list.style.cssText = "flex:1;overflow-y:auto;padding:10px 20px";

  const renderSearches = () => {
    list.replaceChildren();
    const searches = getSavedSearches();
    if (!searches.length) {
      const empty = document.createElement("div");
      empty.className = "dash-empty";
      empty.innerHTML = "<div class='dash-empty-icon'>🔍</div><div class='dash-empty-title'>No saved searches yet</div><div class='dash-empty-sub'>Save a search and Nuur will run it daily and alert you to new listings</div>";
      list.appendChild(empty);
      return;
    }

    searches.forEach(s => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--border3)";

      const icon = document.createElement("div");
      icon.style.cssText = "width:32px;height:32px;border-radius:8px;background:var(--teal3);border:1px solid rgba(13,148,136,0.15);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0";
      icon.textContent = "🔍";

      const info = document.createElement("div");
      info.style.flex = "1"; info.style.minWidth = "0";
      const q = document.createElement("div");
      q.style.cssText = "font-size:12.5px;font-weight:500;color:var(--text0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
      q.textContent = s.query;
      const meta = document.createElement("div");
      meta.style.cssText = "font-size:11px;color:var(--text3);margin-top:2px";
      meta.textContent = s.last_run
        ? `Last run ${new Date(s.last_run).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${s.results_count || 0} results`
        : "Never run yet";
      info.appendChild(q); info.appendChild(meta);

      const runBtn = document.createElement("button");
      runBtn.style.cssText = "padding:5px 10px;border-radius:7px;background:var(--teal3);border:1px solid rgba(13,148,136,0.2);color:var(--teal);font-size:10px;cursor:pointer;font-family:var(--font);white-space:nowrap";
      runBtn.textContent = "Run now";
      runBtn.addEventListener("click", () => {
        overlay.remove();
        switchView("agent");
        const agIn = document.getElementById("agent-input");
        if (agIn) { agIn.value = `Search for: ${s.query}. List all results with company, role, salary if shown, and link.`; }
        setTimeout(runAgent, 100);
      });

      const delBtn = document.createElement("button");
      delBtn.style.cssText = "padding:5px 8px;border-radius:7px;background:transparent;border:1px solid var(--border);color:var(--text3);font-size:10px;cursor:pointer;font-family:var(--font)";
      delBtn.textContent = "×";
      delBtn.addEventListener("click", () => { deleteSavedSearch(s.id); renderSearches(); });

      row.appendChild(icon); row.appendChild(info); row.appendChild(runBtn); row.appendChild(delBtn);
      list.appendChild(row);
    });
  };

  renderSearches();

  const notice = document.createElement("div");
  notice.style.cssText = "padding:12px 20px;border-top:1px solid var(--border3);font-size:11px;color:var(--text3);flex-shrink:0;line-height:1.5";
  notice.textContent = "Saved searches run daily at 9am. Nuur will notify you when new listings appear.";

  card.appendChild(hdr); card.appendChild(addRow); card.appendChild(list); card.appendChild(notice);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  input.focus();
}

// ══════════════════════════════════════════════════════════════════
// ── APPLICATION ANALYTICS ─────────────────────────────────════════
// Response rates, patterns, insights from your own tracked data
// ══════════════════════════════════════════════════════════════════

async function loadApplicationAnalytics() {
  const el = document.getElementById("dash-analytics");
  if (!el) return;

  try {
    const apps = await DB.get("nuur_applications", `?user_id=eq.${NUUR_USER_ID}&order=applied_at.desc&limit=100`);
    if (!Array.isArray(apps) || apps.length < 3) {
      el.innerHTML = "";
      const empty = document.createElement("div");
      empty.className = "dash-empty";
      const ei = document.createElement("div"); ei.className = "dash-empty-icon"; ei.textContent = "📈";
      const et = document.createElement("div"); et.className = "dash-empty-title"; et.textContent = "Track 3+ applications to see analytics";
      const es = document.createElement("div"); es.className = "dash-empty-sub"; es.textContent = "Patterns on platform response rates, best days to apply, and more";
      empty.appendChild(ei); empty.appendChild(et); empty.appendChild(es);
      el.appendChild(empty);
      return;
    }

    el.replaceChildren();

    // ── Platform response rates
    const platforms = {};
    apps.forEach(a => {
      const p = a.platform || "Other";
      if (!platforms[p]) platforms[p] = { total: 0, responded: 0 };
      platforms[p].total++;
      if (["interview","offer","responded"].includes(a.status)) platforms[p].responded++;
    });

    const platformRows = Object.entries(platforms)
      .filter(([, v]) => v.total >= 2)
      .sort((a, b) => (b[1].responded / b[1].total) - (a[1].responded / a[1].total));

    if (platformRows.length) {
      const sec = makeAnalyticsSection("Platform response rates");
      platformRows.forEach(([name, data]) => {
        const rate = Math.round((data.responded / data.total) * 100);
        const row = document.createElement("div");
        row.style.cssText = "display:flex;align-items:center;gap:10px;margin-bottom:7px";
        const lbl = document.createElement("div");
        lbl.style.cssText = "font-size:11px;color:var(--text2);width:90px;flex-shrink:0";
        lbl.textContent = name;
        const barWrap = document.createElement("div");
        barWrap.style.cssText = "flex:1;background:var(--bg0);border-radius:4px;height:8px;overflow:hidden";
        const bar = document.createElement("div");
        bar.style.cssText = `height:100%;border-radius:4px;background:${rate >= 30 ? "var(--green)" : rate >= 15 ? "var(--teal)" : "var(--text4)"};width:${Math.max(rate, 3)}%;transition:width .5s var(--ease)`;
        barWrap.appendChild(bar);
        const pct = document.createElement("div");
        pct.style.cssText = "font-size:11px;color:var(--text2);width:40px;text-align:right;flex-shrink:0";
        pct.textContent = `${rate}% (${data.total})`;
        row.appendChild(lbl); row.appendChild(barWrap); row.appendChild(pct);
        sec.appendChild(row);
      });
      el.appendChild(sec);
    }

    // ── Day of week pattern
    const dayCount = Array(7).fill(0);
    const dayResponded = Array(7).fill(0);
    const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    apps.forEach(a => {
      if (!a.applied_at) return;
      const d = new Date(a.applied_at).getDay();
      dayCount[d]++;
      if (["interview","offer","responded"].includes(a.status)) dayResponded[d]++;
    });

    const bestDays = dayNames
      .map((name, i) => ({ name, total: dayCount[i], rate: dayCount[i] ? Math.round((dayResponded[i] / dayCount[i]) * 100) : 0 }))
      .filter(d => d.total >= 2)
      .sort((a, b) => b.rate - a.rate);

    if (bestDays.length) {
      const sec = makeAnalyticsSection("Best days to apply");
      const grid = document.createElement("div");
      grid.style.cssText = "display:flex;gap:5px;flex-wrap:wrap";
      bestDays.slice(0, 5).forEach(d => {
        const chip = document.createElement("div");
        chip.style.cssText = `padding:4px 10px;border-radius:8px;font-size:11px;font-weight:500;background:${d.rate >= 20 ? "var(--teal3)" : "var(--bg0)"};color:${d.rate >= 20 ? "var(--teal)" : "var(--text3)"};border:1px solid ${d.rate >= 20 ? "rgba(13,148,136,0.2)" : "var(--border3)"}`;
        chip.textContent = `${d.name} ${d.rate}%`;
        grid.appendChild(chip);
      });
      sec.appendChild(grid);
      el.appendChild(sec);
    }

    // ── Status funnel
    const funnel = { applied: 0, responded: 0, interview: 0, offer: 0 };
    apps.forEach(a => {
      funnel.applied++;
      if (["responded","interview","offer"].includes(a.status)) funnel.responded++;
      if (["interview","offer"].includes(a.status)) funnel.interview++;
      if (a.status === "offer") funnel.offer++;
    });

    const sec2 = makeAnalyticsSection("Your pipeline funnel");
    const funnelSteps = [
      { label: "Applied", count: funnel.applied, color: "var(--text3)" },
      { label: "Responded", count: funnel.responded, color: "var(--blue)" },
      { label: "Interview", count: funnel.interview, color: "var(--teal)" },
      { label: "Offer", count: funnel.offer, color: "var(--gold)" },
    ];
    const funnelRow = document.createElement("div");
    funnelRow.style.cssText = "display:flex;align-items:flex-end;gap:8px";
    const maxCount = funnel.applied || 1;
    funnelSteps.forEach(step => {
      const col = document.createElement("div");
      col.style.cssText = "flex:1;display:flex;flex-direction:column;align-items:center;gap:4px";
      const bar = document.createElement("div");
      const h = Math.max(Math.round((step.count / maxCount) * 60), step.count > 0 ? 8 : 0);
      bar.style.cssText = `width:100%;height:${h}px;border-radius:6px;background:${step.color};opacity:.85;transition:height .5s var(--ease)`;
      const num = document.createElement("div");
      num.style.cssText = `font-size:14px;font-weight:700;color:${step.color}`;
      num.textContent = step.count;
      const lbl = document.createElement("div");
      lbl.style.cssText = "font-size:10px;color:var(--text3);text-align:center";
      lbl.textContent = step.label;
      col.appendChild(bar); col.appendChild(num); col.appendChild(lbl);
      funnelRow.appendChild(col);
    });
    sec2.appendChild(funnelRow);
    el.appendChild(sec2);

    // ── AI insight
    if (apps.length >= 5) {
      const insightBtn = document.createElement("button");
      insightBtn.style.cssText = "width:100%;padding:9px;border-radius:9px;background:var(--teal3);border:1px solid rgba(13,148,136,0.2);color:var(--teal);font-family:var(--font);font-size:12px;font-weight:500;cursor:pointer;margin-top:4px";
      insightBtn.textContent = "✦ Get AI insights on my search";
      insightBtn.addEventListener("click", async () => {
        insightBtn.textContent = "Analyzing…"; insightBtn.disabled = true;
        try {
          const summary = `${apps.length} applications: ${funnel.responded} responses (${Math.round(funnel.responded/apps.length*100)}% rate), ${funnel.interview} interviews, ${funnel.offer} offers. Top platforms: ${platformRows.slice(0,3).map(([n,d]) => `${n} (${Math.round(d.responded/d.total*100)}%)`).join(", ")}.`;
          const insight = await callNuur({
            prompt: `Based on this job search data, give 3 specific, actionable recommendations: ${summary}. Be direct. No em dashes.`,
            model: MODEL.FAST
          });
          const insightEl = document.createElement("div");
          insightEl.style.cssText = "padding:12px;background:var(--teal3);border:1px solid rgba(13,148,136,0.15);border-radius:10px;font-size:12.5px;color:var(--text1);line-height:1.65;margin-top:8px;white-space:pre-wrap";
          insightEl.textContent = insight;
          insightBtn.replaceWith(insightEl);
        } catch (_) {
          insightBtn.textContent = "✦ Get AI insights on my search";
          insightBtn.disabled = false;
        }
      });
      el.appendChild(insightBtn);
    }

  } catch (_) {}
}

function makeAnalyticsSection(title) {
  const sec = document.createElement("div");
  sec.style.cssText = "margin-bottom:16px";
  const t = document.createElement("div");
  t.style.cssText = "font-size:10px;font-weight:600;color:var(--text3);letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px";
  t.textContent = title;
  sec.appendChild(t);
  return sec;
}
// Wire saved search monitor button
document.getElementById("btn-search-monitor")?.addEventListener("click", e => {
  e.preventDefault();
  showSavedSearchManager();
});

// ══════════════════════════════════════════════════════════════════