// ── NUUR ACADEMICS ────────────────────────────────────────────────
// Shared design tokens aligned with NUR system
const A = {
  card: "background:#fff;border:1.5px solid rgba(60,40,30,0.10);border-radius:12px;box-shadow:0 1px 0 rgba(0,0,0,0.02)",
  cardHover: "border-color:rgba(99,102,241,0.25);box-shadow:0 4px 16px -4px rgba(99,102,241,0.12)",
  input: "width:100%;background:#fff;border:1px solid rgba(60,40,30,0.12);border-radius:10px;padding:11px 14px;font-size:13px;color:var(--text0);font-family:var(--font);outline:none;line-height:1.6;box-sizing:border-box;transition:border-color .12s,box-shadow .12s",
  inputFocus: "border-color:rgba(99,102,241,0.5);box-shadow:0 0 0 3px rgba(99,102,241,0.07)",
  btn: "background:#6366F1;border:none;border-radius:8px;padding:9px 18px;font-size:12.5px;font-weight:500;color:#fff;cursor:pointer;transition:all .12s;white-space:nowrap;font-family:var(--font)",
  btnGhost: "background:transparent;border:1px solid rgba(60,40,30,0.12);border-radius:8px;padding:9px 18px;font-size:12.5px;font-weight:500;color:var(--text2);cursor:pointer;transition:all .12s;white-space:nowrap;font-family:var(--font)",
  eyebrow: "font-family:'Geist Mono','DM Mono',monospace;font-size:10px;font-weight:600;letter-spacing:.10em;text-transform:uppercase;color:var(--text3)",
};

// ── COURSE TRACKER ───────────────────────────────────────────────
async function loadCourseTracker() {
  const el = document.getElementById("acad-courses");
  if (!el) return;

  el.innerHTML = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:20px">
    <div style="${A.eyebrow};flex:1">Courses</div>
    <button id="acad-add-course-btn" style="${A.btnGhost};padding:6px 14px;font-size:12px">+ Course</button>
    <button id="acad-add-assign-btn" style="${A.btn};padding:6px 14px;font-size:12px">+ Assignment</button>
  </div>
  <div id="acad-courses-body"></div>`;

  document.getElementById("acad-add-course-btn")?.addEventListener("click", () => showAddCourse());
  document.getElementById("acad-add-assign-btn")?.addEventListener("click", async () => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/nuur_courses?user_id=eq.${NUUR_USER_ID}`, { headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` } });
    showAddAssignment(await r.json());
  });

  const body = document.getElementById("acad-courses-body");
  if (!body) return;

  try {
    const [cRes, aRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/nuur_courses?user_id=eq.${NUUR_USER_ID}&order=created_at.desc`, { headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` } }),
      fetch(`${SUPABASE_URL}/rest/v1/nuur_assignments?user_id=eq.${NUUR_USER_ID}&order=due_date.asc&limit=30`, { headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` } })
    ]);
    const courses = await cRes.json();
    const assignments = await aRes.json();

    if (!Array.isArray(courses) || !courses.length) {
      body.appendChild(emptyState("🎓", "No courses yet", "Add your first course to start tracking grades and assignments"));
      return;
    }

    // Stats strip
    const pending = (assignments || []).filter(a => !a.submitted).length;
    const overdue = (assignments || []).filter(a => !a.submitted && new Date(a.due_date) < new Date()).length;
    const gpa = calcGPA(courses);
    body.innerHTML = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:24px">
      ${[["Pending",pending,"#6366F1"],["Overdue",overdue,"#f87171"],["GPA",gpa||"—","#22A06B"]].map(([l,v,color])=>`
      <div style="${A.card};padding:14px;text-align:center">
        <div style="font-family:'Instrument Serif',Georgia,serif;font-style:italic;font-size:26px;color:${color};line-height:1">${v}</div>
        <div style="${A.eyebrow};margin-top:4px">${l}</div>
      </div>`).join("")}
    </div>`;

    // Upcoming assignments
    const upcoming = (assignments || []).filter(a => !a.submitted).slice(0, 6);
    if (upcoming.length) {
      const sec = makeSec("Upcoming", body);
      upcoming.forEach(a => {
        const due = new Date(a.due_date);
        const days = Math.ceil((due - new Date()) / 86400000);
        const isOverdue = days < 0;
        const urgentColor = isOverdue ? "#f87171" : days <= 2 ? "#f59e0b" : "var(--text3)";
        const row = document.createElement("div");
        row.style.cssText = `${A.card};padding:11px 14px;margin-bottom:7px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:all .12s`;
        row.onmouseenter = () => row.style.cssText = `${A.card};${A.cardHover};padding:11px 14px;margin-bottom:7px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:all .12s`;
        row.onmouseleave = () => row.style.cssText = `${A.card};padding:11px 14px;margin-bottom:7px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:all .12s`;
        const chk = document.createElement("div");
        chk.style.cssText = "width:18px;height:18px;border-radius:50%;border:1.5px solid rgba(60,40,30,0.18);flex-shrink:0;cursor:pointer;transition:all .12s;display:flex;align-items:center;justify-content:center";
        chk.addEventListener("click", async (e) => {
          e.stopPropagation();
          chk.style.background = "#6366F1"; chk.style.borderColor = "#6366F1";
          chk.innerHTML = `<svg width="9" height="9" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`;
          await fetch(`${SUPABASE_URL}/rest/v1/nuur_assignments?id=eq.${a.id}&user_id=eq.${NUUR_USER_ID}`, {
            method: "PATCH", headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ submitted: true, submitted_at: new Date().toISOString() })
          });
          row.style.opacity = "0"; row.style.transform = "translateX(-6px)"; row.style.transition = "all .2s";
          setTimeout(() => row.remove(), 220);
        });
        row.appendChild(chk);
        row.innerHTML += `<div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:500;color:var(--text0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(a.title)}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:2px">${escapeHtml(a.course_name||"")}${a.assignment_type ? " · "+escapeHtml(a.assignment_type) : ""}</div>
        </div>
        <div style="font-size:11px;font-weight:600;color:${urgentColor};flex-shrink:0;font-family:'Geist Mono',monospace">
          ${isOverdue ? "Overdue" : days===0 ? "Today" : days===1 ? "Tomorrow" : days+"d"}
        </div>`;
        row.prepend(chk);
        sec.appendChild(row);
      });
    }

    // Courses
    const csec = makeSec("Courses & grades", body);
    courses.forEach(c => {
      const gc = gradeToColor(c.current_grade);
      const card = document.createElement("div");
      card.style.cssText = `${A.card};padding:12px 16px;margin-bottom:7px;display:flex;align-items:center;gap:12px`;
      const bar = document.createElement("div");
      bar.style.cssText = `width:3px;height:36px;border-radius:2px;background:${gc};flex-shrink:0`;
      card.appendChild(bar);
      card.innerHTML += `<div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500;color:var(--text0)">${escapeHtml(c.name)}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px">${escapeHtml(c.instructor||"")}${c.credits?" · "+c.credits+" cr":""}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-family:'Instrument Serif',Georgia,serif;font-style:italic;font-size:22px;color:${gc};line-height:1">${c.current_grade||"—"}</div>
        <div style="${A.eyebrow};font-size:9px">${c.term||""}</div>
      </div>`;
      card.prepend(bar);
      csec.appendChild(card);
    });

  } catch (e) {
    body.appendChild(emptyState("⚠️", "Could not load courses", e.message));
  }
}

function calcGPA(courses) {
  const pts = {"A+":4.0,"A":4.0,"A-":3.7,"B+":3.3,"B":3.0,"B-":2.7,"C+":2.3,"C":2.0,"C-":1.7,"D":1.0,"F":0};
  let t=0, c=0;
  (courses||[]).forEach(x => { const p=pts[x.current_grade]; if(p!==undefined&&x.credits){t+=p*x.credits;c+=Number(x.credits);} });
  return c>0?(t/c).toFixed(2):null;
}
function gradeToColor(g) {
  if(!g) return "var(--text4)";
  if(g.startsWith("A")) return "#6366F1";
  if(g.startsWith("B")) return "#22A06B";
  if(g.startsWith("C")) return "#f59e0b";
  return "#f87171";
}

function showAddCourse() {
  const modal = makeModal("Add course");
  const fields = [
    {id:"c-name",label:"Course name",ph:"Business Analytics Capstone"},
    {id:"c-inst",label:"Instructor",ph:"Dr. Smith"},
    {id:"c-cred",label:"Credits",ph:"3",type:"number"},
    {id:"c-term",label:"Term",ph:"Spring 2026"},
    {id:"c-grade",label:"Current grade",ph:"A, B+, etc."},
  ];
  modal.body.appendChild(makeForm(fields));
  const btn = makeBtn("Save course", async () => {
    const v = getVals(fields);
    if (!v["c-name"]) return;
    await fetch(`${SUPABASE_URL}/rest/v1/nuur_courses`, {
      method:"POST", headers:{"apikey":ANON_KEY,"Authorization":`Bearer ${ANON_KEY}`,"Content-Type":"application/json","Prefer":"return=minimal"},
      body:JSON.stringify({user_id:NUUR_USER_ID,name:v["c-name"],instructor:v["c-inst"],credits:Number(v["c-cred"])||3,term:v["c-term"],current_grade:v["c-grade"]})
    });
    modal.el.remove(); loadCourseTracker();
  });
  modal.body.appendChild(btn);
  document.body.appendChild(modal.el);
}

async function showAddAssignment(courses) {
  const modal = makeModal("Add assignment");
  const opts = (Array.isArray(courses)?courses:[]).map(c=>`<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join("");
  const fields = [
    {id:"a-title",label:"Title",ph:"Problem Set 3"},
    {id:"a-course",label:"Course",type:"select",opts},
    {id:"a-type",label:"Type",ph:"Essay, Quiz, Project..."},
    {id:"a-due",label:"Due date",type:"datetime-local"},
    {id:"a-notes",label:"Notes",ph:"Optional"},
  ];
  modal.body.appendChild(makeForm(fields));
  const btn = makeBtn("Save assignment", async () => {
    const v = getVals(fields);
    if (!v["a-title"]||!v["a-due"]) return;
    await fetch(`${SUPABASE_URL}/rest/v1/nuur_assignments`, {
      method:"POST", headers:{"apikey":ANON_KEY,"Authorization":`Bearer ${ANON_KEY}`,"Content-Type":"application/json","Prefer":"return=minimal"},
      body:JSON.stringify({user_id:NUUR_USER_ID,title:v["a-title"],course_name:v["a-course"],assignment_type:v["a-type"],due_date:v["a-due"],notes:v["a-notes"],submitted:false})
    });
    modal.el.remove(); loadCourseTracker();
  });
  modal.body.appendChild(btn);
  document.body.appendChild(modal.el);
}

// ── FLASHCARD SYSTEM ─────────────────────────────────────────────
let flashcardDecks = [];
let currentCardIdx = 0;

async function loadFlashcards() {
  const el = document.getElementById("acad-flashcards");
  if (!el) return;

  el.innerHTML = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:20px">
    <div style="${A.eyebrow};flex:1">Flashcard decks</div>
    <button id="acad-gen-cards-btn" style="${A.btn};padding:6px 14px;font-size:12px">✦ Generate from notes</button>
    <button id="acad-new-deck-btn" style="${A.btnGhost};padding:6px 14px;font-size:12px">+ New deck</button>
  </div>
  <div id="acad-decks-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px"></div>`;

  document.getElementById("acad-gen-cards-btn")?.addEventListener("click", showGenerateCards);
  document.getElementById("acad-new-deck-btn")?.addEventListener("click", showNewDeck);

  const grid = document.getElementById("acad-decks-grid");
  if (!grid) return;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/nuur_flashcard_decks?user_id=eq.${NUUR_USER_ID}&order=created_at.desc`, { headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` } });
    flashcardDecks = await res.json();

    if (!Array.isArray(flashcardDecks) || !flashcardDecks.length) {
      grid.appendChild(emptyState("🃏", "No decks yet", "Generate cards from your notes or create a deck manually"));
      return;
    }

    flashcardDecks.forEach(deck => {
      const card = document.createElement("div");
      card.style.cssText = `${A.card};padding:18px 16px;cursor:pointer;transition:all .12s`;
      card.onmouseenter = () => card.style.cssText = `${A.card};${A.cardHover};padding:18px 16px;cursor:pointer;transition:all .12s`;
      card.onmouseleave = () => card.style.cssText = `${A.card};padding:18px 16px;cursor:pointer;transition:all .12s`;
      card.innerHTML = `<div style="font-size:28px;margin-bottom:10px">${deck.emoji||"🃏"}</div>
        <div style="font-size:13px;font-weight:500;color:var(--text0);margin-bottom:4px">${escapeHtml(deck.name)}</div>
        <div style="font-size:11px;color:var(--text3)">${deck.card_count||0} cards</div>
        ${deck.subject?`<div style="${A.eyebrow};margin-top:8px;font-size:9px;color:#6366F1">${escapeHtml(deck.subject)}</div>`:""}`;
      card.addEventListener("click", () => openDeckStudy(deck));
      grid.appendChild(card);
    });
  } catch(e) {
    grid.appendChild(emptyState("⚠️", "Error loading decks", e.message));
  }
}

async function openDeckStudy(deck) {
  const el = document.getElementById("acad-flashcards");
  if (!el) return;
  currentCardIdx = 0;
  el.replaceChildren();

  const res = await fetch(`${SUPABASE_URL}/rest/v1/nuur_flashcards?deck_id=eq.${deck.id}&user_id=eq.${NUUR_USER_ID}&order=created_at.asc`, { headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` } });
  const cards = await res.json();

  if (!cards?.length) {
    const backBtn = makeBtn("← Back to decks", loadFlashcards, true);
    el.appendChild(backBtn);
    el.appendChild(emptyState("🃏", "No cards in this deck", "Add cards manually or generate from your notes"));
    return;
  }

  function render(idx) {
    el.replaceChildren();
    const card = cards[idx];
    const total = cards.length;
    let flipped = false;

    // Header
    const hdr = document.createElement("div");
    hdr.style.cssText = "display:flex;align-items:center;gap:10px;margin-bottom:16px";
    const back = document.createElement("button");
    back.style.cssText = "background:transparent;border:none;color:var(--text3);cursor:pointer;font-size:18px;padding:0;line-height:1;transition:color .12s";
    back.textContent = "←";
    back.addEventListener("click", loadFlashcards);
    const title = document.createElement("div");
    title.style.cssText = "font-family:'Instrument Serif',Georgia,serif;font-style:italic;font-size:18px;color:var(--text0);flex:1;letter-spacing:-.01em";
    title.textContent = deck.name;
    const counter = document.createElement("div");
    counter.style.cssText = `${A.eyebrow};font-size:10px`;
    counter.textContent = `${idx+1} / ${total}`;
    hdr.appendChild(back); hdr.appendChild(title); hdr.appendChild(counter);
    el.appendChild(hdr);

    // Progress
    const prog = document.createElement("div");
    prog.style.cssText = "height:3px;background:rgba(60,40,30,0.08);border-radius:2px;margin-bottom:24px;overflow:hidden";
    const fill = document.createElement("div");
    fill.style.cssText = `height:100%;width:${((idx+1)/total*100).toFixed(0)}%;background:#6366F1;border-radius:2px;transition:width .4s`;
    prog.appendChild(fill); el.appendChild(prog);

    // Card
    const cardWrap = document.createElement("div");
    cardWrap.style.cssText = "cursor:pointer;margin-bottom:20px";
    const inner = document.createElement("div");
    inner.style.cssText = "perspective:1200px";
    const face = document.createElement("div");
    face.style.cssText = `${A.card};min-height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;text-align:center;transition:all .35s`;

    const qLabel = document.createElement("div");
    qLabel.style.cssText = `${A.eyebrow};margin-bottom:14px`;
    qLabel.textContent = "Question";
    const qText = document.createElement("div");
    qText.style.cssText = "font-size:16px;font-weight:500;color:var(--text0);line-height:1.5";
    qText.textContent = card.front;
    const flipHint = document.createElement("div");
    flipHint.style.cssText = "font-size:11px;color:var(--text4);margin-top:16px";
    flipHint.textContent = "Tap to reveal answer";

    face.appendChild(qLabel); face.appendChild(qText); face.appendChild(flipHint);
    inner.appendChild(face); cardWrap.appendChild(inner);

    cardWrap.addEventListener("click", () => {
      flipped = !flipped;
      if (flipped) {
        face.style.cssText = `background:rgba(99,102,241,0.06);border:1.5px solid rgba(99,102,241,0.20);border-radius:12px;min-height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;text-align:center`;
        qLabel.textContent = "Answer";
        qLabel.style.color = "#6366F1";
        qText.textContent = card.back;
        flipHint.textContent = "Click next to continue";
      } else {
        face.style.cssText = `${A.card};min-height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;text-align:center`;
        qLabel.textContent = "Question"; qLabel.style.color = "";
        qText.textContent = card.front;
        flipHint.textContent = "Tap to reveal answer";
      }
    });
    el.appendChild(cardWrap);

    // Nav
    const nav = document.createElement("div");
    nav.style.cssText = "display:flex;gap:8px";
    const prevBtn = makeBtn("← Prev", () => { if(idx>0) render(idx-1); }, true);
    prevBtn.style.flex = "1"; prevBtn.style.opacity = idx===0?"0.3":"1";
    const nextBtn = makeBtn(idx<total-1 ? "Next →" : "✓ Finish", () => {
      if(idx<total-1) render(idx+1); else loadFlashcards();
    });
    nextBtn.style.flex = "1";
    nav.appendChild(prevBtn); nav.appendChild(nextBtn);
    el.appendChild(nav);
  }
  render(0);
}

function showGenerateCards() {
  const modal = makeModal("Generate flashcards from notes");
  const ta = document.createElement("textarea");
  ta.placeholder = "Paste lecture notes, readings, or any text. Nuur extracts key concepts and builds question/answer pairs.";
  ta.style.cssText = `${A.input};min-height:140px;resize:vertical;margin-bottom:8px`;
  const sub = document.createElement("input");
  sub.placeholder = "Subject (e.g. Financial Analysis)";
  sub.style.cssText = A.input;
  modal.body.appendChild(ta); modal.body.appendChild(sub);
  const btn = makeBtn("✦ Generate cards", async () => {
    const text = ta.value.trim();
    const subject = sub.value.trim() || "General";
    if (!text) return;
    btn.textContent = "Generating..."; btn.style.opacity = "0.6";
    try {
      const res = await fetch(PROXY, {
        method:"POST", headers:{"Content-Type":"application/json","apikey":ANON_KEY,"Authorization":`Bearer ${ANON_KEY}`},
        body:JSON.stringify({ model:"sonnet", system:"Extract 8-15 key concept pairs from the text. Return ONLY a JSON array of {front, back} objects. No markdown, no preamble.", prompt:`Subject: ${subject}\n\n${text.substring(0,4000)}` })
      });
      const data = await res.json();
      const items = JSON.parse((data.content?.[0]?.text||"[]").replace(/```json|```/g,"").trim());
      const deckRes = await fetch(`${SUPABASE_URL}/rest/v1/nuur_flashcard_decks`, {
        method:"POST", headers:{"apikey":ANON_KEY,"Authorization":`Bearer ${ANON_KEY}`,"Content-Type":"application/json","Prefer":"return=representation"},
        body:JSON.stringify({user_id:NUUR_USER_ID,name:subject,subject,card_count:items.length,emoji:"✦"})
      });
      const [newDeck] = await deckRes.json();
      for (const c of items) {
        await fetch(`${SUPABASE_URL}/rest/v1/nuur_flashcards`, {
          method:"POST", headers:{"apikey":ANON_KEY,"Authorization":`Bearer ${ANON_KEY}`,"Content-Type":"application/json","Prefer":"return=minimal"},
          body:JSON.stringify({user_id:NUUR_USER_ID,deck_id:newDeck.id,front:c.front,back:c.back})
        });
      }
      modal.el.remove(); await loadFlashcards(); openDeckStudy(newDeck);
    } catch(e) { btn.textContent = "Error: " + e.message; btn.style.opacity = "1"; }
  });
  btn.style.marginTop = "10px";
  modal.body.appendChild(btn);
  document.body.appendChild(modal.el);
}

function showNewDeck() {
  const modal = makeModal("New deck");
  const fields = [{id:"d-name",label:"Deck name",ph:"Midterm prep"},{id:"d-sub",label:"Subject",ph:"Statistics, Finance..."}];
  modal.body.appendChild(makeForm(fields));
  const btn = makeBtn("Create deck", async () => {
    const v = getVals(fields);
    if (!v["d-name"]) return;
    await fetch(`${SUPABASE_URL}/rest/v1/nuur_flashcard_decks`, {
      method:"POST", headers:{"apikey":ANON_KEY,"Authorization":`Bearer ${ANON_KEY}`,"Content-Type":"application/json","Prefer":"return=minimal"},
      body:JSON.stringify({user_id:NUUR_USER_ID,name:v["d-name"],subject:v["d-sub"],card_count:0,emoji:"🃏"})
    });
    modal.el.remove(); loadFlashcards();
  });
  modal.body.appendChild(btn);
  document.body.appendChild(modal.el);
}

// ── RESEARCH ASSISTANT ───────────────────────────────────────────
async function loadResearchAssistant() {
  const el = document.getElementById("acad-research");
  if (!el) return;
  el.replaceChildren();

  const actions = [
    { id:"summarize", icon:"📄", label:"Summarize paper",    system:"Summarize this academic paper clearly. Include: main argument, methodology, key findings, and limitations. Use bullet points. No em dashes.", ph:"Paste abstract or full paper text..." },
    { id:"cite",      icon:"📚", label:"Generate citations", system:"You are a citation specialist. Work only with the text provided — do not attempt to browse URLs or the internet. Format the source into APA 7th edition and MLA 9th edition citations using the details given. If fields are missing, note them clearly and provide the best possible citation from available info.", ph:"Paste source details: author, title, year, journal, publisher, DOI..." },
    { id:"explain",   icon:"🔍", label:"Explain concept",    system:"Explain this concept clearly to a graduate student. Start with a plain-English definition, then give an analogy, then a concrete practical example. Be specific.", ph:"Type or paste the concept you want explained..." },
    { id:"lit",       icon:"📝", label:"Literature review",  system:"Help write a literature review synthesis from these sources. Identify themes, note agreements and conflicts, highlight research gaps.", ph:"Paste multiple abstracts or summaries..." },
  ];

  // Mode selector
  let active = actions[0];
  const modeBar = document.createElement("div");
  modeBar.style.cssText = "display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap";

  const textarea = document.createElement("textarea");
  textarea.placeholder = active.ph;
  textarea.style.cssText = `${A.input};min-height:130px;resize:vertical;margin-bottom:10px`;
  textarea.addEventListener("focus", () => { textarea.style.borderColor = "rgba(99,102,241,0.5)"; textarea.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.07)"; });
  textarea.addEventListener("blur", () => { textarea.style.borderColor = "rgba(60,40,30,0.12)"; textarea.style.boxShadow = "none"; });

  const resultEl = document.createElement("div");
  resultEl.style.cssText = "display:none;margin-top:14px;background:#fff;border:1.5px solid rgba(60,40,30,0.10);border-radius:12px;padding:18px;font-size:13px;color:var(--text1);line-height:1.75;max-height:420px;overflow-y:auto;box-shadow:0 1px 0 rgba(0,0,0,.02)";

  actions.forEach(a => {
    const btn = document.createElement("button");
    const isAct = a.id === active.id;
    btn.dataset.actionId = a.id;
    btn.style.cssText = `display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;border:1px solid ${isAct?"rgba(99,102,241,0.4)":"rgba(60,40,30,0.10)"};background:${isAct?"rgba(99,102,241,0.08)":"transparent"};font-size:12px;font-weight:${isAct?"600":"400"};color:${isAct?"#4F46E5":"var(--text2)"};cursor:pointer;transition:all .12s;font-family:var(--font)`;
    btn.innerHTML = `<span>${a.icon}</span> ${a.label}`;
    btn.addEventListener("click", () => {
      active = a;
      textarea.placeholder = a.ph;
      textarea.focus();
      modeBar.querySelectorAll("button").forEach(b => {
        const isCur = b.dataset.actionId === a.id;
        b.style.borderColor = isCur ? "rgba(99,102,241,0.4)" : "rgba(60,40,30,0.10)";
        b.style.background = isCur ? "rgba(99,102,241,0.08)" : "transparent";
        b.style.color = isCur ? "#4F46E5" : "var(--text2)";
        b.style.fontWeight = isCur ? "600" : "400";
      });
    });
    modeBar.appendChild(btn);
  });

  el.appendChild(modeBar);
  el.appendChild(textarea);

  // Citation style selector — shown only when cite mode is active
  const citeStyleRow = document.createElement("div");
  citeStyleRow.style.cssText = "display:none;margin-bottom:10px";
  const citeStyles = ["APA 7th", "MLA 9th", "Chicago 17th", "Harvard", "IEEE", "Vancouver"];
  let activeCiteStyle = "APA 7th";
  const citeStyleSeg = document.createElement("div");
  citeStyleSeg.style.cssText = "display:flex;flex-wrap:wrap;gap:5px";
  citeStyles.forEach(style => {
    const btn = document.createElement("button");
    const isAct = style === activeCiteStyle;
    btn.style.cssText = `padding:5px 11px;border-radius:7px;border:1px solid ${isAct?"rgba(99,102,241,0.4)":"rgba(60,40,30,0.12)"};background:${isAct?"rgba(99,102,241,0.08)":"transparent"};font-size:11px;font-weight:${isAct?"600":"400"};color:${isAct?"#4F46E5":"var(--text2)"};cursor:pointer;font-family:var(--font);transition:all .1s`;
    btn.textContent = style;
    btn.addEventListener("click", () => {
      activeCiteStyle = style;
      citeStyleSeg.querySelectorAll("button").forEach(b => {
        const cur = b.textContent === style;
        b.style.borderColor = cur ? "rgba(99,102,241,0.4)" : "rgba(60,40,30,0.12)";
        b.style.background = cur ? "rgba(99,102,241,0.08)" : "transparent";
        b.style.color = cur ? "#4F46E5" : "var(--text2)";
        b.style.fontWeight = cur ? "600" : "400";
      });
    });
    citeStyleSeg.appendChild(btn);
  });
  const citeLabel = document.createElement("div");
  citeLabel.style.cssText = "font-family:'Geist Mono','DM Mono',monospace;font-size:9px;font-weight:600;letter-spacing:.10em;text-transform:uppercase;color:var(--text3);margin-bottom:7px";
  citeLabel.textContent = "Citation style";
  citeStyleRow.appendChild(citeLabel);
  citeStyleRow.appendChild(citeStyleSeg);
  el.appendChild(citeStyleRow);

  // Show/hide citation style selector based on active mode
  modeBar.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      citeStyleRow.style.display = btn.dataset.actionId === "cite" ? "block" : "none";
    });
  });

  const askBtn = makeBtn("✦ Ask Nuur", async () => {
    const text = textarea.value.trim();
    if (!text) return;
    askBtn.textContent = "Thinking..."; askBtn.style.opacity = "0.6";
    resultEl.style.display = "block";
    resultEl.innerHTML = "";
    const loader = document.createElement("div");
    loader.style.cssText = "font-size:12px;color:var(--text3);font-style:italic";
    loader.textContent = "Analyzing...";
    resultEl.appendChild(loader);

    try {
      const res = await fetch(PROXY, {
        method:"POST", headers:{"Content-Type":"application/json","apikey":ANON_KEY,"Authorization":`Bearer ${ANON_KEY}`},
        body:JSON.stringify({ model:"sonnet", system: active.id === "cite" ? `You are a citation specialist. Work only with the text provided. Format the source in ${activeCiteStyle} style. Do not attempt to browse URLs. If fields are missing, note them and provide the best citation possible.` : active.system, prompt:text.substring(0,5000), web_search: active.id === "lit" })
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "No response.";
      resultEl.replaceChildren();
      reply.split("\n").forEach(line => {
        if (!line.trim()) return;
        const p = document.createElement("p");
        p.style.cssText = "margin:0 0 10px;line-height:1.75";
        if (line.startsWith("**") || line.startsWith("## ") || line.startsWith("### ")) {
          p.style.fontWeight = "600"; p.style.color = "var(--text0)";
          p.textContent = line.replace(/^#{1,3}\s|^\*\*|\*\*$/g,"");
        } else if (line.startsWith("- ") || line.startsWith("• ")) {
          p.style.paddingLeft = "16px";
          p.textContent = line.replace(/^[-•]\s/,"");
          p.style.position = "relative";
          p.innerHTML = `<span style="position:absolute;left:0;color:#6366F1">·</span> ` + escapeHtml(line.replace(/^[-•]\s/,""));
        } else {
          p.textContent = line;
        }
        resultEl.appendChild(p);
      });
      const cpBtn = document.createElement("button");
      cpBtn.style.cssText = `${A.btnGhost};padding:5px 12px;font-size:11px;margin-top:4px`;
      cpBtn.textContent = "Copy";
      cpBtn.addEventListener("click", () => { navigator.clipboard.writeText(reply); cpBtn.textContent = "Copied!"; setTimeout(()=>cpBtn.textContent="Copy",2000); });
      resultEl.appendChild(cpBtn);
    } catch(e) { resultEl.textContent = "Error: " + e.message; }
    askBtn.textContent = "✦ Ask Nuur"; askBtn.style.opacity = "1";
  });

  el.appendChild(askBtn);
  el.appendChild(resultEl);
}

// ── WRITING HELPER ───────────────────────────────────────────────
async function loadWritingHelper() {
  const el = document.getElementById("acad-writing");
  if (!el) return;
  el.replaceChildren();

  const tools = [
    { id:"essay",     icon:"📄", label:"Essay draft",        desc:"Outline + first draft",  system:"You are an academic writing assistant. Write clearly and critically with an academic tone. Use APA style. No em dashes.", prompt:"Help me write an academic essay. First give a structured outline, then write the introduction and first two body paragraphs:" },
    { id:"grammar",   icon:"✏️", label:"Grammar & style",    desc:"Fix and improve writing", system:"You are a copy editor. Fix grammar, improve clarity and flow, elevate academic tone. Show the revised version, then note what changed. No em dashes.", prompt:"Improve this academic writing:" },
    { id:"cite",      icon:"📚", label:"APA / MLA citations", desc:"Format any source",      system:"You are a citation specialist. Work only with the text provided — do not attempt to browse URLs or the internet. Format the source into APA 7th and MLA 9th edition citations using the details given. If fields are missing, note what is needed and provide the best citation possible from available info.", prompt:"Format this source into APA 7th and MLA 9th edition citations using only the details below:" },
    { id:"paraphrase",icon:"🔄", label:"Paraphrase",          desc:"Rewrite, keep meaning",  system:"Paraphrase the text: preserve meaning but use entirely different phrasing and structure. Maintain academic tone. No em dashes.", prompt:"Paraphrase this text for academic use:" },
  ];

  let activeTool = tools[0];
  const inputArea = document.createElement("textarea");
  const resultArea = document.createElement("div");
  resultArea.style.cssText = "display:none;margin-top:14px;background:#fff;border:1.5px solid rgba(60,40,30,0.10);border-radius:12px;padding:18px;font-size:13px;color:var(--text1);line-height:1.75;max-height:420px;overflow-y:auto;box-shadow:0 1px 0 rgba(0,0,0,.02)";

  // Tool grid
  const grid = document.createElement("div");
  grid.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px";
  tools.forEach(t => {
    const btn = document.createElement("div");
    btn.dataset.toolId = t.id;
    const isAct = t.id === activeTool.id;
    btn.style.cssText = `${A.card};padding:12px 14px;cursor:pointer;transition:all .12s;border-color:${isAct?"rgba(99,102,241,0.35)":"rgba(60,40,30,0.10)"};background:${isAct?"rgba(99,102,241,0.05)":"#fff"}`;
    btn.innerHTML = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span style="font-size:16px">${t.icon}</span><span style="font-size:12.5px;font-weight:600;color:${isAct?"#4F46E5":"var(--text0)"}">${t.label}</span></div><div style="font-size:11px;color:var(--text3)">${t.desc}</div>`;
    btn.addEventListener("click", () => {
      activeTool = t;
      inputArea.placeholder = t.label + "...";
      resultArea.style.display = "none";
      grid.querySelectorAll("[data-tool-id]").forEach(b => {
        const isCur = b.dataset.toolId === t.id;
        b.style.borderColor = isCur ? "rgba(99,102,241,0.35)" : "rgba(60,40,30,0.10)";
        b.style.background = isCur ? "rgba(99,102,241,0.05)" : "#fff";
        b.querySelector("span:last-of-type").style.color = isCur ? "#4F46E5" : "var(--text0)";
      });
    });
    grid.appendChild(btn);
  });
  el.appendChild(grid);

  inputArea.placeholder = activeTool.label + "...";
  inputArea.style.cssText = `${A.input};min-height:120px;resize:vertical;margin-bottom:10px`;
  inputArea.addEventListener("focus", () => { inputArea.style.borderColor="rgba(99,102,241,0.5)"; inputArea.style.boxShadow="0 0 0 3px rgba(99,102,241,0.07)"; });
  inputArea.addEventListener("blur", () => { inputArea.style.borderColor="rgba(60,40,30,0.12)"; inputArea.style.boxShadow="none"; });
  el.appendChild(inputArea);

  // Citation style selector — shown only when cite tool is active
  const wCiteRow = document.createElement("div");
  wCiteRow.style.cssText = "display:none;margin-bottom:10px";
  const wCiteStyles = ["APA 7th", "MLA 9th", "Chicago 17th", "Harvard", "IEEE", "Vancouver"];
  let wActiveCite = "APA 7th";
  const wCiteSeg = document.createElement("div");
  wCiteSeg.style.cssText = "display:flex;flex-wrap:wrap;gap:5px";
  wCiteStyles.forEach(style => {
    const btn = document.createElement("button");
    const isAct = style === wActiveCite;
    btn.style.cssText = `padding:5px 11px;border-radius:7px;border:1px solid ${isAct?"rgba(99,102,241,0.4)":"rgba(60,40,30,0.12)"};background:${isAct?"rgba(99,102,241,0.08)":"transparent"};font-size:11px;font-weight:${isAct?"600":"400"};color:${isAct?"#4F46E5":"var(--text2)"};cursor:pointer;font-family:var(--font);transition:all .1s`;
    btn.textContent = style;
    btn.addEventListener("click", () => {
      wActiveCite = style;
      wCiteSeg.querySelectorAll("button").forEach(b => {
        const cur = b.textContent === style;
        b.style.borderColor = cur ? "rgba(99,102,241,0.4)" : "rgba(60,40,30,0.12)";
        b.style.background = cur ? "rgba(99,102,241,0.08)" : "transparent";
        b.style.color = cur ? "#4F46E5" : "var(--text2)";
        b.style.fontWeight = cur ? "600" : "400";
      });
    });
    wCiteSeg.appendChild(btn);
  });
  const wCiteLabel = document.createElement("div");
  wCiteLabel.style.cssText = "font-family:'Geist Mono','DM Mono',monospace;font-size:9px;font-weight:600;letter-spacing:.10em;text-transform:uppercase;color:var(--text3);margin-bottom:7px";
  wCiteLabel.textContent = "Citation style";
  wCiteRow.appendChild(wCiteLabel);
  wCiteRow.appendChild(wCiteSeg);
  el.appendChild(wCiteRow);

  // Toggle cite row visibility when tool changes
  grid.querySelectorAll("[data-tool-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      wCiteRow.style.display = btn.dataset.toolId === "cite" ? "block" : "none";
    });
  });

  const runBtn = makeBtn("✦ " + activeTool.label, async () => {
    const text = inputArea.value.trim();
    if (!text) return;
    runBtn.textContent = "Working..."; runBtn.style.opacity = "0.6";
    resultArea.style.display = "block";
    resultArea.textContent = "Generating...";
    try {
      const dynamicSystem = activeTool.id === "cite"
        ? `You are a citation specialist. Work only with the text provided. Format the source in ${wActiveCite} style. Do not attempt to browse URLs. If fields are missing, note them and provide the best citation possible.`
        : activeTool.system;
      const res = await fetch(PROXY, {
        method:"POST", headers:{"Content-Type":"application/json","apikey":ANON_KEY,"Authorization":`Bearer ${ANON_KEY}`},
        body:JSON.stringify({ model:"sonnet", system:dynamicSystem, prompt:activeTool.prompt+"\n\n"+text.substring(0,5000) })
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "No response.";
      resultArea.replaceChildren();
      reply.split("\n").forEach(line => {
        if (!line.trim()) return;
        const p = document.createElement("p"); p.style.cssText = "margin:0 0 10px;line-height:1.75";
        if (line.startsWith("**") || line.startsWith("## ")) {
          p.style.fontWeight = "600"; p.textContent = line.replace(/^#{1,3}\s|^\*\*|\*\*$/g,"");
        } else { p.textContent = line; }
        resultArea.appendChild(p);
      });
      const cpBtn = document.createElement("button");
      cpBtn.style.cssText = `${A.btnGhost};padding:5px 12px;font-size:11px;margin-top:4px`;
      cpBtn.textContent = "Copy";
      cpBtn.addEventListener("click", () => { navigator.clipboard.writeText(reply); cpBtn.textContent="Copied!"; setTimeout(()=>cpBtn.textContent="Copy",2000); });
      resultArea.appendChild(cpBtn);
    } catch(e) { resultArea.textContent = "Error: " + e.message; }
    runBtn.textContent = "✦ " + activeTool.label; runBtn.style.opacity = "1";
  });
  el.appendChild(runBtn);
  el.appendChild(resultArea);
}

// ── SHARED UTILITIES ─────────────────────────────────────────────
function makeSec(title, parent) {
  const wrap = document.createElement("div");
  wrap.style.marginBottom = "20px";
  const lbl = document.createElement("div");
  lbl.style.cssText = `${A.eyebrow};margin-bottom:10px`;
  lbl.textContent = title;
  wrap.appendChild(lbl);
  if (parent) parent.appendChild(wrap);
  return wrap;
}

function makeBtn(label, onClick, ghost=false) {
  const btn = document.createElement("button");
  btn.style.cssText = ghost ? A.btnGhost : A.btn;
  btn.textContent = label;
  btn.onmouseenter = () => btn.style.opacity = ".85";
  btn.onmouseleave = () => btn.style.opacity = "1";
  if (onClick) btn.addEventListener("click", onClick);
  return btn;
}

function makeModal(title) {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(26,23,38,0.45);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(2px)";
  const panel = document.createElement("div");
  panel.style.cssText = "background:#fff;border:1.5px solid rgba(60,40,30,0.12);border-radius:16px;padding:20px 22px;width:100%;max-width:460px;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(26,23,38,0.25)";
  const hdr = document.createElement("div");
  hdr.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:18px";
  const h = document.createElement("div");
  h.style.cssText = "font-family:'Instrument Serif',Georgia,serif;font-style:italic;font-size:18px;color:var(--text0)";
  h.textContent = title;
  const close = document.createElement("button");
  close.style.cssText = "background:none;border:none;color:var(--text3);cursor:pointer;font-size:20px;padding:0;line-height:1;width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;transition:all .12s";
  close.textContent = "×";
  close.addEventListener("click", () => overlay.remove());
  hdr.appendChild(h); hdr.appendChild(close);
  panel.appendChild(hdr);
  overlay.appendChild(panel);
  overlay.addEventListener("click", e => { if(e.target===overlay) overlay.remove(); });
  return { el:overlay, body:panel };
}

function makeForm(fields) {
  const form = document.createElement("div");
  form.style.cssText = "display:flex;flex-direction:column;gap:12px;margin-bottom:16px";
  fields.forEach(f => {
    const wrap = document.createElement("div");
    const lbl = document.createElement("label");
    lbl.style.cssText = `${A.eyebrow};display:block;margin-bottom:5px;font-size:9px`;
    lbl.textContent = f.label;
    let input;
    if (f.type === "select") {
      input = document.createElement("select");
      input.innerHTML = f.opts || "";
      input.style.cssText = `${A.input};appearance:none`;
    } else {
      input = document.createElement("input");
      input.type = f.type || "text";
      input.placeholder = f.ph || "";
      input.style.cssText = A.input;
    }
    input.id = f.id;
    input.addEventListener("focus", () => { input.style.borderColor="rgba(99,102,241,0.5)"; input.style.boxShadow="0 0 0 3px rgba(99,102,241,0.07)"; });
    input.addEventListener("blur", () => { input.style.borderColor="rgba(60,40,30,0.12)"; input.style.boxShadow="none"; });
    wrap.appendChild(lbl); wrap.appendChild(input);
    form.appendChild(wrap);
  });
  return form;
}

function getVals(fields) {
  const v = {};
  fields.forEach(f => { v[f.id] = (document.getElementById(f.id)?.value || "").trim(); });
  return v;
}

function emptyState(icon, title, sub) {
  const el = document.createElement("div");
  el.style.cssText = "text-align:center;padding:48px 24px";
  const ic = document.createElement("div"); ic.style.cssText = "font-size:36px;margin-bottom:12px"; ic.textContent = icon;
  const t = document.createElement("div"); t.style.cssText = "font-family:'Instrument Serif',Georgia,serif;font-style:italic;font-size:18px;color:var(--text0);margin-bottom:6px"; t.textContent = title;
  const s = document.createElement("div"); s.style.cssText = "font-size:12px;color:var(--text3);line-height:1.5;max-width:280px;margin:0 auto"; s.textContent = sub;
  el.appendChild(ic); el.appendChild(t); el.appendChild(s);
  return el;
}

// ── INIT ──────────────────────────────────────────────────────────
function initAcademics() {
  loadCourseTracker();
  loadFlashcards();
  loadResearchAssistant();
  loadWritingHelper();
}

window.initAcademics = initAcademics;
