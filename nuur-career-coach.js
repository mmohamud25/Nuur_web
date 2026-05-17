// ── NUUR CAREER COACH ────────────────────────────────────────────────
// Salary Negotiation, Interview Debrief, Network Warmth,
// Job Posting Archiver, Resume A/B, Offer Comparison, Question Bank
// Requires: newtab.js globals (DB, NUUR_USER_ID, callNuur, renderMarkdown)

// ── SALARY NEGOTIATION COACH ──────────────────────────────────────
// Triggered when an offer email is detected or manually opened
// Shows market data, script, counter-offer strategy
// ══════════════════════════════════════════════════════════════════

async function showSalaryNegotiationCoach(prefillData = {}) {
  const existing = document.getElementById("nuur-salary-coach");
  if (existing) { existing.remove(); return; }

  const overlay = document.createElement("div");
  overlay.id = "nuur-salary-coach";
  overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;padding:20px;font-family:var(--font)";
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });

  const card = document.createElement("div");
  card.style.cssText = "background:var(--bg1);border:1px solid var(--border);border-radius:16px;width:100%;max-width:600px;max-height:90vh;overflow-y:auto;box-shadow:var(--shadow-lg)";

  // Header
  const hdr = document.createElement("div");
  hdr.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--bg1);z-index:1";
  const ht = document.createElement("div");
  ht.innerHTML = "";
  const htTitle = document.createElement("div");
  htTitle.style.cssText = "font-size:15px;font-weight:600;color:var(--text0)";
  htTitle.textContent = "💰 Salary Negotiation Coach";
  const htSub = document.createElement("div");
  htSub.style.cssText = "font-size:11px;color:var(--text3);margin-top:2px";
  htSub.textContent = "Enter the offer details to get a coaching plan";
  ht.appendChild(htTitle); ht.appendChild(htSub);
  const hx = document.createElement("button");
  hx.style.cssText = "background:none;border:none;color:var(--text3);cursor:pointer;font-size:18px;padding:0";
  hx.textContent = "×";
  hx.addEventListener("click", () => overlay.remove());
  hdr.appendChild(ht); hdr.appendChild(hx);

  const body = document.createElement("div");
  body.style.padding = "22px";

  // Input fields
  const fields = [
    { label: "Company", key: "company", placeholder: "e.g. Deloitte", value: prefillData.company || "" },
    { label: "Role", key: "role", placeholder: "e.g. Junior GRC Analyst", value: prefillData.role || "" },
    { label: "Offer amount ($)", key: "offer", type: "number", placeholder: "e.g. 58000", value: prefillData.offer || "" },
    { label: "My target ($)", key: "target", type: "number", placeholder: "e.g. 65000", value: "" },
    { label: "Benefits offered", key: "benefits", placeholder: "e.g. 401k, health, 15 PTO days, remote 2x/week", value: prefillData.benefits || "" },
    { label: "How urgent is this role for me?", key: "urgency", type: "select", options: ["High — I need this job", "Medium — I'm also interviewing elsewhere", "Low — I have other offers"], value: "" },
    { label: "Notes (competing offers, their timeline, anything else)", key: "notes", type: "textarea", placeholder: "e.g. They said I have until Friday, I have one other offer at $62k", value: "" },
  ];

  const values = {};
  fields.forEach(f => {
    const group = document.createElement("div");
    group.style.marginBottom = "13px";
    const lbl = document.createElement("label");
    lbl.style.cssText = "display:block;font-size:11px;font-weight:500;color:var(--text2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px";
    lbl.textContent = f.label;
    group.appendChild(lbl);

    let input;
    if (f.type === "select") {
      input = document.createElement("select");
      input.className = "input";
      f.options.forEach(o => { const opt = document.createElement("option"); opt.value = o; opt.textContent = o; input.appendChild(opt); });
    } else if (f.type === "textarea") {
      input = document.createElement("textarea");
      input.className = "input"; input.rows = 2; input.style.resize = "vertical";
    } else {
      input = document.createElement("input");
      input.className = "input";
      input.type = f.type || "text";
      if (f.placeholder) input.placeholder = f.placeholder;
    }
    if (f.value) input.value = f.value;
    values[f.key] = f.value || "";
    input.addEventListener("input", () => { values[f.key] = input.value; });
    group.appendChild(input);
    body.appendChild(group);
  });

  // Pull market data from salary tracker
  const salaryData = await DB.get("nuur_salary", `?user_id=eq.${NUUR_USER_ID}&order=logged_at.desc&limit=10`);
  if (salaryData?.length) {
    const marketCtx = document.createElement("div");
    marketCtx.style.cssText = "background:var(--bg0);border:1px solid var(--border3);border-radius:10px;padding:12px;margin-bottom:14px";
    const marketTitle = document.createElement("div");
    marketTitle.style.cssText = "font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px";
    marketTitle.textContent = "Your tracked salary data";
    marketCtx.appendChild(marketTitle);
    salaryData.slice(0, 4).forEach(s => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;justify-content:space-between;font-size:11.5px;color:var(--text2);margin-bottom:4px";
      const co = document.createElement("span"); co.textContent = `${s.company} — ${s.role || "role"}`;
      const nums = document.createElement("span");
      nums.style.color = "var(--teal)";
      nums.textContent = s.offered ? `Offered $${Number(s.offered).toLocaleString()}` : s.expected ? `Expected $${Number(s.expected).toLocaleString()}` : "";
      row.appendChild(co); row.appendChild(nums);
      marketCtx.appendChild(row);
    });
    body.appendChild(marketCtx);
  }

  // Generate button
  const genBtn = document.createElement("button");
  genBtn.style.cssText = "width:100%;padding:11px;border-radius:10px;background:var(--teal);border:none;color:#fff;font-family:var(--font);font-size:13px;font-weight:500;cursor:pointer;margin-bottom:14px";
  genBtn.textContent = "Generate negotiation plan";
  genBtn.addEventListener("click", async () => {
    genBtn.textContent = "Building your plan…"; genBtn.disabled = true;
    resultArea.style.display = "block";
    resultArea.replaceChildren();
    const loading = document.createElement("div");
    loading.style.cssText = "text-align:center;padding:20px;color:var(--text3);font-size:13px";
    loading.textContent = "Analyzing offer and building strategy…";
    resultArea.appendChild(loading);

    const marketAvg = salaryData?.length
      ? Math.round(salaryData.filter(s => s.offered || s.market_rate).reduce((sum, s) => sum + (s.offered || s.market_rate || 0), 0) / salaryData.filter(s => s.offered || s.market_rate).length)
      : null;

    const prompt = `You are a salary negotiation coach. Build a complete negotiation plan.

OFFER DETAILS:
Company: ${values.company}
Role: ${values.role}
Offer: $${values.offer ? Number(values.offer).toLocaleString() : "not specified"}
My target: $${values.target ? Number(values.target).toLocaleString() : "not specified"}
Benefits: ${values.benefits}
My situation: ${values.urgency}
Additional context: ${values.notes}
${marketAvg ? `Market data from my tracker: avg $${marketAvg.toLocaleString()} across tracked offers` : ""}

CANDIDATE BACKGROUND:
Security+ certified, BS Business Administration (GPA 3.5), MS Business Analytics in progress.
2+ years IT support. Founder of cybersecurity education company. Targeting GRC/SOC/IT Security roles in Columbus OH.

Build a complete negotiation plan with these sections:

**SITUATION ASSESSMENT**
[Honest read of the offer — strong, fair, or below market? Leverage analysis]

**COUNTER-OFFER STRATEGY**
[Exact number to counter with and why. What to anchor on.]

**WORD-FOR-WORD SCRIPT — Phone call**
[Exact phrases to use when they call or you call them. Include pauses.]

**WORD-FOR-WORD SCRIPT — Email counter**
[A complete email ready to send]

**IF THEY PUSH BACK**
[3 specific responses to common pushback: "this is our max", "the range is set", "we can revisit in 6 months"]

**BENEFITS TO NEGOTIATE**
[What to ask for if base salary is truly fixed — PTO, remote days, signing bonus, title, review date]

**WALK-AWAY LINE**
[The exact situation and number at which you should decline]

**TIMELINE**
[How long to take, when to follow up, when you risk losing the offer]

Be direct. Give exact numbers and exact words. No em dashes. No generic advice.`;

    try {
      const res = await fetch(PROXY, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ model: "sonnet", prompt, system: "You are a direct negotiation coach. Give specific scripts and exact numbers. No em dashes." })
      });
      const data = await res.json();
      const plan = data.content?.[0]?.text || "Could not generate plan.";
      resultArea.replaceChildren();
      renderMarkdown(plan, resultArea);

      // Save to salary tracker
      if (values.company && values.offer) {
        await DB.insert("nuur_salary", {
          id: `sal_${Date.now()}`,
          user_id: NUUR_USER_ID,
          company: values.company,
          role: values.role,
          offered: parseFloat(values.offer) || null,
          expected: parseFloat(values.target) || null,
          benefits: values.benefits,
          notes: values.notes,
          outcome: "Pending",
          logged_at: new Date().toISOString()
        });
      }
    } catch (e) {
      resultArea.textContent = "Error: " + e.message;
    }
    genBtn.textContent = "Regenerate plan"; genBtn.disabled = false;
  });

  const resultArea = document.createElement("div");
  resultArea.style.cssText = "display:none;background:var(--bg0);border:1px solid var(--border);border-radius:12px;padding:16px;font-size:13px;line-height:1.7;color:var(--text1)";

  body.appendChild(genBtn);
  body.appendChild(resultArea);
  card.appendChild(hdr); card.appendChild(body);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

// Wire to hint chip — guard prevents duplicate on hot reload
if (!document.getElementById("nuur-sal-coach-hint")) {
  const salaryCoachHint = document.createElement("div");
  salaryCoachHint.id = "nuur-sal-coach-hint";
  salaryCoachHint.className = "hint-chip";
  salaryCoachHint.textContent = "💰 Salary coach";
  salaryCoachHint.addEventListener("click", () => showSalaryNegotiationCoach());
  document.querySelector(".input-hints")?.appendChild(salaryCoachHint);
}

// ══════════════════════════════════════════════════════════════════
// ── INTERVIEW DEBRIEF ─────────────────────────────────────────────
// Post-interview analysis using meeting notes + AI coaching
// ══════════════════════════════════════════════════════════════════

async function showInterviewDebrief() {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;padding:20px;font-family:var(--font)";
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });

  const card = document.createElement("div");
  card.style.cssText = "background:var(--bg1);border:1px solid var(--border);border-radius:16px;width:100%;max-width:620px;max-height:90vh;overflow-y:auto;box-shadow:var(--shadow-lg)";

  const hdr = document.createElement("div");
  hdr.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border);sticky;top:0;background:var(--bg1)";
  const htitle = document.createElement("div");
  htitle.style.cssText = "font-size:14px;font-weight:600;color:var(--text0)";
  htitle.textContent = "🎤 Interview Debrief";
  const hx = document.createElement("button");
  hx.style.cssText = "background:none;border:none;color:var(--text3);cursor:pointer;font-size:18px;padding:0";
  hx.textContent = "×";
  hx.addEventListener("click", () => overlay.remove());
  hdr.appendChild(htitle); hdr.appendChild(hx);

  const body = document.createElement("div");
  body.style.padding = "20px";

  // Link to recent interviews
  const interviews = await DB.get("nuur_interviews", `?user_id=eq.${NUUR_USER_ID}&status=eq.completed&order=scheduled_at.desc&limit=5`);
  if (interviews?.length) {
    const ivSec = document.createElement("div");
    ivSec.style.marginBottom = "14px";
    const ivLbl = document.createElement("div");
    ivLbl.style.cssText = "font-size:10px;font-weight:500;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px";
    ivLbl.textContent = "Link to a recent interview";
    ivSec.appendChild(ivLbl);
    const ivSel = document.createElement("select"); ivSel.className = "input"; ivSel.style.fontSize = "12.5px";
    const defaultOpt = document.createElement("option"); defaultOpt.value = ""; defaultOpt.textContent = "Select (optional)";
    ivSel.appendChild(defaultOpt);
    interviews.forEach(iv => {
      const o = document.createElement("option"); o.value = iv.id;
      o.textContent = `${iv.company} — ${iv.role || "Interview"} (Round ${iv.round || 1})`;
      ivSel.appendChild(o);
    });
    ivSec.appendChild(ivSel);
    body.appendChild(ivSec);
  }

  const fields = [
    { label: "Company", key: "company", placeholder: "e.g. Deloitte" },
    { label: "Role", key: "role", placeholder: "e.g. GRC Analyst" },
    { label: "Interviewer(s)", key: "interviewer", placeholder: "e.g. Sarah Chen, Hiring Manager" },
    { label: "What questions were you asked?", key: "questions", type: "textarea", rows: 3, placeholder: "List the questions you remember..." },
    { label: "What answers felt weak or uncertain?", key: "weak", type: "textarea", rows: 2, placeholder: "Be honest — what could have gone better?" },
    { label: "What felt strong?", key: "strong", type: "textarea", rows: 2, placeholder: "Moments you nailed it" },
    { label: "Salary discussed?", key: "salary", placeholder: "e.g. They mentioned $60-65k range" },
    { label: "What did they say about next steps?", key: "next_steps", placeholder: "e.g. Will contact by Friday" },
    { label: "Your gut feeling", key: "gut", type: "select", options: ["Very confident", "Cautiously optimistic", "Unsure — could go either way", "Not confident", "It was a disaster"] },
  ];

  const values = {};
  fields.forEach(f => {
    const group = document.createElement("div"); group.style.marginBottom = "12px";
    const lbl = document.createElement("label");
    lbl.style.cssText = "display:block;font-size:10px;font-weight:500;color:var(--text2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px";
    lbl.textContent = f.label;
    group.appendChild(lbl);
    let input;
    if (f.type === "select") {
      input = document.createElement("select"); input.className = "input";
      f.options.forEach(o => { const opt = document.createElement("option"); opt.value = o; opt.textContent = o; input.appendChild(opt); });
    } else if (f.type === "textarea") {
      input = document.createElement("textarea"); input.className = "input";
      input.rows = f.rows || 2; input.style.resize = "vertical";
    } else {
      input = document.createElement("input"); input.className = "input";
      if (f.placeholder) input.placeholder = f.placeholder;
    }
    values[f.key] = "";
    input.addEventListener("input", () => { values[f.key] = input.value; });
    group.appendChild(input); body.appendChild(group);
  });

  const genBtn = document.createElement("button");
  genBtn.style.cssText = "width:100%;padding:11px;border-radius:10px;background:var(--teal);border:none;color:#fff;font-family:var(--font);font-size:13px;font-weight:500;cursor:pointer;margin-bottom:14px";
  genBtn.textContent = "Generate debrief + thank-you note";

  const resultArea = document.createElement("div");
  resultArea.style.cssText = "display:none;background:var(--bg0);border:1px solid var(--border);border-radius:12px;padding:16px";

  genBtn.addEventListener("click", async () => {
    genBtn.textContent = "Analyzing…"; genBtn.disabled = true;
    resultArea.style.display = "block";
    resultArea.replaceChildren();
    const loading = document.createElement("p");
    loading.style.cssText = "color:var(--text3);font-size:13px;text-align:center;padding:20px";
    loading.textContent = "Reviewing your interview…";
    resultArea.appendChild(loading);

    const prompt = `You are an interview coach doing a post-interview debrief.

INTERVIEW DETAILS:
Company: ${values.company}
Role: ${values.role}
Interviewer(s): ${values.interviewer}
Questions asked: ${values.questions}
Answers that felt weak: ${values.weak}
Answers that felt strong: ${values.strong}
Salary discussed: ${values.salary}
Next steps mentioned: ${values.next_steps}
Candidate's gut feeling: ${values.gut}

CANDIDATE: Mohamud Mohamed — Security+ certified, IT support background, cybersecurity entrepreneur, MS student

Provide a complete debrief in these sections:

**HONEST ASSESSMENT**
[Based on everything described — what likely went well, what might hurt, and overall read on chances. Be real, not reassuring.]

**WHAT YOU NAILED**
[Specific strengths from this interview — reference their actual answers]

**WHAT TO IMPROVE**
[Specific weak answers with better versions they should have given. Show don't tell.]

**FOLLOW-UP QUESTIONS YOU SHOULD HAVE ASKED**
[3-5 smart questions they missed that would have shown more depth]

**IMMEDIATE ACTIONS**
[Ranked list of what to do in the next 24-48 hours]

**THANK-YOU EMAIL**
Subject: [subject line]
[Complete thank-you email ready to send — references specific conversation topics, reiterates fit, under 150 words, no em dashes, no AI phrases]`;

    try {
      const res = await fetch(PROXY, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ model: "sonnet", prompt, system: "You are a direct interview coach. Be honest and specific. No em dashes. No AI phrases." })
      });
      const data = await res.json();
      const debrief = data.content?.[0]?.text || "Could not generate debrief.";
      resultArea.replaceChildren();
      renderMarkdown(debrief, resultArea);
    } catch (e) {
      resultArea.textContent = "Error: " + e.message;
    }
    genBtn.textContent = "Regenerate"; genBtn.disabled = false;
  });

  body.appendChild(genBtn); body.appendChild(resultArea);
  card.appendChild(hdr); card.appendChild(body);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

// Wire interview debrief to dashboard add-interview-btn (add second trigger)
if (!document.getElementById("nuur-debrief-hint")) {
  const debriefHint = document.createElement("div");
  debriefHint.id = "nuur-debrief-hint";
  debriefHint.className = "hint-chip";
  debriefHint.textContent = "🎤 Interview debrief";
  debriefHint.addEventListener("click", showInterviewDebrief);
  document.querySelector(".input-hints")?.appendChild(debriefHint);
}

// ══════════════════════════════════════════════════════════════════
// ── NETWORK WARMTH SCORING ────────────────────────────────────────
// Score relationships by recency, response history, referral status
// Show contacts going cold so you re-engage before losing them
// ══════════════════════════════════════════════════════════════════

async function loadNetworkWarmth() {
  const el = document.getElementById("dash-network");
  if (!el) return;

  try {
    const contacts = await DB.get("nuur_contacts", `?user_id=eq.${NUUR_USER_ID}&order=last_contacted.desc&limit=20`);
    if (!Array.isArray(contacts) || !contacts.length) return;

    el.replaceChildren();

    // Compute warmth score for each contact
    const scored = contacts.map(c => {
      let score = 100;
      const now = Date.now();

      // Days since last contact — main decay factor
      if (c.last_contacted) {
        const days = (now - new Date(c.last_contacted).getTime()) / 86400000;
        if (days > 90) score -= 60;
        else if (days > 60) score -= 40;
        else if (days > 30) score -= 20;
        else if (days > 14) score -= 10;
      } else {
        score -= 50; // never contacted
      }

      // Referral bonus
      if (c.is_referral) score += 15;

      // Overdue follow-up penalty
      if (c.follow_up_at && new Date(c.follow_up_at) < new Date()) score -= 20;

      score = Math.max(0, Math.min(100, score));

      const warmth = score >= 70 ? { label: "Warm", color: "var(--green)", bg: "rgba(22,163,74,0.08)" }
        : score >= 40 ? { label: "Cooling", color: "var(--gold)", bg: "rgba(217,119,6,0.08)" }
        : { label: "Cold", color: "var(--red)", bg: "rgba(239,68,68,0.08)" };

      return { ...c, score, warmth };
    }).sort((a, b) => a.score - b.score); // coldest first

    // Cold contacts section (need attention)
    const cold = scored.filter(c => c.score < 40);
    const cooling = scored.filter(c => c.score >= 40 && c.score < 70);
    const warm = scored.filter(c => c.score >= 70);

    if (cold.length || cooling.length) {
      const attnTitle = document.createElement("div");
      attnTitle.style.cssText = "font-size:10px;font-weight:600;color:var(--red);text-transform:uppercase;letter-spacing:.08em;margin-bottom:7px;display:flex;align-items:center;gap:5px";
      attnTitle.textContent = `⚠ ${cold.length + cooling.length} contacts need attention`;
      el.appendChild(attnTitle);
    }

    scored.slice(0, 8).forEach(c => {
      const row = document.createElement("div");
      row.style.cssText = `display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:10px;margin-bottom:6px;background:${c.warmth.bg};border:1px solid ${c.warmth.color}20;cursor:pointer`;
      row.addEventListener("click", () => showContactModal(c));

      const avatar = document.createElement("div");
      avatar.style.cssText = `width:34px;height:34px;border-radius:9px;background:${c.warmth.color}15;border:1.5px solid ${c.warmth.color}40;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;color:${c.warmth.color};flex-shrink:0`;
      avatar.textContent = (c.name || "?").charAt(0).toUpperCase();

      const info = document.createElement("div"); info.style.flex = "1"; info.style.minWidth = "0";
      const nameRow = document.createElement("div");
      nameRow.style.cssText = "display:flex;align-items:center;gap:6px;margin-bottom:2px";
      const name = document.createElement("div");
      name.style.cssText = "font-size:12.5px;font-weight:500;color:var(--text0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
      name.textContent = c.name;
      if (c.is_referral) {
        const ref = document.createElement("span");
        ref.style.cssText = "font-size:9px;background:var(--teal3);color:var(--teal);padding:1px 6px;border-radius:8px;flex-shrink:0";
        ref.textContent = "REFERRAL";
        nameRow.appendChild(name); nameRow.appendChild(ref);
      } else {
        nameRow.appendChild(name);
      }
      const sub = document.createElement("div");
      sub.style.cssText = "font-size:11px;color:var(--text3)";
      sub.textContent = [c.title, c.company].filter(Boolean).join(" at ") || c.how_met || "";
      info.appendChild(nameRow); info.appendChild(sub);

      const right = document.createElement("div");
      right.style.cssText = "flex-shrink:0;text-align:right";

      // Warmth indicator
      const warmLabel = document.createElement("div");
      warmLabel.style.cssText = `font-size:10px;font-weight:600;color:${c.warmth.color};margin-bottom:3px`;
      warmLabel.textContent = c.warmth.label;

      // Days since contact
      const lastEl = document.createElement("div");
      lastEl.style.cssText = "font-size:10px;color:var(--text4)";
      if (c.last_contacted) {
        const days = Math.round((Date.now() - new Date(c.last_contacted).getTime()) / 86400000);
        lastEl.textContent = days === 0 ? "Today" : `${days}d ago`;
      } else {
        lastEl.textContent = "Never contacted";
      }

      // Re-engage button for cold contacts
      if (c.score < 50) {
        const reBtn = document.createElement("button");
        reBtn.style.cssText = `margin-top:4px;padding:3px 8px;border-radius:6px;background:transparent;border:1px solid ${c.warmth.color}40;color:${c.warmth.color};font-size:10px;cursor:pointer;font-family:var(--font)`;
        reBtn.textContent = "Draft message";
        reBtn.addEventListener("click", e => { e.stopPropagation(); draftReEngagementMessage(c); });
        right.appendChild(warmLabel); right.appendChild(lastEl); right.appendChild(reBtn);
      } else {
        right.appendChild(warmLabel); right.appendChild(lastEl);
      }

      row.appendChild(avatar); row.appendChild(info); row.appendChild(right);
      el.appendChild(row);
    });

    // Summary stats
    const stats = document.createElement("div");
    stats.style.cssText = "display:flex;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border3)";
    [
      { label: "Warm", count: warm.length, color: "var(--green)" },
      { label: "Cooling", count: cooling.length, color: "var(--gold)" },
      { label: "Cold", count: cold.length, color: "var(--red)" },
    ].forEach(s => {
      const chip = document.createElement("div");
      chip.style.cssText = `flex:1;text-align:center;padding:7px;border-radius:8px;background:${s.color}08;border:1px solid ${s.color}20`;
      const num = document.createElement("div");
      num.style.cssText = `font-size:16px;font-weight:700;color:${s.color}`;
      num.textContent = s.count;
      const lbl = document.createElement("div");
      lbl.style.cssText = "font-size:10px;color:var(--text3)";
      lbl.textContent = s.label;
      chip.appendChild(num); chip.appendChild(lbl);
      stats.appendChild(chip);
    });
    el.appendChild(stats);

  } catch (_) {}
}

async function draftReEngagementMessage(contact) {
  const days = contact.last_contacted
    ? Math.round((Date.now() - new Date(contact.last_contacted).getTime()) / 86400000)
    : null;

  const prompt = `Write a brief, natural re-engagement message to a professional contact I haven't been in touch with for a while.

Contact: ${contact.name}
Title: ${contact.title || "professional"}
Company: ${contact.company || "their company"}
How we met: ${contact.how_met || "professionally"}
${days ? `Days since last contact: ${days}` : "We've never actually connected beyond the initial meeting"}
Is referral contact: ${contact.is_referral ? "Yes" : "No"}

Write TWO versions:
1. LinkedIn DM (under 300 characters, casual reconnect)
2. Email (3-4 sentences, warmer, mentions a specific hook like checking in or sharing something relevant)

RULES: Don't be cringey or fake. Don't say "I hope this finds you well." Mention something genuine about why I'm reaching out now — could be job searching, interested in their industry, or just genuine reconnection. No em dashes.`;

  try {
    const result = await callNuur({ prompt, model: MODEL.FAST });
    // Show in a simple toast-style modal
    const modal = document.createElement("div");
    modal.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;padding:20px;font-family:var(--font)";
    modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
    const mc = document.createElement("div");
    mc.style.cssText = "background:var(--bg1);border:1px solid var(--border);border-radius:14px;padding:20px;width:100%;max-width:500px;box-shadow:var(--shadow-lg)";
    const mt = document.createElement("div");
    mt.style.cssText = "font-size:13px;font-weight:600;color:var(--text0);margin-bottom:12px";
    mt.textContent = `Re-engage — ${contact.name}`;
    const content = document.createElement("div");
    content.style.cssText = "background:var(--bg0);border-radius:10px;padding:14px;font-size:12.5px;line-height:1.7;color:var(--text1);white-space:pre-wrap;margin-bottom:12px";
    content.textContent = result;
    const foot = document.createElement("div");
    foot.style.cssText = "display:flex;gap:8px";
    const copyBtn = document.createElement("button");
    copyBtn.style.cssText = "flex:2;padding:9px;border-radius:9px;background:var(--teal);border:none;color:#fff;font-family:var(--font);font-size:12px;font-weight:500;cursor:pointer";
    copyBtn.textContent = "Copy"; copyBtn.addEventListener("click", () => { navigator.clipboard.writeText(result).catch(() => {}); copyBtn.textContent = "Copied!"; setTimeout(() => { copyBtn.textContent = "Copy"; }, 2000); });
    const closeBtn = document.createElement("button");
    closeBtn.style.cssText = "flex:1;padding:9px;border-radius:9px;background:var(--bg0);border:1px solid var(--border);color:var(--text2);font-family:var(--font);font-size:12px;cursor:pointer";
    closeBtn.textContent = "Close"; closeBtn.addEventListener("click", () => modal.remove());
    foot.appendChild(copyBtn); foot.appendChild(closeBtn);
    mc.appendChild(mt); mc.appendChild(content); mc.appendChild(foot);
    modal.appendChild(mc); document.body.appendChild(modal);
  } catch (_) {}
}

// ══════════════════════════════════════════════════════════════════
// ── JOB POSTING ARCHIVER ──────────────────────────────────────────
// Auto-saves full posting text when an application is tracked
// ══════════════════════════════════════════════════════════════════

async function archiveJobPosting(appId, postingText, title, company) {
  if (!postingText || postingText.length < 100) return;
  try {
    await DB.insert("nuur_bookmarks", {
      user_id: NUUR_USER_ID,
      title: `📋 ${title} — ${company}`,
      url: `app:${appId}`,
      summary: postingText.substring(0, 300),
      tags: ["archived-posting", `app-${appId}`],
      full_text: postingText.substring(0, 8000),
      saved_at: new Date().toISOString()
    });
  } catch (_) {}
}

// Hook into application tracking — only in content script context where NuurTracker exists
// NuurTracker is defined in profile.js which is a content script, not loaded in newtab
if (typeof NuurTracker !== "undefined" && NuurTracker) {
  const _origLogApp = NuurTracker.logApplication;
  if (_origLogApp) {
    NuurTracker.logApplication = async function(job) {
      const result = await _origLogApp.call(NuurTracker, job);
      if (result && job.postingText) {
        archiveJobPosting(job.id, job.postingText, job.title, job.company);
      }
      return result;
    };
  }
}

// ══════════════════════════════════════════════════════════════════
// ── RESUME A/B TRACKING ───────────────────────────────────────────
// Track which resume version was sent per application
// ══════════════════════════════════════════════════════════════════

async function logResumeVersion(appId, versionName) {
  if (!appId) return;
  await DB.update("nuur_applications", `id=eq.${appId}`, {
    notes: `Resume version: ${versionName} | ${new Date().toLocaleDateString()}`
  });
}

async function showResumeVersionAnalytics() {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;padding:20px;font-family:var(--font)";
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });

  const card = document.createElement("div");
  card.style.cssText = "background:var(--bg1);border:1px solid var(--border);border-radius:16px;width:100%;max-width:540px;padding:22px;box-shadow:var(--shadow-lg);max-height:85vh;overflow-y:auto";

  const title = document.createElement("div");
  title.style.cssText = "font-size:14px;font-weight:600;color:var(--text0);margin-bottom:16px";
  title.textContent = "📄 Resume A/B Performance";

  card.appendChild(title);

  try {
    const apps = await DB.get("nuur_applications",
      `?user_id=eq.${NUUR_USER_ID}&notes=like.*Resume version*&limit=100`);

    if (!Array.isArray(apps) || !apps.length) {
      const empty = document.createElement("div");
      empty.style.cssText = "text-align:center;padding:30px;color:var(--text3);font-size:13px";
      empty.textContent = "No resume version data yet. Use the Resume Manager to tag versions when applying.";
      card.appendChild(empty);
    } else {
      // Parse version from notes field
      const versions = {};
      apps.forEach(a => {
        const match = a.notes?.match(/Resume version:\s*([^|]+)/);
        if (!match) return;
        const v = match[1].trim();
        if (!versions[v]) versions[v] = { total: 0, responded: 0 };
        versions[v].total++;
        if (["interview","offer","responded"].includes(a.status)) versions[v].responded++;
      });

      const sorted = Object.entries(versions).sort((a,b) =>
        (b[1].responded/b[1].total) - (a[1].responded/a[1].total));

      const grid = document.createElement("div");
      grid.style.cssText = "display:flex;flex-direction:column;gap:10px";

      sorted.forEach(([name, data]) => {
        const rate = Math.round((data.responded / data.total) * 100);
        const row = document.createElement("div");
        row.style.cssText = "background:var(--bg0);border:1px solid var(--border);border-radius:10px;padding:12px 14px";
        const top = document.createElement("div");
        top.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:6px";
        const nameEl = document.createElement("div");
        nameEl.style.cssText = "font-size:13px;font-weight:500;color:var(--text0)";
        nameEl.textContent = name;
        const rateEl = document.createElement("div");
        rateEl.style.cssText = `font-size:13px;font-weight:600;color:${rate >= 30 ? "var(--green)" : rate >= 15 ? "var(--teal)" : "var(--text3)"}`;
        rateEl.textContent = `${rate}% response rate`;
        top.appendChild(nameEl); top.appendChild(rateEl);
        const sub = document.createElement("div");
        sub.style.cssText = "font-size:11px;color:var(--text3)";
        sub.textContent = `${data.total} applications · ${data.responded} responses`;
        const bar = document.createElement("div");
        bar.style.cssText = "margin-top:6px;height:5px;border-radius:3px;background:var(--bg4);overflow:hidden";
        const fill = document.createElement("div");
        fill.style.cssText = `height:100%;width:${rate}%;background:${rate >= 30 ? "var(--green)" : "var(--teal)"};border-radius:3px;transition:width .5s`;
        bar.appendChild(fill);
        row.appendChild(top); row.appendChild(sub); row.appendChild(bar);
        grid.appendChild(row);
      });
      card.appendChild(grid);
    }
  } catch (e) {
    card.appendChild(Object.assign(document.createElement("div"), {
      textContent: "Error: " + e.message, style: "color:var(--red);font-size:12px;padding:10px"
    }));
  }

  const close = document.createElement("button");
  close.style.cssText = "width:100%;margin-top:16px;padding:9px;border-radius:9px;background:var(--bg0);border:1px solid var(--border);color:var(--text2);font-family:var(--font);font-size:12px;cursor:pointer";
  close.textContent = "Close";
  close.addEventListener("click", () => overlay.remove());
  card.appendChild(close);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

// ══════════════════════════════════════════════════════════════════
// ── OFFER COMPARISON TOOL ─────────────────────────────────────────
// Side-by-side comparison of multiple offers
// ══════════════════════════════════════════════════════════════════

async function showOfferComparison() {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;padding:20px;font-family:var(--font)";
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });

  const card = document.createElement("div");
  card.style.cssText = "background:var(--bg1);border:1px solid var(--border);border-radius:16px;width:100%;max-width:800px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:var(--shadow-lg)";

  const hdr = document.createElement("div");
  hdr.style.cssText = "padding:16px 20px;border-bottom:1px solid var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:space-between";
  const ht = document.createElement("div");
  ht.style.cssText = "font-size:14px;font-weight:600;color:var(--text0)";
  ht.textContent = "⚖ Offer Comparison";
  const hx = document.createElement("button");
  hx.style.cssText = "background:none;border:none;color:var(--text3);cursor:pointer;font-size:18px;padding:0";
  hx.textContent = "×";
  hx.addEventListener("click", () => overlay.remove());
  hdr.appendChild(ht); hdr.appendChild(hx);

  const body = document.createElement("div");
  body.style.cssText = "flex:1;overflow-y:auto;padding:18px 20px";

  // Load salary entries with "Negotiating" or "Pending" outcomes
  let offers = [];
  try {
    const all = await DB.get("nuur_salary", `?user_id=eq.${NUUR_USER_ID}&order=logged_at.desc&limit=20`);
    offers = (all || []).filter(s => s.offered && s.company);
  } catch (_) {}

  if (!offers.length) {
    const empty = document.createElement("div");
    empty.className = "dash-empty";
    const ei = document.createElement("div"); ei.className = "dash-empty-icon"; ei.textContent = "⚖";
    const et = document.createElement("div"); et.className = "dash-empty-title"; et.textContent = "No offers to compare yet";
    const es = document.createElement("div"); es.className = "dash-empty-sub"; es.textContent = "Log offers in the Salary Tracker first";
    empty.appendChild(ei); empty.appendChild(et); empty.appendChild(es);
    body.appendChild(empty);
  } else {
    // Comparison rows
    const FIELDS = [
      { label: "Base salary",    key: "offered",     format: v => v ? `$${Number(v).toLocaleString()}` : "—" },
      { label: "Your target",   key: "expected",    format: v => v ? `$${Number(v).toLocaleString()}` : "—" },
      { label: "Market rate",   key: "market_rate", format: v => v ? `$${Number(v).toLocaleString()}` : "—" },
      { label: "Benefits",      key: "benefits",    format: v => v || "Not listed" },
      { label: "Outcome",       key: "outcome",     format: v => v || "Pending" },
      { label: "Notes",         key: "notes",       format: v => v || "—" },
    ];

    const table = document.createElement("div");
    table.style.cssText = `display:grid;grid-template-columns:120px ${offers.slice(0,4).map(() => "1fr").join(" ")};gap:1px;background:var(--border);border:1px solid var(--border);border-radius:12px;overflow:hidden`;

    // Header row
    const empty = document.createElement("div");
    empty.style.cssText = "background:var(--bg0);padding:10px 12px";
    table.appendChild(empty);

    offers.slice(0, 4).forEach(o => {
      const hCell = document.createElement("div");
      hCell.style.cssText = "background:var(--navy,#0B2545);padding:10px 12px";
      const co = document.createElement("div");
      co.style.cssText = "font-size:12px;font-weight:600;color:#fff;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
      co.textContent = o.company;
      const role = document.createElement("div");
      role.style.cssText = "font-size:10px;color:rgba(255,255,255,0.5)";
      role.textContent = o.role || "";
      hCell.appendChild(co); hCell.appendChild(role);
      table.appendChild(hCell);
    });

    // Data rows
    FIELDS.forEach(field => {
      const labelCell = document.createElement("div");
      labelCell.style.cssText = "background:var(--bg0);padding:9px 12px;font-size:11px;font-weight:500;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;display:flex;align-items:center";
      labelCell.textContent = field.label;
      table.appendChild(labelCell);

      const values = offers.slice(0, 4).map(o => field.format(o[field.key]));
      const numericVals = offers.slice(0, 4).map(o => parseFloat(o[field.key]) || 0);
      const maxVal = Math.max(...numericVals);

      offers.slice(0, 4).forEach((o, idx) => {
        const cell = document.createElement("div");
        const isHighest = numericVals[idx] === maxVal && maxVal > 0;
        cell.style.cssText = `background:${isHighest ? "rgba(22,163,74,0.05)" : "var(--bg1)"};padding:9px 12px;font-size:12.5px;color:${isHighest ? "var(--green)" : "var(--text1)"};font-weight:${isHighest ? "600" : "400"};display:flex;align-items:center`;
        cell.textContent = values[idx];
        table.appendChild(cell);
      });
    });

    body.appendChild(table);

    // AI recommendation
    if (offers.length >= 2) {
      const aiBtn = document.createElement("button");
      aiBtn.style.cssText = "width:100%;margin-top:14px;padding:10px;border-radius:9px;background:var(--teal3);border:1px solid rgba(13,148,136,0.2);color:var(--teal);font-family:var(--font);font-size:12px;font-weight:500;cursor:pointer";
      aiBtn.textContent = "✦ Get AI recommendation";
      aiBtn.addEventListener("click", async () => {
        aiBtn.textContent = "Analyzing…"; aiBtn.disabled = true;
        const offerSummary = offers.slice(0,4).map(o =>
          `${o.company}: $${o.offered?.toLocaleString()} (target: $${o.expected?.toLocaleString()}, market: $${o.market_rate?.toLocaleString()}, benefits: ${o.benefits || "unknown"})`
        ).join("\n");
        try {
          const response = await callNuur({
            prompt: `Compare these job offers and give a recommendation for Mohamud Mohamed (Security+ certified, targeting GRC/SOC roles, Columbus OH):\n\n${offerSummary}\n\nConsider: total comp, growth potential, benefits value, role-to-goal alignment. Give a clear ranked recommendation with reasoning. No em dashes.`,
            model: MODEL.DEFAULT
          });
          const rec = document.createElement("div");
          rec.style.cssText = "margin-top:10px;padding:14px;background:var(--bg0);border:1px solid var(--border);border-radius:10px;font-size:12.5px;color:var(--text1);line-height:1.7";
          renderMarkdown(response, rec);
          aiBtn.replaceWith(rec);
        } catch (_) { aiBtn.textContent = "✦ Get AI recommendation"; aiBtn.disabled = false; }
      });
      body.appendChild(aiBtn);
    }
  }

  card.appendChild(hdr); card.appendChild(body);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

// ══════════════════════════════════════════════════════════════════
// ── INTERVIEW QUESTION BANK ───────────────────────────────────────
// Auto-saves prep questions after each interview prep session
// ══════════════════════════════════════════════════════════════════

async function saveQuestionsToBank(questions, company, role, interviewType) {
  if (!questions || !questions.length) return;
  try {
    await DB.insert("nuur_question_bank", {
      id: `qb_${Date.now()}`,
      user_id: NUUR_USER_ID,
      questions: JSON.stringify(questions),
      company,
      role,
      interview_type: interviewType,
      created_at: new Date().toISOString()
    });
  } catch (_) {}
}

async function showQuestionBank() {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;padding:20px;font-family:var(--font)";
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });

  const card = document.createElement("div");
  card.style.cssText = "background:var(--bg1);border:1px solid var(--border);border-radius:16px;width:100%;max-width:600px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:var(--shadow-lg)";

  const hdr = document.createElement("div");
  hdr.style.cssText = "padding:16px 20px;border-bottom:1px solid var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:space-between";
  const ht = document.createElement("div");
  ht.style.cssText = "font-size:14px;font-weight:600;color:var(--text0)";
  ht.textContent = "🎤 Interview Question Bank";
  const hx = document.createElement("button");
  hx.style.cssText = "background:none;border:none;color:var(--text3);cursor:pointer;font-size:18px;padding:0";
  hx.textContent = "×";
  hx.addEventListener("click", () => overlay.remove());
  hdr.appendChild(ht); hdr.appendChild(hx);

  // Search
  const searchRow = document.createElement("div");
  searchRow.style.cssText = "padding:10px 20px;border-bottom:1px solid var(--border3);flex-shrink:0";
  const searchInput = document.createElement("input");
  searchInput.className = "input";
  searchInput.placeholder = "Search questions…";
  searchInput.style.fontSize = "12.5px";
  searchRow.appendChild(searchInput);

  const body = document.createElement("div");
  body.style.cssText = "flex:1;overflow-y:auto;padding:14px 20px";

  let allQuestions = [];
  try {
    const data = await DB.get("nuur_question_bank",
      `?user_id=eq.${NUUR_USER_ID}&order=created_at.desc&limit=50`);
    data?.forEach(entry => {
      try {
        const qs = typeof entry.questions === "string"
          ? JSON.parse(entry.questions) : entry.questions || [];
        qs.forEach(q => allQuestions.push({ q, company: entry.company, role: entry.role, type: entry.interview_type }));
      } catch (_) {}
    });
  } catch (_) {}

  const renderQuestions = (filter = "") => {
    body.replaceChildren();
    const filtered = filter
      ? allQuestions.filter(q => q.q.toLowerCase().includes(filter.toLowerCase()))
      : allQuestions;

    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.style.cssText = "text-align:center;padding:30px;color:var(--text3);font-size:13px";
      empty.textContent = filter ? "No matching questions" : "Questions saved during interview prep will appear here automatically";
      body.appendChild(empty);
      return;
    }

    // Group by company
    const grouped = {};
    filtered.forEach(item => {
      const key = item.company || "General";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });

    Object.entries(grouped).forEach(([co, items]) => {
      const section = document.createElement("div");
      section.style.marginBottom = "16px";
      const sec = document.createElement("div");
      sec.style.cssText = "font-size:10px;font-weight:600;color:var(--text3);letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px";
      sec.textContent = co;
      section.appendChild(sec);
      items.forEach(item => {
        const qEl = document.createElement("div");
        qEl.style.cssText = "padding:9px 12px;background:var(--bg0);border:1px solid var(--border3);border-radius:8px;font-size:12.5px;color:var(--text1);line-height:1.6;margin-bottom:5px;cursor:pointer;transition:all .12s";
        qEl.textContent = item.q;
        qEl.addEventListener("mouseenter", () => { qEl.style.borderColor = "var(--teal)"; qEl.style.background = "var(--teal3)"; });
        qEl.addEventListener("mouseleave", () => { qEl.style.borderColor = "var(--border3)"; qEl.style.background = "var(--bg0)"; });
        qEl.addEventListener("click", () => {
          navigator.clipboard.writeText(item.q).catch(() => {});
          qEl.style.background = "var(--teal3)";
          setTimeout(() => { qEl.style.background = "var(--bg0)"; }, 800);
        });
        qEl.title = "Click to copy";
        section.appendChild(qEl);
      });
      body.appendChild(section);
    });
  };

  renderQuestions();
  searchInput.addEventListener("input", () => renderQuestions(searchInput.value));

  card.appendChild(hdr); card.appendChild(searchRow); card.appendChild(body);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  searchInput.focus();
}

// ══════════════════════════════════════════════════════════════════
// ── SMART FOLLOW-UP AUTO-SCHEDULING ──────────────────────────────
// Auto-calculates follow-up dates when application is logged
// ══════════════════════════════════════════════════════════════════

function calcFollowUpDate(appliedAt, platform, isReferral, status) {
  const base = new Date(appliedAt || Date.now());
  const DELAYS = {
    referral:  10, // referral-assisted
    LinkedIn:   7,
    Indeed:     7,
    Greenhouse: 7,
    Lever:      7,
    Workday:    8,
    Other:      6,
    interview:  3, // post-interview
    offer:      5, // after offer received
  };
  const days = isReferral ? DELAYS.referral
    : status === "interview" ? DELAYS.interview
    : status === "offer" ? DELAYS.offer
    : DELAYS[platform] || DELAYS.Other;

  const followUp = new Date(base.getTime() + days * 86400000);
  return followUp.toISOString().split("T")[0];
}

// Hook into application insertion to auto-set follow-up
const _origDBInsert = DB.insert.bind(DB);
DB.insert = async function(table, data, upsert) {
  const result = await _origDBInsert(table, data, upsert);
  if (table === "nuur_applications" && result && !data.follow_up_at) {
    const followUpDate = calcFollowUpDate(
      data.applied_at, data.platform, false, data.status
    );
    setTimeout(() => {
      DB.update("nuur_applications", `id=eq.${data.id}`, { follow_up_at: followUpDate })
        .catch(() => {});
    }, 500);
  }
  return result;
};

// ══════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════
// ── SKILL GAP RADAR (rebuilt after module-split loss) ────────────
// Scrapes top JD requirements via Claude → visual gap chart
// ══════════════════════════════════════════════════════════════════

async function showSkillGapRadar() {
  const existing = document.getElementById("nuur-skill-radar");
  if (existing) { existing.remove(); return; }

  const overlay = document.createElement("div");
  overlay.id = "nuur-skill-radar";
  overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;padding:20px;font-family:var(--font)";
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });

  const card = document.createElement("div");
  card.style.cssText = "background:var(--bg1);border:1px solid var(--border);border-radius:16px;width:100%;max-width:620px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:var(--shadow-lg)";

  const hdr = document.createElement("div");
  hdr.style.cssText = "padding:16px 20px;border-bottom:1px solid var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:space-between";
  const ht = document.createElement("div");
  ht.style.cssText = "font-size:14px;font-weight:600;color:var(--text0)";
  ht.textContent = "📡 Skill Gap Radar";
  const hx = document.createElement("button");
  hx.style.cssText = "background:none;border:none;color:var(--text3);cursor:pointer;font-size:18px;padding:0";
  hx.textContent = "×";
  hx.addEventListener("click", () => overlay.remove());
  hdr.appendChild(ht); hdr.appendChild(hx);

  const body = document.createElement("div");
  body.style.cssText = "flex:1;overflow-y:auto;padding:18px 20px";

  // Role selector
  const roleLbl = document.createElement("div");
  roleLbl.style.cssText = "font-size:11px;font-weight:500;color:var(--text2);margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em";
  roleLbl.textContent = "Target role";
  const roleSel = document.createElement("select");
  roleSel.className = "input";
  roleSel.style.cssText = "font-size:12.5px;margin-bottom:14px";
  ["Junior GRC Analyst","SOC Analyst Tier 1","IT Security Analyst",
   "Cybersecurity Analyst","Information Security Analyst",
   "Risk & Compliance Analyst"].forEach(r => {
    const o = document.createElement("option"); o.value = r; o.textContent = r;
    roleSel.appendChild(o);
  });

  const genBtn = document.createElement("button");
  genBtn.style.cssText = "width:100%;padding:10px;border-radius:10px;background:var(--teal);border:none;color:#fff;font-family:var(--font);font-size:12px;font-weight:500;cursor:pointer;margin-bottom:16px";
  genBtn.textContent = "📡 Analyze skill gap";

  body.appendChild(roleLbl);
  body.appendChild(roleSel);
  body.appendChild(genBtn);

  genBtn.addEventListener("click", async () => {
    genBtn.textContent = "Analyzing market…"; genBtn.disabled = true;
    const role = roleSel.value;
    const mySkills = ["CompTIA Security+","GRC","Risk Management","NIST CSF","ISO 27001",
      "Python","JavaScript","IT Support","Active Directory","Network Security",
      "Data Analysis","Windows","Supabase","React","SQL"];

    const prompt = `You are a cybersecurity career advisor. List the TOP 15 most required skills for "${role}" positions based on current job market data.

My current skills: ${mySkills.join(", ")}

Return ONLY a JSON array, no other text:
[{"skill":"NIST CSF","frequency":85,"ihave":true,"priority":"high"},...]

frequency = % of job postings requiring this skill (0-100)
ihave = true if in my skills list
priority = "high" (top 5), "medium" (6-10), "low" (11-15)
Exactly 15 skills. JSON only.`;

    try {
      const response = await callNuur({ prompt, model: MODEL.DEFAULT });
      const skills = JSON.parse(response.replace(/```json|```/g, "").trim());

      body.replaceChildren();
      body.appendChild(roleLbl);
      body.appendChild(roleSel);

      // Stats row
      const have = skills.filter(s => s.ihave).length;
      const pct = Math.round((have / skills.length) * 100);
      const statsRow = document.createElement("div");
      statsRow.style.cssText = "display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px";
      [
        { num:`${pct}%`, label:"Matched",    col: pct>=70?"var(--green)":pct>=50?"var(--teal)":"var(--gold)" },
        { num:have,       label:"I have",     col:"var(--green)" },
        { num:15-have,    label:"To develop", col:"var(--red)" },
      ].forEach(s => {
        const box = document.createElement("div");
        box.style.cssText = "background:var(--bg0);border-radius:10px;padding:10px;text-align:center;border:1px solid var(--border)";
        const n = document.createElement("div");
        n.style.cssText = `font-size:22px;font-weight:700;color:${s.col};letter-spacing:-.03em`;
        n.textContent = s.num;
        const l = document.createElement("div");
        l.style.cssText = "font-size:10px;color:var(--text3);margin-top:2px";
        l.textContent = s.label;
        box.appendChild(n); box.appendChild(l);
        statsRow.appendChild(box);
      });
      body.appendChild(statsRow);

      // Skill bars
      const sec = document.createElement("div");
      sec.style.cssText = "font-size:10px;font-weight:600;color:var(--text3);letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px";
      sec.textContent = `Top skills for ${role}`;
      body.appendChild(sec);

      [...skills].sort((a,b) => b.frequency - a.frequency).forEach(s => {
        const row = document.createElement("div");
        row.style.cssText = "display:flex;align-items:center;gap:10px;margin-bottom:8px";
        const icon = document.createElement("div");
        icon.style.cssText = `width:18px;height:18px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0;background:${s.ihave?"rgba(22,163,74,0.1)":"rgba(239,68,68,0.07)"};color:${s.ihave?"var(--green)":"var(--red)"}`;
        icon.textContent = s.ihave ? "✓" : "○";
        const name = document.createElement("div");
        name.style.cssText = `font-size:12px;color:${s.ihave?"var(--text1)":"var(--text2)"};width:170px;flex-shrink:0`;
        name.textContent = s.skill;
        const barWrap = document.createElement("div");
        barWrap.style.cssText = "flex:1;background:var(--bg0);border-radius:4px;height:7px;overflow:hidden";
        const bar = document.createElement("div");
        bar.style.cssText = `height:100%;border-radius:4px;width:${s.frequency}%;background:${s.ihave?"var(--green)":s.priority==="high"?"var(--red)":s.priority==="medium"?"var(--gold)":"var(--text4)"};transition:width .5s var(--ease)`;
        barWrap.appendChild(bar);
        const pctEl = document.createElement("div");
        pctEl.style.cssText = "font-size:10px;color:var(--text3);width:28px;text-align:right;flex-shrink:0";
        pctEl.textContent = `${s.frequency}%`;
        row.appendChild(icon); row.appendChild(name); row.appendChild(barWrap); row.appendChild(pctEl);
        body.appendChild(row);
      });

      // Priority gaps
      const gaps = skills.filter(s => !s.ihave && s.priority === "high");
      if (gaps.length) {
        const gt = document.createElement("div");
        gt.style.cssText = "font-size:10px;font-weight:600;color:var(--red);letter-spacing:.1em;text-transform:uppercase;margin:14px 0 8px";
        gt.textContent = "Priority gaps to close";
        body.appendChild(gt);
        gaps.forEach(g => {
          const item = document.createElement("div");
          item.style.cssText = "display:flex;align-items:center;gap:8px;padding:7px 10px;background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.12);border-radius:8px;margin-bottom:5px;font-size:12px;color:var(--text1)";
          item.innerHTML = `<span>⚡</span><span>${g.skill}</span>`;
          body.appendChild(item);
        });
      }
    } catch (e) {
      genBtn.textContent = "📡 Analyze skill gap"; genBtn.disabled = false;
      const err = document.createElement("div");
      err.style.cssText = "color:var(--red);font-size:12px;padding:10px";
      err.textContent = "Error: " + e.message;
      body.appendChild(err);
    }
  });

  card.appendChild(hdr); card.appendChild(body);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

// ── INJECT SKILL RADAR LINK INTO DASHBOARD ────────────────────────
// Called from loadDashboard() after dash-stats is in the DOM
function injectSkillRadarLink() {
  if (document.getElementById("nuur-skill-radar-link")) return;
  const statsEl = document.getElementById("dash-stats");
  if (!statsEl) return;
  const wrap = document.createElement("div");
  wrap.id = "nuur-skill-radar-link";
  wrap.style.cssText = "max-width:960px;margin:-6px auto 12px;display:flex;justify-content:flex-end;gap:12px";
  const btn = document.createElement("a");
  btn.href = "#";
  btn.style.cssText = "font-size:10px;color:var(--teal);text-decoration:none;font-weight:500;cursor:pointer";
  btn.textContent = "📡 Skill gap radar";
  btn.addEventListener("click", e => { e.preventDefault(); showSkillGapRadar(); });
  wrap.appendChild(btn);
  statsEl.insertAdjacentElement("afterend", wrap);
}

// ── GENERATE INTERVIEW DEBRIEF (forwarded from dashboard-features) ─
// dashboard-features.js calls this but it's defined here in career-coach
// (declaration hoisting doesn't work for async functions in separate files,
//  but since career-coach loads AFTER dashboard-features, the click handler
//  at runtime will find this function — it's a closure over the event, not a parse-time ref)

// ══════════════════════════════════════════════════════════════════
// ── INTERVIEW DEBRIEF (rebuilt after module-split loss) ───────────
// ══════════════════════════════════════════════════════════════════

async function generateInterviewDebrief(interviewId) {
  let interview = null;
  try {
    const data = await DB.get("nuur_interviews", `?id=eq.${interviewId}&user_id=eq.${NUUR_USER_ID}`);
    interview = data?.[0] || null;
  } catch (_) {}

  let meetingNotes = "";
  if (interview?.company) {
    try {
      const meetings = await DB.get("nuur_meetings",
        `?user_id=eq.${NUUR_USER_ID}&company=eq.${encodeURIComponent(interview.company)}&order=meeting_date.desc&limit=1`);
      meetingNotes = meetings?.[0]?.processed_notes || meetings?.[0]?.raw_notes || "";
    } catch (_) {}
  }

  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;padding:20px;font-family:var(--font)";
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });

  const card = document.createElement("div");
  card.style.cssText = "background:var(--bg1);border:1px solid var(--border);border-radius:16px;width:100%;max-width:580px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:var(--shadow-lg)";

  const hdr = document.createElement("div");
  hdr.style.cssText = "padding:16px 20px;border-bottom:1px solid var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:space-between";
  const ht = document.createElement("div");
  ht.style.cssText = "font-size:14px;font-weight:600;color:var(--text0)";
  ht.textContent = `🎤 Debrief — ${interview?.company || "Interview"}`;
  const hx = document.createElement("button");
  hx.style.cssText = "background:none;border:none;color:var(--text3);cursor:pointer;font-size:18px;padding:0";
  hx.textContent = "×";
  hx.addEventListener("click", () => overlay.remove());
  hdr.appendChild(ht); hdr.appendChild(hx);

  const body = document.createElement("div");
  body.style.cssText = "flex:1;overflow-y:auto;padding:18px 20px";

  const lbl = document.createElement("div");
  lbl.style.cssText = "font-size:11px;font-weight:500;color:var(--text2);margin-bottom:5px;text-transform:uppercase;letter-spacing:.06em";
  lbl.textContent = "Your interview notes";
  const notesTA = document.createElement("textarea");
  notesTA.className = "input";
  notesTA.rows = 5;
  notesTA.style.cssText = "resize:vertical;font-size:12.5px;margin-bottom:12px;line-height:1.6";
  notesTA.placeholder = "What was discussed, questions asked, your answers, anything that felt off or went well…";
  if (meetingNotes) notesTA.value = meetingNotes;

  const genBtn = document.createElement("button");
  genBtn.style.cssText = "width:100%;padding:10px;border-radius:10px;background:var(--teal);border:none;color:#fff;font-family:var(--font);font-size:12px;font-weight:500;cursor:pointer";
  genBtn.textContent = "Generate debrief + thank-you note";

  body.appendChild(lbl); body.appendChild(notesTA); body.appendChild(genBtn);

  genBtn.addEventListener("click", async () => {
    const notes = notesTA.value.trim();
    if (!notes) { notesTA.focus(); return; }
    genBtn.textContent = "Analyzing…"; genBtn.disabled = true;

    const prompt = `Career coach helping debrief after a job interview.

Company: ${interview?.company || "Unknown"}
Role: ${interview?.role || "Unknown"}
Round: ${interview?.round || 1} — ${interview?.interview_type || "General"}
Interviewer: ${interview?.interviewer || "Unknown"}

Notes:
${notes}

Give:
WHAT WENT WELL:
- [specifics]

WEAK MOMENTS:
- [honest assessment]

IMPROVE FOR NEXT ROUND:
- [specific prep]

QUESTIONS I SHOULD HAVE ASKED:
- [2-3 smart ones]

THANK-YOU EMAIL:
Subject: [subject]
[3-4 sentences referencing something specific from the conversation]

PROBABILITY:
[Honest gut check on how this went]

No em dashes, no AI phrases.`;

    try {
      const response = await callNuur({ prompt, model: MODEL.DEFAULT });
      body.replaceChildren();
      const result = document.createElement("div");
      result.style.cssText = "font-size:12.5px;color:var(--text1);line-height:1.7";
      renderMarkdown(response, result);
      body.appendChild(result);
      const copyBtn = document.createElement("button");
      copyBtn.style.cssText = "width:100%;margin-top:12px;padding:9px;border-radius:9px;background:var(--teal3);border:1px solid rgba(13,148,136,0.2);color:var(--teal);font-family:var(--font);font-size:12px;font-weight:500;cursor:pointer";
      copyBtn.textContent = "📋 Copy debrief";
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(response).catch(() => {});
        copyBtn.textContent = "Copied!";
        setTimeout(() => { copyBtn.textContent = "📋 Copy debrief"; }, 2000);
      });
      body.appendChild(copyBtn);
      if (interview?.id) {
        DB.update("nuur_interviews", `id=eq.${interview.id}`, { notes: notes + "\n\n[DEBRIEF]" }).catch(() => {});
      }
    } catch (_) {
      genBtn.textContent = "Generate debrief + thank-you note";
      genBtn.disabled = false;
    }
  });

  card.appendChild(hdr); card.appendChild(body);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}
