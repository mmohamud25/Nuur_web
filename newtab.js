// ── NUUR FULL TAB ─────────────────────────────────────────────────

// ── VIEW SWITCHING ────────────────────────────────────────────────
const views = ["chat", "agent", "dashboard", "code", "workflows", "settings", "academics"];
let currentView = "chat";

function switchView(view) {
  if (!views.includes(view)) return;
  currentView = view;
  document.querySelectorAll(".tab-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.view === view)
  );
  document.querySelectorAll(".view").forEach(v =>
    v.classList.toggle("active", v.id === `view-${view}`)
  );
  if (view === "dashboard") loadDashboard();
  if (view === "settings")  loadSettingsTab?.();
  if (view === "workflows") loadWorkflowsTab?.();
  if (view === "academics") {
    if (!window._acadInit) {
      window._acadInit = true;
      if (typeof initAcademics === "function") initAcademics();

      // Load subtitle from profile if available
      chrome.storage.local.get("nuur_profile", ({ nuur_profile: p }) => {
        const sub = document.getElementById("acad-subtitle");
        if (sub && p?.school) sub.textContent = p.school;
        else if (sub && p?.degree) sub.textContent = p.degree;
      });

      // Wire sub-tab switching using CSS class (no inline style conflicts)
      function switchAcadTab(targetAcad) {
        document.querySelectorAll(".acad-tab").forEach(b => b.classList.remove("acad-tab-active"));
        const activeBtn = document.querySelector(`.acad-tab[data-acad="${targetAcad}"]`);
        if (activeBtn) activeBtn.classList.add("acad-tab-active");
        ["acad-courses","acad-flashcards","acad-research","acad-writing"].forEach(id => {
          const panel = document.getElementById(id);
          if (panel) panel.style.display = ("acad-" + targetAcad === id) ? "" : "none";
        });
      }

      document.querySelectorAll(".acad-tab").forEach(btn => {
        btn.addEventListener("click", () => switchAcadTab(btn.dataset.acad));
      });

      // Ensure courses panel is active by default
      switchAcadTab("courses");
    }
  }
}

// Support URL hash navigation e.g. newtab.html#agent
(function checkHashNav() {
  const hash = location.hash.replace("#", "");
  if (views.includes(hash)) switchView(hash);
})();

// ── GREETING ──────────────────────────────────────────────────────
function initGreeting() {
  const h = new Date().getHours();
  const greet = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  const el = document.getElementById("time-greeting");
  if (el) el.textContent = greet;
  const date = document.getElementById("dash-date");
  if (date) date.textContent = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
initGreeting();

// ── CHAT ──────────────────────────────────────────────────────────
const chatArea = document.getElementById("chat-area");
const mainInput = document.getElementById("main-input");
const sendBtn = document.getElementById("send-btn");
const welcomeScreen = document.getElementById("welcome-screen");

let chatHistory = [];
let attachedFile = null;
let attachedBase64 = null;
let attachedType = null;

// ── CHAT SESSION PERSISTENCE ──────────────────────────────────────
let currentSessionId = null;
let sessionTitle = null;
let sessionSaveTimer = null;

function generateSessionId() {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function startNewSession() {
  currentSessionId = generateSessionId();
  sessionTitle = null;
  chatHistory = [];
  chatArea.replaceChildren();
  if (welcomeScreen) welcomeScreen.style.display = "";
}

// Save session to Supabase (debounced — waits 2s after last message)
async function persistSession() {
  if (!currentSessionId || chatHistory.length === 0) return;
  clearTimeout(sessionSaveTimer);
  sessionSaveTimer = setTimeout(async () => {
    try {
      const title = sessionTitle || chatHistory[0]?.content?.substring(0, 60) || "Chat session";
      await fetch(`${SUPABASE_URL}/rest/v1/nuur_chat_sessions`, {
        method: "POST",
        headers: {
          "apikey": ANON_KEY,
          "Authorization": `Bearer ${ANON_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "resolution=merge-duplicates"
        },
        body: JSON.stringify({
          id: currentSessionId,
          user_id: NUUR_USER_ID,
          title: title.substring(0, 80),
          messages: JSON.stringify(chatHistory.slice(-40)), // keep last 40 messages
          message_count: chatHistory.length,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
      });
      // Update sidebar entry
      updateSidebarEntry(currentSessionId, title);
    } catch (_) {}
  }, 2000);
}

// Load a past session into the chat
async function loadSession(sessionId) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/nuur_chat_sessions?id=eq.${sessionId}&user_id=eq.${NUUR_USER_ID}`,
      { headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` } }
    );
    const data = await res.json();
    const session = data[0];
    if (!session) return;

    // Clear current chat
    chatArea.replaceChildren();
    if (welcomeScreen) welcomeScreen.style.display = "none";

    currentSessionId = session.id;
    sessionTitle = session.title;

    // Parse and restore messages
    const messages = typeof session.messages === "string"
      ? JSON.parse(session.messages)
      : session.messages || [];

    chatHistory = messages;

    // Render each message
    const renderedCount = messages.filter(m => m.content).length;
    messages.forEach(msg => {
      if (!msg.content) return;
      const role = msg.role === "assistant" ? "nuur" : "user";
      addChatMsg(role, msg.content);
    });

    // If session had no renderable messages, show welcome screen
    if (renderedCount === 0 && welcomeScreen) {
      welcomeScreen.style.display = "";
    }

    // Mark active in sidebar
    document.querySelectorAll(".history-item").forEach(el => {
      el.classList.toggle("active", el.dataset.sessionId === sessionId);
    });

  } catch (_) {}
}

// Restore most recent session on page open
async function restoreLastSession() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/nuur_chat_sessions?user_id=eq.${NUUR_USER_ID}&order=updated_at.desc&limit=1`,
      { headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` } }
    );
    const data = await res.json();
    if (!data[0] || data[0].message_count === 0) {
      // No prior session — start fresh
      currentSessionId = generateSessionId();
      return;
    }
    await loadSession(data[0].id);
  } catch (_) {
    currentSessionId = generateSessionId();
  }
}

// Load past sessions into sidebar history list
async function loadSidebarHistory() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/nuur_chat_sessions?user_id=eq.${NUUR_USER_ID}&order=updated_at.desc&limit=25`,
      { headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` } }
    );
    const sessions = await res.json();
    if (!Array.isArray(sessions)) return;

    const histEl = document.getElementById("chat-history");
    histEl.replaceChildren();

    // Current session entry
    const currentItem = makeSidebarHistoryItem(
      currentSessionId,
      sessionTitle || "Current session",
      "now",
      true
    );
    histEl.appendChild(currentItem);

    // Past sessions
    sessions.forEach(s => {
      if (s.id === currentSessionId) return; // skip current
      const timeAgo = getRelativeTime(s.updated_at);
      const item = makeSidebarHistoryItem(s.id, s.title || "Chat session", timeAgo, false);
      histEl.appendChild(item);
    });
  } catch (_) {}
}

function makeSidebarHistoryItem(sessionId, title, time, isActive) {
  const item = document.createElement("div");
  item.className = "history-item" + (isActive ? " active" : "");
  item.dataset.sessionId = sessionId;

  const icon = document.createElement("div");
  icon.className = "history-icon";
  icon.textContent = "💬";

  const text = document.createElement("div");
  text.className = "history-text";
  text.textContent = title;
  text.title = title;

  const timeEl = document.createElement("div");
  timeEl.className = "history-time";
  timeEl.textContent = time;

  // Delete button — shown on hover
  const delBtn = document.createElement("button");
  delBtn.className = "history-delete-btn";
  delBtn.title = "Delete chat";
  delBtn.innerHTML = `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>`;
  delBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    delBtn.style.opacity = "0.4";
    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/nuur_chat_sessions?id=eq.${sessionId}&user_id=eq.${NUUR_USER_ID}`,
        { method: "DELETE", headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` } }
      );
      item.style.opacity = "0";
      item.style.transform = "translateX(-8px)";
      item.style.transition = "opacity .15s, transform .15s";
      setTimeout(() => item.remove(), 160);
      // If deleting the active session, start fresh
      if (isActive || sessionId === currentSessionId) {
        startNewSession();
      }
    } catch (_) {
      delBtn.style.opacity = "1";
    }
  });

  item.appendChild(icon);
  item.appendChild(text);
  item.appendChild(timeEl);
  item.appendChild(delBtn);

  if (!isActive) {
    item.addEventListener("click", () => loadSession(sessionId));
  }
  return item;
}

function updateSidebarEntry(sessionId, title) {
  const existing = document.querySelector(`.history-item[data-session-id="${sessionId}"]`);
  if (existing) {
    const textEl = existing.querySelector(".history-text");
    if (textEl) textEl.textContent = title;
    const timeEl = existing.querySelector(".history-time");
    if (timeEl) timeEl.textContent = "now";
  } else {
    // Add new entry at top
    const histEl = document.getElementById("chat-history");
    const item = makeSidebarHistoryItem(sessionId, title, "now", true);
    histEl.insertBefore(item, histEl.firstChild);
  }
}

function getRelativeTime(isoString) {
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(isoString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch (_) { return ""; }
}

// Initialize on load
restoreLastSession().then(() => loadSidebarHistory());

// Auto-resize textarea
mainInput.addEventListener("input", () => {
  mainInput.style.height = "auto";
  mainInput.style.height = Math.min(mainInput.scrollHeight, 120) + "px";
});

mainInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChatSend(); }
});
sendBtn.addEventListener("click", handleChatSend);

// Suggestions
document.querySelectorAll(".suggestion").forEach(s => {
  s.addEventListener("click", () => { mainInput.value = s.dataset.prompt; handleChatSend(); });
});

// Hint chips
document.querySelectorAll(".hint-chip").forEach(c => {
  c.addEventListener("click", () => { mainInput.value = c.dataset.prompt; mainInput.focus(); });
});

// File attach
const fileBtn = document.getElementById("file-btn");
const fileInput = document.getElementById("file-input");
fileBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    attachedBase64 = reader.result.split(",")[1];
    attachedType = file.type;
    attachedFile = file;
    fileBtn.style.color = "var(--teal)";
    mainInput.placeholder = `📎 ${file.name} — ask anything about this file…`;
  };
  reader.readAsDataURL(file);
  fileInput.value = "";
});

// Paste screenshot disabled — use paperclip button to attach files

// ── MARKDOWN RENDERER ─────────────────────────────────────────────
// Renders Claude's markdown output as styled DOM elements.
// No innerHTML with user content — all text via textContent.

function renderMarkdown(text, container) {
  if (!text) return;

  const lines = text.split("\n");
  let i = 0;
  let inList = null;
  let listType = null;

  function flushList() {
    if (inList) { container.appendChild(inList); inList = null; listType = null; }
  }

  function makeInline(raw) {
    // Returns a DocumentFragment with inline formatting applied
    const frag = document.createDocumentFragment();
    // Patterns: **bold**, *italic*, `code`, [text](url)
    const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^\)]+)\))/g;
    let last = 0, m;
    while ((m = re.exec(raw)) !== null) {
      if (m.index > last) frag.appendChild(document.createTextNode(raw.slice(last, m.index)));
      if (m[2] !== undefined) { const s = document.createElement("strong"); s.style.color = "var(--text0)"; s.textContent = m[2]; frag.appendChild(s); }
      else if (m[3] !== undefined) { const e = document.createElement("em"); e.textContent = m[3]; frag.appendChild(e); }
      else if (m[4] !== undefined) { const c = document.createElement("code"); c.style.cssText = "background:var(--bg0);border:1px solid var(--border);border-radius:4px;padding:1px 5px;font-family:var(--mono);font-size:.88em;color:var(--teal2)"; c.textContent = m[4]; frag.appendChild(c); }
      else if (m[5] !== undefined) { const a = document.createElement("a"); a.href = m[6]; a.textContent = m[5]; a.target = "_blank"; a.style.cssText = "color:var(--teal);text-decoration:underline"; frag.appendChild(a); }
      last = m.index + m[0].length;
    }
    if (last < raw.length) frag.appendChild(document.createTextNode(raw.slice(last)));
    return frag;
  }

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code block
    if (trimmed.startsWith("```")) {
      flushList();
      const lang = trimmed.slice(3).trim();
      const pre = document.createElement("pre");
      pre.style.cssText = "background:var(--navy, #0f172a);border-radius:10px;padding:12px 14px;overflow-x:auto;margin:8px 0;position:relative";
      const code = document.createElement("code");
      code.style.cssText = "font-family:var(--mono);font-size:12px;color:#e2e8f0;line-height:1.65;white-space:pre";
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) { codeLines.push(lines[i]); i++; }
      code.textContent = codeLines.join("\n");
      // Copy button
      const cpBtn = document.createElement("button");
      cpBtn.style.cssText = "position:absolute;top:8px;right:8px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:3px 8px;font-size:10px;color:rgba(255,255,255,0.6);cursor:pointer;font-family:var(--font)";
      cpBtn.textContent = lang || "Copy";
      cpBtn.addEventListener("click", () => { navigator.clipboard.writeText(code.textContent).catch(() => {}); cpBtn.textContent = "Copied!"; setTimeout(() => { cpBtn.textContent = lang || "Copy"; }, 2000); });
      pre.appendChild(code); pre.appendChild(cpBtn);
      container.appendChild(pre);
      i++; continue;
    }

    // Heading
    const hMatch = trimmed.match(/^(#{1,4})\s+(.+)/);
    if (hMatch) {
      flushList();
      const level = hMatch[1].length;
      const h = document.createElement(level <= 2 ? "h3" : "h4");
      h.style.cssText = `font-size:${level <= 2 ? "14" : "13"}px;font-weight:600;color:var(--text0);margin:${level <= 2 ? "14px 0 6px" : "10px 0 4px"}`;
      h.appendChild(makeInline(hMatch[2]));
      container.appendChild(h);
      i++; continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(trimmed)) {
      flushList();
      const hr = document.createElement("hr");
      hr.style.cssText = "border:none;border-top:1px solid var(--border3);margin:10px 0";
      container.appendChild(hr); i++; continue;
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      flushList();
      const bq = document.createElement("blockquote");
      bq.style.cssText = "border-left:3px solid var(--teal);padding-left:10px;margin:6px 0;color:var(--text2);font-style:italic;font-size:13px";
      bq.appendChild(makeInline(trimmed.slice(2)));
      container.appendChild(bq); i++; continue;
    }

    // Unordered list
    const ulMatch = trimmed.match(/^[-*•]\s+(.+)/);
    if (ulMatch) {
      if (listType !== "ul") { flushList(); inList = document.createElement("ul"); inList.style.cssText = "padding-left:18px;margin:4px 0"; listType = "ul"; }
      const li = document.createElement("li"); li.style.cssText = "margin-bottom:3px;font-size:13.5px;line-height:1.65;color:var(--text1)";
      li.appendChild(makeInline(ulMatch[1]));
      inList.appendChild(li); i++; continue;
    }

    // Ordered list
    const olMatch = trimmed.match(/^(\d+)[.)]\s+(.+)/);
    if (olMatch) {
      if (listType !== "ol") { flushList(); inList = document.createElement("ol"); inList.style.cssText = "padding-left:20px;margin:4px 0"; listType = "ol"; }
      const li = document.createElement("li"); li.style.cssText = "margin-bottom:3px;font-size:13.5px;line-height:1.65;color:var(--text1)";
      li.appendChild(makeInline(olMatch[2]));
      inList.appendChild(li); i++; continue;
    }

    // Empty line
    if (!trimmed) {
      flushList();
      // Only add spacer if next non-empty line exists
      if (i + 1 < lines.length && lines[i + 1].trim()) {
        const sp = document.createElement("div"); sp.style.height = "6px";
        container.appendChild(sp);
      }
      i++; continue;
    }

    // Normal paragraph
    flushList();
    const p = document.createElement("p");
    p.style.cssText = "font-size:13.5px;line-height:1.7;color:var(--text1);margin-bottom:4px";
    p.appendChild(makeInline(trimmed));
    container.appendChild(p);
    i++;
  }

  flushList();
}

function cleanText(text) {
  // Kept for user messages only — strips markdown to plain text
  if (!text) return text;
  return text
    .replace(/#{1,6}\s?/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/---+/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function addChatMsg(role, text, fileName, streaming = false) {
  if (welcomeScreen) welcomeScreen.style.display = "none";

  const row = document.createElement("div");
  row.className = `chat-row ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "chat-avatar";
  avatar.textContent = role === "nuur" ? "✦" : "M";

  const bubble = document.createElement("div");
  bubble.className = "chat-bubble";

  if (fileName) {
    const tag = document.createElement("div");
    tag.style.cssText = "font-size:10px;color:var(--teal);margin-bottom:5px;opacity:.8";
    tag.textContent = `📎 ${fileName}`;
    bubble.appendChild(tag);
  }

  if (!streaming && text) {
    if (role === "nuur") {
      renderMarkdown(text, bubble);
    } else {
      const displayText = cleanText(text);
      const lines = displayText.split("\n");
      lines.forEach((line, idx) => {
        if (line) { const span = document.createElement("span"); span.textContent = line; bubble.appendChild(span); }
        if (idx < lines.length - 1) bubble.appendChild(document.createElement("br"));
      });
    }
  }

  if (role === "user") { row.appendChild(bubble); row.appendChild(avatar); }
  else { row.appendChild(avatar); row.appendChild(bubble); }

  chatArea.appendChild(row);
  chatArea.scrollTop = chatArea.scrollHeight;
  return bubble; // return bubble so streaming can fill it
}

function addTypingIndicator() {
  const row = document.createElement("div");
  row.className = "chat-row nuur";
  row.id = "typing-row";
  const avatar = document.createElement("div");
  avatar.className = "chat-avatar";
  avatar.textContent = "✦";
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble";
  const typing = document.createElement("div");
  typing.className = "typing-indicator";
  [1,2,3].forEach(() => { const d = document.createElement("div"); d.className = "typing-dot"; typing.appendChild(d); });
  bubble.appendChild(typing);
  row.appendChild(avatar);
  row.appendChild(bubble);
  chatArea.appendChild(row);
  chatArea.scrollTop = chatArea.scrollHeight;
  return row;
}

async function handleChatSend() {
  const text = mainInput.value.trim();
  if (!text && !attachedBase64) return;

  const userText = text || (attachedFile?.name ? `Analyze this file: ${attachedFile.name}` : "Analyze this file");
  const fileName = attachedFile?.name || null;

  addChatMsg("user", userText, fileName);
  mainInput.value = "";
  mainInput.style.height = "auto";
  sendBtn.disabled = true;

  const fileBase64 = attachedBase64;
  const fileType = attachedType;
  const fName = fileName;

  // Clear attachment
  attachedFile = null; attachedBase64 = null; attachedType = null;
  fileBtn.style.color = "";
  mainInput.placeholder = "Ask Nuur anything…";

  const typingRow = addTypingIndicator();

  try {
    const system = await getSystemPromptWithLanguage("");
    let response;

    if (fileBase64) {
      const content = fileType === "application/pdf"
        ? [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: fileBase64 } }, { type: "text", text: text || "Summarize this document" }]
        : [{ type: "image", source: { type: "base64", media_type: fileType, data: fileBase64 } }, { type: "text", text: text || "What do you see in this image?" }];

      const res = await fetch(PROXY, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ model: "sonnet", system, messages: [{ role: "user", content }] })
      });
      const data = await res.json();
      response = data.content?.[0]?.text || "Could not analyze the file.";
    } else {
      // Add to history — keep full history for display, cap at 20 for API
      chatHistory.push({ role: "user", content: text });
      const apiMessages = chatHistory.slice(-20); // never send more than 20 to API
      const res = await fetch(PROXY, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ model: "sonnet", system, messages: apiMessages })
      });
      if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
      const data = await res.json();
      if (data.type === "error" || data.error) throw new Error(data.error?.message || "API error");
      response = data.content?.[0]?.text || "No response — the model returned an empty reply.";
      chatHistory.push({ role: "assistant", content: response });
    }

    typingRow.remove();
    const bubble = addChatMsg("nuur", "", null, true); // empty bubble, streaming=true
    streamText(bubble, response, () => {
      learnFromChat(userText, response);
      persistSession();
    });

  } catch (e) {
    typingRow.remove();
    addChatMsg("nuur", "Connection error: " + e.message);
  }

  sendBtn.disabled = false;
}

// getSystemPromptWithLanguage is defined later — it handles both base prompt + language suffix

function learnFromChat(userMsg, nuurMsg) {
  chrome.runtime.sendMessage({
    type: "LEARN_FROM_CONVERSATION",
    userMessage: userMsg,
    nuurResponse: nuurMsg
  }, () => { chrome.runtime.lastError; });
}

// ── CHAT HISTORY SIDEBAR ──────────────────────────────────────────
function saveHistory(firstMessage) {
  const histEl = document.getElementById("chat-history");
  if (!histEl || document.querySelector(".history-item:not(.active)")) return;
  const item = document.createElement("div");
  item.className = "history-item";
  const icon = document.createElement("div"); icon.className = "history-icon"; icon.textContent = "💬";
  const text = document.createElement("div"); text.className = "history-text"; text.textContent = firstMessage.substring(0, 40);
  const time = document.createElement("div"); time.className = "history-time"; time.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  item.appendChild(icon); item.appendChild(text); item.appendChild(time);
  histEl.insertBefore(item, histEl.firstChild.nextSibling);
}

document.getElementById("new-chat-btn")?.addEventListener("click", () => {
  startNewSession();
  switchView("chat");
  mainInput.focus();
  loadSidebarHistory();
});

// ── AGENT ─────────────────────────────────────────────────────────
const agentInput = document.getElementById("agent-input");
const agentRunBtn = document.getElementById("agent-run-btn");
const agentLog = document.getElementById("agent-log");
let agentRunning = false;

agentInput.addEventListener("keydown", (e) => { if (e.key === "Enter") runAgent(); });
agentRunBtn.addEventListener("click", runAgent);

document.querySelectorAll(".agent-example").forEach(ex => {
  ex.addEventListener("click", () => { agentInput.value = ex.dataset.goal; agentInput.focus(); });
});

function addAgentStep(data) {
  const statusMap = { thinking: "◌", acting: "◉", complete: "✓", failed: "✗", paused: "⏸" };
  const colorMap  = { thinking: "var(--text3)", acting: "var(--teal)", complete: "var(--green)", failed: "var(--red)", paused: "var(--gold)" };
  const bgMap     = { thinking: "var(--bg3)", acting: "var(--teal3)", complete: "rgba(22,163,74,0.06)", failed: "rgba(239,68,68,0.06)", paused: "rgba(217,119,6,0.06)" };

  const icon  = statusMap[data.status] || "◉";
  const color = colorMap[data.status]  || "var(--teal)";
  const message = data.message && data.message !== "undefined" ? data.message : `Step ${data.step || ""}`;
  const thought = data.thought && data.thought !== "undefined" ? data.thought : "";
  const action  = data.action  && !["done","fail","undefined"].includes(data.action) ? data.action : "";

  if (data.complete) {
    const el = document.createElement("div");
    el.className = "step-complete-block";
    el.style.background = bgMap[data.status] || bgMap.complete;
    el.style.borderColor = colorMap[data.status] || "rgba(74,222,128,0.2)";

    const row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:flex-start;gap:10px";

    const iconEl = document.createElement("div");
    iconEl.style.cssText = `font-size:16px;color:${color};flex-shrink:0;margin-top:1px`;
    iconEl.textContent = icon;

    const body = document.createElement("div");
    body.style.flex = "1";
    const msgEl = document.createElement("div");
    msgEl.style.cssText = "font-size:13px;color:var(--text1);line-height:1.6;font-weight:500";
    msgEl.textContent = message;
    body.appendChild(msgEl);

    row.appendChild(iconEl); row.appendChild(body);
    el.appendChild(row);
    agentLog.appendChild(el);

    if (data.status === "paused") {
      const contBtn = document.createElement("button");
      contBtn.className = "agent-continue-btn";
      contBtn.textContent = "↩ Continue from where I left off";
      contBtn.addEventListener("click", () => {
        contBtn.remove();
        agentInput.value = "Continue the previous task — pick up where you left off and complete the remaining steps.";
        runAgent();
      });
      agentLog.appendChild(contBtn);
    }

    agentLog.scrollTop = agentLog.scrollHeight;
    return;
  }

  // Keep max 12 intermediate steps visible
  const steps = agentLog.querySelectorAll(".agent-step");
  if (steps.length >= 12) steps[0].remove();

  const el = document.createElement("div");
  el.className = `agent-step step-${data.status}`;

  const stepIcon = document.createElement("div");
  stepIcon.className = "step-icon";
  stepIcon.textContent = icon;
  stepIcon.style.background = bgMap[data.status] || bgMap.acting;
  stepIcon.style.color = color;

  const body = document.createElement("div");
  body.className = "step-body";

  const msgEl = document.createElement("div");
  msgEl.className = "step-message";
  msgEl.textContent = message;
  body.appendChild(msgEl);

  // Thought — expandable, truncated by default
  if (thought) {
    const thoughtWrap = document.createElement("div");
    thoughtWrap.style.cssText = "margin-top:3px";
    const thoughtEl = document.createElement("div");
    thoughtEl.className = "step-thought";
    thoughtEl.textContent = thought.length > 90 ? thought.substring(0, 90) + "…" : thought;
    thoughtEl.title = thought; // full text on hover
    thoughtEl.style.cursor = thought.length > 90 ? "pointer" : "default";
    if (thought.length > 90) {
      let expanded = false;
      thoughtEl.addEventListener("click", () => {
        expanded = !expanded;
        thoughtEl.textContent = expanded ? thought : thought.substring(0, 90) + "…";
        thoughtEl.style.whiteSpace = expanded ? "normal" : "nowrap";
      });
    }
    thoughtWrap.appendChild(thoughtEl);
    body.appendChild(thoughtWrap);
  }

  // Action badge
  if (action) {
    const actionBadge = document.createElement("div");
    actionBadge.style.cssText = `display:inline-flex;align-items:center;gap:4px;margin-top:4px;font-size:10px;color:${color};background:${bgMap[data.status]};border:1px solid ${color}25;border-radius:6px;padding:2px 7px;font-weight:500`;
    actionBadge.textContent = "→ " + action;
    body.appendChild(actionBadge);
  }

  const stepNum = document.createElement("div");
  stepNum.className = "step-num";
  stepNum.textContent = data.step ? `${data.step}/25` : "";

  el.appendChild(stepIcon); el.appendChild(body); el.appendChild(stepNum);
  agentLog.appendChild(el);
  agentLog.scrollTop = agentLog.scrollHeight;
}


// ── STREAMING TEXT REVEAL ─────────────────────────────────────────
// Reveals Nuur responses word-by-word for a streaming-like feel.
// Renders full markdown after reveal completes.

function streamText(container, text, onComplete) {
  const words = text.split(/(\s+)/);
  let idx = 0;
  // Show first chunk immediately, then stream the rest
  const CHUNK = 3; // words per frame
  const DELAY = 18; // ms between frames

  const placeholder = document.createElement("span");
  placeholder.style.cssText = "color:var(--text1);font-size:13.5px;line-height:1.7;white-space:pre-wrap";
  container.appendChild(placeholder);

  let revealed = "";

  function tick() {
    if (idx >= words.length) {
      // Replace placeholder with full markdown render
      container.replaceChildren();
      renderMarkdown(text, container);
      if (onComplete) onComplete();
      return;
    }
    const end = Math.min(idx + CHUNK, words.length);
    for (let i = idx; i < end; i++) revealed += words[i];
    placeholder.textContent = revealed;
    idx = end;
    container.parentElement?.parentElement?.scrollTo?.({ top: 99999, behavior: "instant" });
    requestAnimationFrame(() => setTimeout(tick, DELAY));
  }

  tick();
}

function runAgent() {
  const goal = agentInput.value.trim();
  if (!goal || agentRunning) return;
  agentRunning = true;
  agentStepHistory = []; // reset replay history for new run
  agentRunBtn.disabled = true;
  agentRunBtn.textContent = "Running…";

  // Clear examples
  const examples = document.getElementById("agent-examples");
  if (examples) examples.style.display = "none";

  // Clear old log
  agentLog.replaceChildren();
  addAgentStep({ status: "thinking", step: 0, message: `Goal: ${goal}` });

  chrome.runtime.sendMessage({ type: "RUN_AGENT", goal }, (res) => {
    if (chrome.runtime.lastError || !res?.ok) {
      agentRunning = false;
      agentRunBtn.disabled = false;
      agentRunBtn.innerHTML = '<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg> Run';
      addAgentStep({ status: "failed", message: "Could not start agent. Make sure you are on a valid tab.", complete: true });
    }
  });
}

// Listen for agent updates
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "AGENT_UPDATE") {
    addAgentStep(msg);
    if (msg.complete) {
      agentRunning = false;
      agentRunBtn.disabled = false;
      agentRunBtn.innerHTML = '<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg> Run';
    }
  }
  // Theme changed in sidepanel — sync to newtab immediately
  if (msg.type === "THEME_CHANGED") {
    localStorage.setItem("nuur_theme", msg.theme);
    if (typeof applyNewtabTheme === "function") applyNewtabTheme();
  }
});

// ── DASHBOARD ─────────────────────────────────────────────────────
async function loadDashboard() {
  let apps = [];

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/nuur_applications?user_id=eq.${NUUR_USER_ID}&order=applied_at.desc&limit=20`,
      { headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` } }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    apps = await res.json();
    // Cache for offline use
    chrome.storage.local.set({ nuur_cached_apps: apps, nuur_apps_cached_at: Date.now() });
  } catch (_) {
    // Offline fallback — use cached data
    const cached = await new Promise(r => chrome.storage.local.get(["nuur_cached_apps", "nuur_apps_cached_at"], r));
    if (cached.nuur_cached_apps) {
      apps = cached.nuur_cached_apps;
      // Show offline indicator
      const offlineNote = document.createElement("div");
      offlineNote.style.cssText = "font-size:10px;color:var(--gold);text-align:center;padding:4px;margin-bottom:8px";
      const minsAgo = cached.nuur_apps_cached_at ? Math.round((Date.now() - cached.nuur_apps_cached_at) / 60000) : "?";
      offlineNote.textContent = `⚡ Offline — showing data from ${minsAgo} minutes ago`;
      document.getElementById("dash-apps")?.insertAdjacentElement("beforebegin", offlineNote);
    }
  }

  try {

    const total = apps.length;
    const responded = apps.filter(a => ["interview","offer","rejected"].includes(a.status)).length;
    const interviews = apps.filter(a => ["interview","offer"].includes(a.status)).length;
    const rate = total > 0 ? Math.round((responded / total) * 100) : 0;

    (document.getElementById("stat-applied") || {}).textContent = total;
    (document.getElementById("stat-response") || {}).textContent = rate + "%";
    (document.getElementById("stat-interviews") || {}).textContent = interviews;

    const appsBadge = document.getElementById("app-badge");
    if (appsBadge) appsBadge.textContent = total;

    const appsEl = document.getElementById("dash-apps");
    if (!apps.length) {
      appsEl.replaceChildren();
      const empty = document.createElement("div");
      empty.className = "dash-empty";
      const ei = document.createElement("div"); ei.className = "dash-empty-icon"; ei.textContent = "💼";
      const et = document.createElement("div"); et.className = "dash-empty-title"; et.textContent = "No applications yet";
      const es = document.createElement("div"); es.className = "dash-empty-sub"; es.textContent = "Open a job posting on LinkedIn, Indeed, or Greenhouse and Nuur will offer to track it";
      empty.appendChild(ei); empty.appendChild(et); empty.appendChild(es);
      appsEl.appendChild(empty);
      // Don't return — continue to load screen time, briefing, etc.
    } else {
    apps.slice(0, 8).forEach(app => {
      const row = document.createElement("div");
      row.className = "dash-app-row";
      row.dataset.appId = app.id;

      const info = document.createElement("div");
      info.style.flex = "1";
      info.style.minWidth = "0";
      const title = document.createElement("div");
      title.className = "dash-app-title";
      title.textContent = app.job_title || "Unknown role";
      const company = document.createElement("div");
      company.className = "dash-app-company";
      company.textContent = `${app.company || "Unknown"} · ${new Date(app.applied_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      info.appendChild(title);
      info.appendChild(company);

      const statusColors = { applied: "status-applied", interview: "status-interview", offer: "status-offer", rejected: "status-rejected" };
      const statusBadge = document.createElement("div");
      statusBadge.className = `dash-app-status ${statusColors[app.status] || "status-applied"}`;
      statusBadge.textContent = app.status ? (app.status.charAt(0).toUpperCase() + app.status.slice(1)) : "Applied";

      row.appendChild(info);
      row.appendChild(statusBadge);

      // Quick email draft button
      const emailBtn = document.createElement("button");
      emailBtn.style.cssText = "padding:4px 8px;border-radius:6px;background:transparent;border:1px solid var(--border);color:var(--text3);font-size:10px;cursor:pointer;font-family:var(--font);margin-left:6px;transition:all .12s;white-space:nowrap";
      emailBtn.textContent = "📧 Draft";
      emailBtn.title = "Draft an email for this stage";
      emailBtn.addEventListener("mouseenter", () => { emailBtn.style.borderColor = "var(--teal)"; emailBtn.style.color = "var(--teal)"; });
      emailBtn.addEventListener("mouseleave", () => { emailBtn.style.borderColor = "var(--border)"; emailBtn.style.color = "var(--text3)"; });
      emailBtn.addEventListener("click", e => {
        e.stopPropagation();
        generateStageEmail(app, app.status || "applied");
      });
      row.appendChild(emailBtn);

      appsEl.appendChild(row);
    });
    } // close else block for apps.length > 0

  } catch (e) {
    const appsEl2 = document.getElementById("dash-apps");
    if (appsEl2) {
      appsEl2.replaceChildren();
      const err = document.createElement("div");
      err.className = "dash-empty";
      err.textContent = "Could not load applications. Check your Supabase connection.";
      appsEl2.appendChild(err);
    }
  }

  // Screen time — own try/catch, never blocks the rest
  try {
    const today = new Date().toISOString().split("T")[0];
    const res2 = await fetch(
      `${SUPABASE_URL}/rest/v1/nuur_screen_time?user_id=eq.${NUUR_USER_ID}&date=eq.${today}&order=seconds.desc&limit=6`,
      { headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` } }
    );
    const times = await res2.json();
    const stEl = document.getElementById("dash-screen-time");
    stEl.replaceChildren();

    if (!times.length) {
      const empty = document.createElement("div");
      empty.className = "dash-empty";
      empty.style.gridColumn = "span 2";
      empty.textContent = "No screen time data yet — browse for a bit first";
      stEl.appendChild(empty);
    } else {
    const fmt = s => { const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); return h > 0 ? `${h}h ${m}m` : `${m}m`; };
    times.forEach(t => {
      const card = document.createElement("div"); card.className = "dash-card"; card.style.display = "flex"; card.style.alignItems = "center";
      const info = document.createElement("div");
      const title = document.createElement("div"); title.className = "dash-card-title"; title.textContent = t.domain;
      const sub = document.createElement("div"); sub.className = "dash-card-sub"; sub.textContent = t.category;
      info.appendChild(title); info.appendChild(sub);
      const time = document.createElement("div"); time.className = "dash-card-right"; time.textContent = fmt(t.seconds);
      card.appendChild(info); card.appendChild(time);
      stEl.appendChild(card);
    });
    }
  } catch (_) {}

  loadBriefing();
  _patchDashboard();
  checkFollowUpReminders();
  injectSkillRadarLink();

  // Load dashboard sections in two staggered batches
  // Batch 1: above-the-fold sections — immediate
  Promise.allSettled([
    loadKanban(),
    loadJobSearchScore(),
    loadApplicationAnalytics()
  ]);
  // Batch 2: below-the-fold sections — 400ms delay reduces simultaneous connections
  setTimeout(() => {
    Promise.allSettled([
      loadInterviews(),
      loadSalaryTracker(),
      loadNetworkingTracker()
    ]);
  }, 400);
}

// Sidebar nav
// ── SIDEBAR PIN TOGGLE ────────────────────────────────────────────
const sidebar = document.getElementById("sidebar");
const pinBtn = document.getElementById("sidebar-pin-btn");
const sidebarPinned = localStorage.getItem("nuur_sidebar_pinned") === "true";
if (sidebarPinned) sidebar.classList.add("pinned");
pinBtn.addEventListener("click", () => {
  const isPinned = sidebar.classList.toggle("pinned");
  localStorage.setItem("nuur_sidebar_pinned", isPinned);
  pinBtn.style.opacity = isPinned ? "1" : "";
  pinBtn.title = isPinned ? "Unpin sidebar" : "Pin sidebar";
});

// ── VAULT NAV ─────────────────────────────────────────────────────
document.getElementById("nav-vault")?.addEventListener("click", () => showPasswordVault());

// ── NAV ACTIVE STATE ──────────────────────────────────────────────
document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    item.classList.add("active");
  });
});
document.getElementById("nav-applications")?.addEventListener("click", () => {
  window.switchView("dashboard");
  setTimeout(() => document.getElementById("dash-apps")?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
});

document.getElementById("nav-bookmarks")?.addEventListener("click", () => showNewtabBookmarks());

document.getElementById("nav-screen-time")?.addEventListener("click", () => {
  window.switchView("dashboard");
  setTimeout(() => document.getElementById("section-screen-time")?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
});

document.getElementById("nav-linkedin-post")?.addEventListener("click", () => showLinkedInComposer());
document.getElementById("nav-resume")?.addEventListener("click", () => showResumeManager());
document.getElementById("nav-cover-letters")?.addEventListener("click", () => showCoverLetterHistory());
async function showNewtabBookmarks() {
  const existing = document.getElementById("nuur-nt-bookmarks");
  if (existing) { existing.remove(); return; }

  const overlay = document.createElement("div");
  overlay.id = "nuur-nt-bookmarks";
  overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;padding:20px;font-family:var(--font)";
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });

  const card = document.createElement("div");
  card.style.cssText = "background:var(--bg1);border:1px solid var(--border);border-radius:16px;width:100%;max-width:600px;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.15)";

  // Header
  const hdr = document.createElement("div");
  hdr.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border);flex-shrink:0";
  const htitle = document.createElement("div");
  htitle.style.cssText = "font-size:14px;font-weight:600;color:var(--text0)";
  htitle.textContent = "✦ Smart Bookmarks";
  const hclose = document.createElement("button");
  hclose.style.cssText = "background:none;border:none;color:var(--text3);cursor:pointer;font-size:18px;padding:0;line-height:1";
  hclose.textContent = "×";
  hclose.addEventListener("click", () => overlay.remove());
  hdr.appendChild(htitle);
  hdr.appendChild(hclose);

  // Search bar
  const searchBar = document.createElement("div");
  searchBar.style.cssText = "padding:12px 20px;border-bottom:1px solid var(--border3);flex-shrink:0";
  const searchInput = document.createElement("input");
  searchInput.placeholder = "Search bookmarks by title, tag, or topic...";
  searchInput.style.cssText = "width:100%;background:var(--bg0);border:1.5px solid var(--border);border-radius:9px;padding:9px 14px;font-family:var(--font);font-size:13px;color:var(--text0);outline:none;transition:border-color .15s";
  searchInput.addEventListener("focus", () => { searchInput.style.borderColor = "var(--teal)"; });
  searchInput.addEventListener("blur", () => { searchInput.style.borderColor = "var(--border)"; });
  searchBar.appendChild(searchInput);

  // List
  const list = document.createElement("div");
  list.style.cssText = "overflow-y:auto;flex:1;padding:8px 20px 16px";

  // Loading state
  const loading = document.createElement("div");
  loading.style.cssText = "text-align:center;padding:40px;font-size:12px;color:var(--text3)";
  loading.textContent = "Loading bookmarks...";
  list.appendChild(loading);

  card.appendChild(hdr);
  card.appendChild(searchBar);
  card.appendChild(list);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  searchInput.focus();

  // Fetch bookmarks
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/nuur_bookmarks?user_id=eq.${NUUR_USER_ID}&order=saved_at.desc&limit=100`,
      { headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` } }
    );
    const bookmarks = await res.json();
    list.replaceChildren();

    if (!Array.isArray(bookmarks) || !bookmarks.length) {
      const empty = document.createElement("div");
      empty.style.cssText = "text-align:center;padding:40px;font-size:13px;color:var(--text3)";
      empty.textContent = "No bookmarks yet — use the Save bookmark quick action on any page.";
      list.appendChild(empty);
      htitle.textContent = "✦ Smart Bookmarks (0)";
      return;
    }

    htitle.textContent = `✦ Smart Bookmarks (${bookmarks.length})`;

    const renderBookmarks = (items) => {
      list.replaceChildren();
      if (!items.length) {
        const empty = document.createElement("div");
        empty.style.cssText = "text-align:center;padding:40px;font-size:12px;color:var(--text3)";
        empty.textContent = "No matches found.";
        list.appendChild(empty);
        return;
      }
      items.forEach(b => {
        const row = document.createElement("div");
        row.style.cssText = "padding:12px 0;border-bottom:1px solid var(--border3);display:flex;gap:12px;align-items:flex-start";

        const icon = document.createElement("div");
        icon.style.cssText = "width:32px;height:32px;border-radius:8px;background:var(--teal3);border:1px solid rgba(13,148,136,0.15);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;margin-top:2px";
        icon.textContent = "🔖";

        const info = document.createElement("div");
        info.style.flex = "1";
        info.style.minWidth = "0";

        const link = document.createElement("a");
        link.href = b.url;
        link.target = "_blank";
        link.textContent = b.title;
        link.style.cssText = "font-size:13px;font-weight:500;color:var(--teal);text-decoration:none;display:block;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
        link.addEventListener("mouseenter", () => { link.style.textDecoration = "underline"; });
        link.addEventListener("mouseleave", () => { link.style.textDecoration = "none"; });

        const host = document.createElement("div");
        host.style.cssText = "font-size:11px;color:var(--text3);margin-bottom:4px";
        try { host.textContent = new URL(b.url).hostname + " · " + new Date(b.saved_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }); } catch (_) { host.textContent = b.url; }

        const summary = document.createElement("div");
        summary.style.cssText = "font-size:12px;color:var(--text2);line-height:1.5;margin-bottom:6px";
        summary.textContent = b.summary || "";

        const tags = document.createElement("div");
        tags.style.cssText = "display:flex;gap:4px;flex-wrap:wrap";
        (b.tags || []).forEach(tag => {
          const t = document.createElement("span");
          t.style.cssText = "background:var(--teal3);border:1px solid rgba(13,148,136,0.15);border-radius:10px;padding:2px 8px;font-size:10px;color:var(--teal);cursor:pointer";
          t.textContent = tag;
          t.addEventListener("click", () => { searchInput.value = tag; searchInput.dispatchEvent(new Event("input")); });
          tags.appendChild(t);
        });

        info.appendChild(link);
        info.appendChild(host);
        info.appendChild(summary);
        info.appendChild(tags);
        row.appendChild(icon);
        row.appendChild(info);

        // Delete button
        const del = document.createElement("button");
        del.style.cssText = "background:none;border:none;color:var(--text4);cursor:pointer;font-size:14px;padding:4px;border-radius:6px;flex-shrink:0;transition:color .12s";
        del.textContent = "×";
        del.title = "Delete bookmark";
        del.addEventListener("mouseenter", () => { del.style.color = "var(--red)"; });
        del.addEventListener("mouseleave", () => { del.style.color = "var(--text4)"; });
        del.addEventListener("click", async () => {
          await fetch(`${SUPABASE_URL}/rest/v1/nuur_bookmarks?id=eq.${b.id}`, {
            method: "DELETE",
            headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` }
          });
          row.style.opacity = "0";
          row.style.transition = "opacity .2s";
          setTimeout(() => row.remove(), 200);
        });
        row.appendChild(del);
        list.appendChild(row);
      });
    };

    renderBookmarks(bookmarks);

    // Search filtering
    searchInput.addEventListener("input", () => {
      const q = searchInput.value.toLowerCase().trim();
      if (!q) { renderBookmarks(bookmarks); return; }
      const filtered = bookmarks.filter(b =>
        b.title?.toLowerCase().includes(q) ||
        b.summary?.toLowerCase().includes(q) ||
        (b.tags || []).some(t => t.toLowerCase().includes(q)) ||
        b.url?.toLowerCase().includes(q)
      );
      renderBookmarks(filtered);
    });

  } catch (e) {
    list.replaceChildren();
    const err = document.createElement("div");
    err.style.cssText = "text-align:center;padding:40px;font-size:12px;color:var(--red)";
    err.textContent = "Could not load bookmarks: " + e.message;
    list.appendChild(err);
  }
}

// ── CODE ──────────────────────────────────────────────────────────
const codeEditor = document.getElementById("code-editor");
const codeOutput = document.getElementById("code-output");
const codeLang = document.getElementById("code-lang");
const codePrompt = document.getElementById("code-prompt");

codeEditor.addEventListener("input", () => {
  (document.getElementById("code-char-count") || {}).textContent = `${codeEditor.value.length} chars`;
});

async function askAboutCode(question) {
  const code = codeEditor?.value?.trim() || "";
  const lang = codeLang?.value || "javascript";

  if (!code) {
    if (codeOutput) codeOutput.textContent = "Paste some code in the editor first, then click a button.";
    return;
  }

  if (codeOutput) codeOutput.textContent = "Analyzing…";

  try {
    const fullPrompt = `${lang} code:\n\`\`\`${lang}\n${code}\n\`\`\`\n\n${question}`;
    const res = await fetch(PROXY, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` },
      body: JSON.stringify({
        model: "sonnet",
        system: "You are Nuur, an expert code assistant by Kulan Group Ltd. Give clear, direct, actionable answers. Use plain text without markdown symbols. Never use em dashes.",
        prompt: fullPrompt
      })
    });
    const data = await res.json();
    if (codeOutput) codeOutput.textContent = data.content?.[0]?.text || "No response.";
  } catch (e) {
    if (codeOutput) codeOutput.textContent = "Error: " + e.message;
  }
}

document.getElementById("code-ask-btn")?.addEventListener("click", () => askAboutCode("Analyze this code. Explain what it does, any issues you see, and how it could be improved."));
document.getElementById("code-explain-btn")?.addEventListener("click", () => askAboutCode("Explain what this code does in plain English. Be concise."));
document.getElementById("code-fix-btn")?.addEventListener("click", () => askAboutCode("Find bugs, errors, or security issues in this code. List each one with a brief fix."));
document.getElementById("code-refactor-btn")?.addEventListener("click", () => askAboutCode("Refactor this code for better readability and performance. Show the improved version."));
document.getElementById("code-copy-btn")?.addEventListener("click", () => { navigator.clipboard.writeText(codeEditor.value); });
document.getElementById("code-clear-btn")?.addEventListener("click", () => { codeEditor.value = ""; codeOutput.textContent = "Nuur's analysis will appear here."; });
document.getElementById("code-copy-output")?.addEventListener("click", () => { navigator.clipboard.writeText(codeOutput.textContent); });

codePrompt.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const q = codePrompt.value.trim();
    if (q) { askAboutCode(q); codePrompt.value = ""; }
    else { askAboutCode("Analyze this code and explain what it does."); }
  }
});
document.getElementById("code-send-btn")?.addEventListener("click", () => {
  const q = codePrompt.value.trim();
  askAboutCode(q || "Analyze this code and explain what it does.");
  codePrompt.value = "";
});

// ── VISION ────────────────────────────────────────────────────────
document.getElementById("vision-btn")?.addEventListener("click", () => {
  chrome.tabs.query({ lastFocusedWindow: true }, (tabs) => {
    const tab = tabs.find(t => t.url?.startsWith("http"));
    if (!tab) { 
      addChatMsg("nuur", "Switch to a web page tab first, then click Vision."); 
      return; 
    }
    chrome.runtime.sendMessage({ 
      type: "DO_CAPTURE_SCREEN", 
      tabId: tab.id,
      question: "Describe what you see on this page. What is the user looking at? What are the key elements?" 
    }, () => { chrome.runtime.lastError; });
    chrome.tabs.update(tab.id, { active: true });
  });
});

// ── SETTINGS ─────────────────────────────────────────────────────
document.getElementById("settings-btn")?.addEventListener("click", () => {
  window.switchView("settings");
});

// ── KEYBOARD SHORTCUTS ────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
    e.preventDefault();
    if (currentView === "chat") mainInput.focus();
    else if (currentView === "agent") agentInput.focus();
    else if (currentView === "code") codeEditor.focus();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === "1") { e.preventDefault(); window.switchView("chat"); }
  if ((e.metaKey || e.ctrlKey) && e.key === "2") { e.preventDefault(); window.switchView("agent"); }
  if ((e.metaKey || e.ctrlKey) && e.key === "3") { e.preventDefault(); window.switchView("dashboard"); }
  if ((e.metaKey || e.ctrlKey) && e.key === "4") { e.preventDefault(); window.switchView("code"); }
});

// Focus input on load
setTimeout(() => { if (currentView === "chat") mainInput.focus(); }, 100);

// ── WORKFLOWS ──────────────────────────────────────────────────────
const TEMPLATES = [
  {
    name: "Auto gap analysis on job pages",
    trigger_type: "job_page_detected",
    trigger_config: {},
    action_type: "gap_analysis",
    action_config: {},
    icon: "🎯",
    desc: "When a job page is detected, automatically compare it against your profile"
  },
  {
    name: "Draft recruiter email reply",
    trigger_type: "recruiter_email_detected",
    trigger_config: {},
    action_type: "draft_reply",
    action_config: {},
    icon: "📧",
    desc: "When a recruiter email is open in Gmail, draft a professional reply"
  },
  {
    name: "Auto-bookmark LinkedIn job postings",
    trigger_type: "linkedin_job_detected",
    trigger_config: {},
    action_type: "save_bookmark",
    action_config: {},
    icon: "🔖",
    desc: "Every LinkedIn job you open gets bookmarked automatically"
  },
  {
    name: "Summarize every new article",
    trigger_type: "keyword_on_page",
    trigger_config: { keyword: "cybersecurity" },
    action_type: "summarize_page",
    action_config: {},
    icon: "📄",
    desc: "When a page mentions cybersecurity, summarize it automatically"
  },
  {
    name: "Auto-track LinkedIn jobs",
    trigger_type: "linkedin_job_detected",
    trigger_config: {},
    action_type: "track_job",
    action_config: {},
    icon: "📊",
    desc: "Every LinkedIn job you view gets added to your tracker as 'seen'"
  },
  {
    name: "Interview prep on job pages",
    trigger_type: "job_page_detected",
    trigger_config: {},
    action_type: "run_agent",
    action_config: { goal: "Generate 5 interview questions for this job posting based on the requirements" },
    icon: "🎤",
    desc: "When a job is detected, automatically generate interview prep questions"
  }
];

let _workflowsInitialized = false;
function initWorkflowsTab() {
  if (_workflowsInitialized) {
    // Already initialized — just refresh the data
    loadWorkflows();
    loadWorkflowRuns();
    return;
  }
  _workflowsInitialized = true;
  // Render templates
  const grid = document.getElementById("template-grid");
  if (grid) {
    grid.innerHTML = "";
    TEMPLATES.forEach(tmpl => {
      const card = document.createElement("div");
      card.style.cssText = "background:var(--bg2);border:1px solid var(--border3);border-radius:10px;padding:12px 14px;cursor:pointer;transition:all .15s;display:flex;gap:10px;align-items:flex-start";
      card.addEventListener("mouseenter", () => { card.style.borderColor = "rgba(217,119,6,0.3)"; card.style.background = "var(--bg3)"; });
      card.addEventListener("mouseleave", () => { card.style.borderColor = "var(--border3)"; card.style.background = "var(--bg2)"; });

      const icon = document.createElement("div");
      icon.style.cssText = "font-size:20px;flex-shrink:0";
      icon.textContent = tmpl.icon;

      const info = document.createElement("div");
      info.style.flex = "1";
      const name = document.createElement("div");
      name.style.cssText = "font-size:12px;font-weight:500;color:var(--text1);margin-bottom:3px";
      name.textContent = tmpl.name;
      const desc = document.createElement("div");
      desc.style.cssText = "font-size:11px;color:var(--text3);line-height:1.4;margin-bottom:6px";
      desc.textContent = tmpl.desc;
      const addBtn = document.createElement("button");
      addBtn.style.cssText = "background:rgba(217,119,6,0.1);border:1px solid rgba(217,119,6,0.2);border-radius:6px;padding:3px 10px;font-size:10px;color:#D97706;cursor:pointer;font-family:var(--font)";
      addBtn.textContent = "+ Add";
      addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        saveWorkflow({ ...tmpl, enabled: true });
      });
      info.appendChild(name);
      info.appendChild(desc);
      info.appendChild(addBtn);
      card.appendChild(icon);
      card.appendChild(info);
      grid.appendChild(card);
    });
  }

  loadWorkflows();
  loadWorkflowRuns();
}

async function loadWorkflows() {
  const list = document.getElementById("workflow-list");
  if (!list) return;

  const workflows = await new Promise(resolve => {
    chrome.runtime.sendMessage({ type: "GET_WORKFLOWS" }, (res) => {
      if (chrome.runtime.lastError) { resolve([]); return; }
      resolve(res || []);
    });
  });

  list.innerHTML = "";
  if (!workflows.length) {
    const empty = document.createElement("div");
    empty.className = "dash-empty";
    empty.textContent = "No workflows yet. Create one above or use a template.";
    list.appendChild(empty);
    return;
  }

  workflows.forEach(wf => {
    const item = document.createElement("div");
    item.style.cssText = "background:var(--bg2);border:1px solid var(--border3);border-radius:10px;padding:12px 16px;display:flex;align-items:center;gap:12px;margin-bottom:8px";

    const toggle = document.createElement("div");
    toggle.style.cssText = `width:36px;height:20px;border-radius:10px;cursor:pointer;transition:all .2s;background:${wf.enabled ? "var(--teal)" : "var(--bg4)"};position:relative;flex-shrink:0`;
    const dot = document.createElement("div");
    dot.style.cssText = `width:14px;height:14px;border-radius:50%;background:#fff;position:absolute;top:3px;left:${wf.enabled ? "18px" : "3px"};transition:left .2s`;
    toggle.appendChild(dot);
    toggle.addEventListener("click", async () => {
      const newState = !wf.enabled;
      wf.enabled = newState;
      toggle.style.background = newState ? "var(--teal)" : "var(--bg4)";
      dot.style.left = newState ? "18px" : "3px";
      chrome.runtime.sendMessage({ type: "TOGGLE_WORKFLOW", id: wf.id, enabled: newState }, () => { chrome.runtime.lastError; });
    });

    const info = document.createElement("div");
    info.style.flex = "1";
    const name = document.createElement("div");
    name.style.cssText = "font-size:12px;font-weight:500;color:var(--text1);margin-bottom:2px";
    name.textContent = wf.name;
    const meta = document.createElement("div");
    meta.style.cssText = "font-size:10px;color:var(--text4);display:flex;gap:8px";
    const triggerTag = document.createElement("span");
    triggerTag.style.cssText = "background:var(--border3);padding:1px 6px;border-radius:6px";
    triggerTag.textContent = wf.trigger_type?.replace(/_/g, " ");
    const actionTag = document.createElement("span");
    actionTag.style.cssText = "background:rgba(217,119,6,0.08);color:#D97706;padding:1px 6px;border-radius:6px";
    actionTag.textContent = wf.action_type?.replace(/_/g, " ");
    const runs = document.createElement("span");
    runs.textContent = `${wf.run_count || 0} runs`;
    meta.appendChild(triggerTag);
    meta.appendChild(actionTag);
    meta.appendChild(runs);
    info.appendChild(name);
    info.appendChild(meta);

    const delBtn = document.createElement("button");
    delBtn.style.cssText = "background:none;border:none;color:var(--text4);cursor:pointer;font-size:14px;padding:0;line-height:1;transition:color .12s";
    delBtn.textContent = "×";
    delBtn.addEventListener("mouseenter", () => { delBtn.style.color = "var(--red)"; });
    delBtn.addEventListener("mouseleave", () => { delBtn.style.color = "var(--text4)"; });
    delBtn.addEventListener("click", async () => {
      chrome.runtime.sendMessage({ type: "DELETE_WORKFLOW", id: wf.id }, () => { chrome.runtime.lastError; });
      item.remove();
      if (!list.children.length) {
        const empty = document.createElement("div");
        empty.className = "dash-empty";
        empty.textContent = "No workflows yet.";
        list.appendChild(empty);
      }
    });

    item.appendChild(toggle);
    item.appendChild(info);
    item.appendChild(delBtn);
    list.appendChild(item);
  });
}

async function loadWorkflowRuns() {
  const runsEl = document.getElementById("workflow-runs");
  if (!runsEl) return;

  const runs = await new Promise(resolve => {
    chrome.runtime.sendMessage({ type: "GET_WORKFLOW_RUNS" }, (res) => {
      if (chrome.runtime.lastError) { resolve([]); return; }
      resolve(res || []);
    });
  });

  runsEl.innerHTML = "";
  if (!runs.length) {
    const empty = document.createElement("div");
    empty.className = "dash-empty";
    empty.textContent = "No workflow runs yet.";
    runsEl.appendChild(empty);
    return;
  }

  runs.slice(0, 8).forEach(run => {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border3);font-size:11px;color:var(--text3)";
    const dot = document.createElement("div");
    dot.style.cssText = "width:6px;height:6px;border-radius:50%;background:var(--teal);flex-shrink:0";
    const trigger = document.createElement("span");
    trigger.textContent = run.trigger_type?.replace(/_/g, " ") || "";
    const time = document.createElement("span");
    time.style.marginLeft = "auto";
    time.textContent = new Date(run.ran_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    row.appendChild(dot);
    row.appendChild(trigger);
    row.appendChild(time);
    runsEl.appendChild(row);
  });
}

async function saveWorkflow(wf) {
  const ok = await new Promise(resolve => {
    chrome.runtime.sendMessage({ type: "SAVE_WORKFLOW", workflow: wf }, (res) => {
      if (chrome.runtime.lastError) { resolve(false); return; }
      resolve(res?.ok);
    });
  });
  if (ok) {
    (document.getElementById("workflow-builder") || {style:{}}).style.display = "none";
    (document.getElementById("wf-name") || {}).value = "";
    loadWorkflows();
  }
}

// Workflow builder UI
document.getElementById("new-workflow-btn")?.addEventListener("click", () => {
  const builder = document.getElementById("workflow-builder");
  builder.style.display = builder.style.display === "none" ? "block" : "none";
  if (builder.style.display === "block") document.getElementById("wf-name")?.focus();
});

document.getElementById("wf-cancel-btn")?.addEventListener("click", () => {
  (document.getElementById("workflow-builder") || {style:{}}).style.display = "none";
});

// Trigger config placeholder hints
document.getElementById("wf-trigger")?.addEventListener("change", () => {
  const val = document.getElementById("wf-trigger")?.value;
  const hints = {
    page_visit: "URL contains: (e.g. linkedin.com)",
    keyword_on_page: "Keyword: (e.g. cybersecurity)",
    scheduled: "Hour (0-23): (e.g. 9 for 9am)"
  };
  (document.getElementById("wf-trigger-config") || {}).placeholder = hints[val] || "No config needed";
});

document.getElementById("wf-action")?.addEventListener("change", () => {
  const val = document.getElementById("wf-action")?.value;
  const hints = {
    run_agent: "Agent goal: (e.g. Summarize this job)",
    notify: "Message: (e.g. New job page detected)"
  };
  (document.getElementById("wf-action-config") || {}).placeholder = hints[val] || "No config needed";
});

document.getElementById("wf-save-btn")?.addEventListener("click", () => {
  const name = document.getElementById("wf-name")?.value.trim();
  const triggerType = document.getElementById("wf-trigger")?.value;
  const triggerRaw = document.getElementById("wf-trigger-config")?.value.trim();
  const actionType = document.getElementById("wf-action")?.value;
  const actionRaw = document.getElementById("wf-action-config")?.value.trim();

  if (!name) { document.getElementById("wf-name")?.focus(); return; }

  // Parse trigger config
  let triggerConfig = {};
  if (triggerType === "page_visit" && triggerRaw) triggerConfig = { url_pattern: triggerRaw.replace("URL contains:", "").trim() };
  if (triggerType === "keyword_on_page" && triggerRaw) triggerConfig = { keyword: triggerRaw.replace("Keyword:", "").trim() };
  if (triggerType === "scheduled" && triggerRaw) triggerConfig = { hour: parseInt(triggerRaw.replace(/\D/g, "")) || 9 };

  let actionConfig = {};
  if (actionType === "run_agent" && actionRaw) actionConfig = { goal: actionRaw };
  if (actionType === "notify" && actionRaw) actionConfig = { message: actionRaw };

  saveWorkflow({ name, trigger_type: triggerType, trigger_config: triggerConfig, action_type: actionType, action_config: actionConfig, enabled: true, run_count: 0 });
});

// Workflows and settings load when their tab opens — hook into switchView
const _baseSwitchView = switchView;
window.switchView = function(view) {
  _baseSwitchView(view);
  if (view === "workflows") initWorkflowsTab();
  if (view === "settings") initSettingsTab();
};
// Re-wire tab buttons to use the patched version
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => window.switchView(btn.dataset.view));
});

// ── DAILY BRIEFING ─────────────────────────────────────────────────
async function loadBriefing() {
  const el = document.getElementById("dash-briefing");
  if (!el) return;

  try {
    // Get apps needing follow-up (applied > 6 days ago, no update)
    const sixDaysAgo = new Date(Date.now() - 6 * 86400000).toISOString();
    const appsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/nuur_applications?user_id=eq.${NUUR_USER_ID}&status=eq.applied&applied_at=lt.${sixDaysAgo}&order=applied_at.desc&limit=3`,
      { headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` } }
    );
    const followUps = await appsRes.json();

    el.innerHTML = "";

    const h = new Date().getHours();
    const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";

    // Header
    const hdr = document.createElement("div");
    hdr.style.cssText = "font-size:13px;font-weight:500;color:var(--text0);margin-bottom:12px;display:flex;align-items:center;gap:6px";
    const sun = document.createElement("span");
    sun.style.cssText = "font-size:16px";
    sun.textContent = "☀️";
    const greetText = document.createTextNode(` ${greeting}, Mohamud`);
    hdr.appendChild(sun);
    hdr.appendChild(greetText);
    el.appendChild(hdr);

    const items = [];

    // Follow-ups needed
    if (followUps.length) {
      followUps.forEach(app => {
        const days = Math.floor((Date.now() - new Date(app.applied_at)) / 86400000);
        items.push({ icon: "📬", color: "var(--gold)", text: `Follow up on ${app.job_title} at ${app.company} — ${days} days ago`, action: "Draft follow-up" });
      });
    }

    // Always show a motivation item
    items.push({ icon: "🎯", color: "var(--teal)", text: "Security+ certified. GRC Analyst, SOC Analyst, IT Security Analyst — keep applying.", action: null });

    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "font-size:12px;color:var(--text3)";
      empty.textContent = "All caught up. No follow-ups needed today.";
      el.appendChild(empty);
      return;
    }

    items.forEach(item => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid var(--border3)";
      const icon = document.createElement("span");
      icon.style.cssText = "font-size:14px;flex-shrink:0";
      icon.textContent = item.icon;
      const text = document.createElement("div");
      text.style.cssText = `font-size:12px;color:var(--text2);flex:1;line-height:1.5`;
      text.textContent = item.text;
      row.appendChild(icon);
      row.appendChild(text);
      if (item.action) {
        const btn = document.createElement("button");
        btn.style.cssText = "background:rgba(217,119,6,0.1);border:1px solid rgba(217,119,6,0.2);border-radius:6px;padding:3px 9px;font-size:10px;color:var(--gold);cursor:pointer;white-space:nowrap;font-family:var(--font)";
        btn.textContent = item.action;
        btn.addEventListener("click", () => {
          mainInput.value = `Write a professional follow-up email for a job application to ${item.text.split(" at ")[1]?.split(" —")[0] || "this company"}`;
          switchView("chat");
          handleChatSend();
        });
        row.appendChild(btn);
      }
      el.appendChild(row);
    });

  } catch (_) {
    const el2 = document.getElementById("dash-briefing");
    if (el2) { el2.innerHTML = ""; const p = document.createElement("div"); p.style.cssText = "font-size:12px;color:var(--text3)"; p.textContent = "Could not load briefing."; el2.appendChild(p); }
  }
}

// ── LINKEDIN POST COMPOSER ─────────────────────────────────────────
function showLinkedInComposer() {
  // Switch to chat and pre-load a LinkedIn post prompt
  switchView("chat");
  const topics = [
    "Write a LinkedIn post about my Security+ certification and what I learned studying for it",
    "Write a LinkedIn post about building Kulan Group and why I started it",
    "Write a LinkedIn post sharing a cybersecurity tip for non-technical people"
  ];
  const topic = topics[Math.floor(Math.random() * topics.length)];

  if (welcomeScreen) welcomeScreen.style.display = "none";

  // Show topic picker
  const picker = document.createElement("div");
  picker.style.cssText = "max-width:680px;margin:24px auto;padding:0 48px";
  const title = document.createElement("div");
  title.style.cssText = "font-size:13px;font-weight:500;color:var(--text0);margin-bottom:12px";
  title.textContent = "✦ Write a LinkedIn post — pick a topic or type your own:";
  picker.appendChild(title);

  const grid = document.createElement("div");
  grid.style.cssText = "display:flex;flex-direction:column;gap:8px;margin-bottom:16px";

  [
    "Security+ certification — what I learned and why it matters",
    "Building Kulan Group — from idea to product",
    "Cybersecurity tip for everyday people",
    "My journey from IT support to cybersecurity founder",
    "Why I create bilingual Somali tech content",
    "What I've learned about GRC from studying for Security+"
  ].forEach(t => {
    const chip = document.createElement("div");
    chip.style.cssText = "background:var(--bg2);border:1px solid var(--border3);border-radius:10px;padding:10px 14px;cursor:pointer;font-size:12px;color:var(--text2);transition:all .12s;display:flex;align-items:center;justify-content:space-between";
    chip.textContent = t;
    const arr = document.createElement("span");
    arr.style.cssText = "color:var(--teal);font-size:11px;flex-shrink:0;margin-left:8px";
    arr.textContent = "→";
    chip.appendChild(arr);
    chip.addEventListener("mouseenter", () => { chip.style.borderColor = "var(--border2)"; chip.style.color = "var(--text0)"; });
    chip.addEventListener("mouseleave", () => { chip.style.borderColor = "var(--border3)"; chip.style.color = "var(--text2)"; });
    chip.addEventListener("click", () => {
      picker.remove();
      mainInput.value = `Write a LinkedIn post about: ${t}. Rules: first person, conversational, do NOT start with "I", no hashtags, no em dashes, no AI phrases like "excited to share" or "thrilled" or "I'm proud", max 200 words, end with a genuine question. Draw from my real background: Security+ certified, Founder of Kulan Group, cybersecurity professional, Somali community builder, Columbus OH.`;
      handleChatSend();
    });
    grid.appendChild(chip);
  });
  picker.appendChild(grid);
  chatArea.appendChild(picker);
  chatArea.scrollTop = chatArea.scrollHeight;
}

// ── RESUME VERSION MANAGER ─────────────────────────────────────────
const RESUME_VERSIONS = {
  grc: {
    label: "GRC Analyst",
    color: "var(--teal)",
    summary: "Security+ certified IT professional with hands-on experience in risk management, policy development, and compliance frameworks including NIST CSF and ISO 27001. Founded Kulan Group Ltd, overseeing security governance across four digital products. Seeking Junior GRC Analyst roles in Columbus, OH."
  },
  soc: {
    label: "SOC Analyst Tier 1",
    color: "var(--gold)",
    summary: "CompTIA Security+ certified professional with experience in threat detection, log analysis, and endpoint security. Background in IT support at Franklin University with exposure to Active Directory, network monitoring, and incident response procedures. Targeting SOC Analyst Tier 1 roles."
  },
  itsec: {
    label: "IT Security Analyst",
    color: "#8b5cf6",
    summary: "Security+ certified IT professional combining technical support experience with cybersecurity expertise. Proficient in Windows administration, Active Directory, vulnerability assessment, and security policy implementation. Experience managing security posture across cloud and on-premise environments."
  }
};

function showResumeManager() {
  switchView("chat");
  if (welcomeScreen) welcomeScreen.style.display = "none";

  const panel = document.createElement("div");
  panel.style.cssText = "max-width:680px;margin:24px auto;padding:0 48px";

  const title = document.createElement("div");
  title.style.cssText = "font-size:13px;font-weight:500;color:var(--text0);margin-bottom:12px";
  title.textContent = "✦ Resume Versions — pick the right one for each application:";
  panel.appendChild(title);

  Object.entries(RESUME_VERSIONS).forEach(([key, ver]) => {
    const card = document.createElement("div");
    card.style.cssText = `background:var(--bg2);border:1px solid var(--border3);border-radius:12px;padding:14px 16px;margin-bottom:10px`;

    const hdr = document.createElement("div");
    hdr.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:8px";
    const lbl = document.createElement("div");
    lbl.style.cssText = `font-size:12px;font-weight:500;color:${ver.color}`;
    lbl.textContent = ver.label;
    const copyBtn = document.createElement("button");
    copyBtn.style.cssText = `background:transparent;border:1px solid var(--border3);border-radius:6px;padding:3px 10px;font-size:10px;color:var(--text3);cursor:pointer;font-family:var(--font);transition:all .12s`;
    copyBtn.textContent = "Copy summary";
    copyBtn.addEventListener("mouseenter", () => { copyBtn.style.color = ver.color; copyBtn.style.borderColor = ver.color; });
    copyBtn.addEventListener("mouseleave", () => { copyBtn.style.color = "var(--text3)"; copyBtn.style.borderColor = "var(--border3)"; });
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(ver.summary).catch(() => {});
      copyBtn.textContent = "Copied!";
      setTimeout(() => { copyBtn.textContent = "Copy summary"; }, 2000);
    });
    hdr.appendChild(lbl);
    hdr.appendChild(copyBtn);

    const summ = document.createElement("div");
    summ.style.cssText = "font-size:12px;color:var(--text2);line-height:1.6;margin-bottom:8px";
    summ.textContent = ver.summary;

    const editBtn = document.createElement("button");
    editBtn.style.cssText = "background:none;border:none;color:var(--teal);font-size:11px;cursor:pointer;padding:0;font-family:var(--font)";
    editBtn.textContent = "Improve with AI →";
    editBtn.addEventListener("click", () => {
      panel.remove();
      mainInput.value = `Improve this resume summary for a ${ver.label} role. Keep it under 60 words, first person, no AI phrases:\n\n${ver.summary}`;
      handleChatSend();
    });

    card.appendChild(hdr);
    card.appendChild(summ);
    card.appendChild(editBtn);
    panel.appendChild(card);
  });

  chatArea.appendChild(panel);
  chatArea.scrollTop = chatArea.scrollHeight;
}

// ── SETTINGS TAB ──────────────────────────────────────────────────
let _settingsInitialized = false;

async function initSettingsTab() {
  // Guard — only wire up listeners once
  const firstTime = !_settingsInitialized;
  _settingsInitialized = true;
  // ── APPEARANCE ─────────────────────────────────────────────
  const themeToggleEl = document.getElementById("newtab-toggle");
  const themeDotEl = document.getElementById("newtab-dot");

  // Init new tab toggle state
  const { nuur_newtab_disabled } = await new Promise(r => chrome.storage.local.get("nuur_newtab_disabled", r));
  const ntEnabled = !nuur_newtab_disabled;
  if (themeToggleEl && themeDotEl) {
    themeToggleEl.style.background = ntEnabled ? "var(--teal)" : "#cbd5e1";
    themeDotEl.style.left = ntEnabled ? "22px" : "3px";
    themeToggleEl.addEventListener("click", async () => {
      const { nuur_newtab_disabled: cur } = await new Promise(r => chrome.storage.local.get("nuur_newtab_disabled", r));
      const nowOn = !!cur;
      await new Promise(r => chrome.storage.local.set({ nuur_newtab_disabled: !nowOn }, r));
      themeToggleEl.style.background = nowOn ? "var(--teal)" : "#cbd5e1";
      themeDotEl.style.left = nowOn ? "22px" : "3px";
    });
  }

  // ── THEME PICKER ───────────────────────────────────────────
  const themeContainer = document.getElementById("settings-theme-grid");
  if (themeContainer && firstTime) {
    themeContainer.innerHTML = "";
    const currentTheme = localStorage.getItem("nuur_theme") || "literary";
    const themes = [
      { id: "literary",  label: "Literary",  swatch: "#6366F1", bg: "#FAF5EC", ink: "#1A1726", bubble: "#fff" },
      { id: "light",     label: "Indigo",    swatch: "#4F46E5", bg: "#f8f9fc", ink: "#0f172a", bubble: "#fff" },
      { id: "navy",      label: "Navy",      swatch: "#D97706", bg: "#f0f2f7", ink: "#0B2545", bubble: "#fff" },
      { id: "charcoal",  label: "Coral",     swatch: "#D85A30", bg: "#f5f3f0", ink: "#1a1714", bubble: "#fff" },
      { id: "purple",    label: "Purple",    swatch: "#7F77DD", bg: "#f5f3fe", ink: "#1e1b4b", bubble: "#fff" },
      { id: "forest",    label: "Forest",    swatch: "#3B6D11", bg: "#f2f5f0", ink: "#173404", bubble: "#fff" },
      { id: "rose",      label: "Rose",      swatch: "#D4537E", bg: "#fdf4f7", ink: "#4B1528", bubble: "#fff" },
      { id: "dark",      label: "Midnight",  swatch: "#0D9488", bg: "#0a0f1a", ink: "#e2e8f0", bubble: "#111827" },
      { id: "black",     label: "Black",     swatch: "#e5e5e5", bg: "#000",    ink: "#f5f5f5", bubble: "#111" },
      { id: "system",    label: "System",    swatch: "#6366F1", bg: "linear-gradient(135deg,#FAF5EC 50%,#0a0f1a 50%)", ink: "#1A1726", bubble: "#fff" },
    ];
    themes.forEach(({ id, label, swatch, bg, ink, bubble }) => {
      const isActive = currentTheme === id;
      const card = document.createElement("div");
      card.dataset.themeId = id;
      card.style.cssText = `border-radius:10px;cursor:pointer;border:${isActive ? "2px solid #6366F1" : "1.5px solid rgba(60,40,30,0.10)"};overflow:hidden;transition:all .15s;position:relative`;
      card.title = label;

      // Mini app preview
      const preview = document.createElement("div");
      preview.style.cssText = `background:${bg};padding:6px 6px 5px`;

      // Fake header bar
      const hdr = document.createElement("div");
      hdr.style.cssText = `height:4px;border-radius:2px;background:${swatch};margin-bottom:4px;opacity:0.9`;
      preview.appendChild(hdr);

      // Fake message bubble
      const msgRow = document.createElement("div");
      msgRow.style.cssText = "display:flex;gap:3px;margin-bottom:4px;align-items:flex-end";
      const dot = document.createElement("div");
      dot.style.cssText = `width:6px;height:6px;border-radius:50%;background:${swatch};flex-shrink:0`;
      const bub = document.createElement("div");
      bub.style.cssText = `flex:1;height:8px;border-radius:1px 4px 4px 4px;background:${bubble};border:0.5px solid rgba(0,0,0,0.07)`;
      msgRow.appendChild(dot); msgRow.appendChild(bub);
      preview.appendChild(msgRow);

      // Fake button
      const btn = document.createElement("div");
      btn.style.cssText = `height:5px;border-radius:2px;background:${swatch};width:55%;margin:0 auto`;
      preview.appendChild(btn);

      card.appendChild(preview);

      // Label row
      const foot = document.createElement("div");
      foot.style.cssText = `padding:4px 5px;background:var(--bg1);display:flex;align-items:center;justify-content:space-between`;
      const lbl = document.createElement("span");
      lbl.style.cssText = `font-size:10px;color:${isActive ? "#6366F1" : "var(--text2)"};font-weight:${isActive ? "600" : "400"}`;
      lbl.textContent = label;
      foot.appendChild(lbl);

      // Checkmark on active
      if (isActive) {
        const chk = document.createElement("div");
        chk.style.cssText = "width:14px;height:14px;border-radius:50%;background:#6366F1;display:flex;align-items:center;justify-content:center;flex-shrink:0";
        chk.innerHTML = `<svg width="8" height="8" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        foot.appendChild(chk);
      }
      card.appendChild(foot);

      card.addEventListener("click", () => {
        localStorage.setItem("nuur_theme", id);
        if (typeof applyNewtabTheme === "function") applyNewtabTheme();
        chrome.runtime.sendMessage({ type: "THEME_CHANGED", theme: id }, () => { chrome.runtime.lastError; });
        // Update borders + checkmarks in place — no re-init needed
        themeContainer.querySelectorAll("[data-theme-id]").forEach(c => {
          const isNowActive = c.dataset.themeId === id;
          c.style.border = isNowActive ? "2px solid #6366F1" : "1.5px solid rgba(60,40,30,0.10)";
          const lbl = c.querySelector("span");
          if (lbl) { lbl.style.color = isNowActive ? "#6366F1" : "var(--text2)"; lbl.style.fontWeight = isNowActive ? "600" : "400"; }
          const existingChk = c.querySelector(".theme-chk");
          if (isNowActive && !existingChk) {
            const chk = document.createElement("div");
            chk.className = "theme-chk";
            chk.style.cssText = "width:14px;height:14px;border-radius:50%;background:#6366F1;display:flex;align-items:center;justify-content:center;flex-shrink:0";
            chk.innerHTML = '<svg width="8" height="8" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            const foot = c.querySelector("div:last-child");
            if (foot) foot.appendChild(chk);
          } else if (!isNowActive && existingChk) {
            existingChk.remove();
          }
        });
      });
      themeContainer.appendChild(card);
    });
  }

  // ── FONT SIZE ──────────────────────────────────────────────
  const fontContainer = document.getElementById("settings-font-row");
  if (fontContainer && firstTime) {
    fontContainer.innerHTML = "";
    const currentFont = localStorage.getItem("nuur_font") || "small";
    const fonts = [
      { id: "small",  label: "A",  desc: "Default", size: "13px" },
      { id: "medium", label: "A",  desc: "Medium",  size: "15px" },
      { id: "large",  label: "A",  desc: "Large",   size: "18px" },
    ];
    // Segmented control wrapper
    const seg = document.createElement("div");
    seg.style.cssText = "display:flex;background:rgba(60,40,30,0.05);border-radius:10px;padding:3px;gap:2px";
    fonts.forEach(({ id, label, desc, size }) => {
      const active = currentFont === id;
      const btn = document.createElement("div");
      btn.dataset.fontId = id;
      btn.style.cssText = `flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:8px 6px;border-radius:8px;cursor:pointer;transition:all .12s;background:${active ? "#6366F1" : "transparent"}`;
      const ltr = document.createElement("span");
      ltr.style.cssText = `font-size:${size};font-weight:500;color:${active ? "#fff" : "var(--text2)"}`;
      ltr.textContent = label;
      const dlbl = document.createElement("span");
      dlbl.style.cssText = `font-size:11px;color:${active ? "rgba(255,255,255,0.8)" : "var(--text3)"}`;
      dlbl.textContent = desc;
      btn.appendChild(ltr); btn.appendChild(dlbl);
      btn.addEventListener("click", () => {
        localStorage.setItem("nuur_font", id);
        document.documentElement.className = document.documentElement.className.replace(/font-\S+/g, "").trim();
        document.body.className = document.body.className.replace(/font-\S+/g, "").trim();
        if (id !== "small") { document.documentElement.classList.add("font-" + id); document.body.classList.add("font-" + id); }
        seg.querySelectorAll("[data-font-id]").forEach(b => {
          const isCurrent = b.dataset.fontId === id;
          b.style.background = isCurrent ? "#6366F1" : "transparent";
          b.querySelector("span:first-child").style.color = isCurrent ? "#fff" : "var(--text2)";
          b.querySelector("span:last-child").style.color = isCurrent ? "rgba(255,255,255,0.8)" : "var(--text3)";
        });
      });
      seg.appendChild(btn);
    });
    fontContainer.appendChild(seg);
  }

  // Notification preferences
  const notifContainer = document.getElementById("notif-prefs-container");
  if (notifContainer && !notifContainer.dataset.initialized) {
    notifContainer.dataset.initialized = "1";
    buildNotifPrefsUI(notifContainer);
  }

  // Quick action pins
  const pinsContainer = document.getElementById("quick-pins-container");
  if (pinsContainer && !pinsContainer.dataset.initialized) {
    pinsContainer.dataset.initialized = "1";
    buildPinnedActionsUI(pinsContainer);
  }

  // Default tab selector
  const defaultTabEl = document.getElementById("settings-default-tab");
  if (defaultTabEl) {
    defaultTabEl.value = localStorage.getItem("nuur_default_tab") || "chat";
    defaultTabEl.addEventListener("change", () => {
      localStorage.setItem("nuur_default_tab", defaultTabEl.value);
    });
  }

  // Privacy mode toggle
  const privacyToggle = document.getElementById("privacy-toggle");
  const privacyDot = document.getElementById("privacy-dot");
  if (privacyToggle && privacyDot) {
    const privOn = localStorage.getItem("nuur_privacy") === "on";
    privacyToggle.style.background = privOn ? "#D97706" : "#cbd5e1";
    privacyDot.style.left = privOn ? "22px" : "3px";
    privacyToggle.addEventListener("click", () => {
      const nowOn = localStorage.getItem("nuur_privacy") !== "on";
      localStorage.setItem("nuur_privacy", nowOn ? "on" : "off");
      privacyToggle.style.background = nowOn ? "#D97706" : "#cbd5e1";
      privacyDot.style.left = nowOn ? "22px" : "3px";
      applyPrivacyMode();
    });
  }

  // Language toggle
  const langToggle = document.getElementById("language-toggle");
  const langDot = document.getElementById("language-dot");
  const langLabel = document.getElementById("language-label");
  if (langToggle && langDot) {
    const somaliOn = localStorage.getItem("nuur_language") === "somali";
    langToggle.style.background = somaliOn ? "var(--teal)" : "#cbd5e1";
    langDot.style.left = somaliOn ? "22px" : "3px";
    if (langLabel) langLabel.textContent = somaliOn ? "Af Soomaali" : "English";
    langToggle.addEventListener("click", () => {
      const nowSomali = localStorage.getItem("nuur_language") !== "somali";
      localStorage.setItem("nuur_language", nowSomali ? "somali" : "english");
      langToggle.style.background = nowSomali ? "var(--teal)" : "#cbd5e1";
      langDot.style.left = nowSomali ? "22px" : "3px";
      if (langLabel) langLabel.textContent = nowSomali ? "Af Soomaali" : "English";
    });
  }

  // Load memory into fields
  const memory = await new Promise(resolve => {
    chrome.runtime.sendMessage({ type: "GET_MEMORY" }, (res) => {
      if (chrome.runtime.lastError) { resolve({}); return; }
      resolve(res || {});
    });
  });

  const toneEl = document.getElementById("mem-tone");
  const lengthEl = document.getElementById("mem-length");
  if (toneEl && memory?.writing_style?.tone) toneEl.value = memory.writing_style.tone;
  if (lengthEl && memory?.writing_style?.length) lengthEl.value = memory.writing_style.length;

  // Save profile — only wire once
  if (firstTime) {
    document.getElementById("save-profile-btn")?.addEventListener("click", async () => {
    const profile = {
      full_name: document.getElementById("pf-name")?.value?.trim(),
      email: document.getElementById("pf-email")?.value?.trim(),
      phone: document.getElementById("pf-phone")?.value?.trim(),
      location: document.getElementById("pf-location")?.value?.trim(),
      linkedin_url: document.getElementById("pf-linkedin")?.value?.trim(),
      portfolio_url: document.getElementById("pf-portfolio")?.value?.trim(),
      certifications: document.getElementById("pf-certs")?.value?.split(",").map(s => s.trim()),
    };

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/nuur_profile?user_id=eq.${NUUR_USER_ID}`, {
        method: "PATCH",
        headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(profile)
      });
      const btn = document.getElementById("save-profile-btn");
      if (btn) { btn.textContent = "Saved!"; setTimeout(() => { btn.textContent = "Save profile"; }, 2000); }
    } catch (_) {}
  });

  // Save memory preferences
  document.getElementById("save-memory-btn")?.addEventListener("click", async () => {
    const custom = document.getElementById("mem-custom")?.value?.trim();
    const tone = document.getElementById("mem-tone")?.value;
    const length = document.getElementById("mem-length")?.value;
    const payload = custom || `Writing tone: ${tone}. Response length: ${length}.`;
    chrome.runtime.sendMessage({ type: "LEARN_FROM_CONVERSATION", userMessage: payload, nuurResponse: "Preferences saved." }, () => { chrome.runtime.lastError; });
    const btn = document.getElementById("save-memory-btn");
    if (btn) { btn.textContent = "Saved!"; setTimeout(() => { btn.textContent = "Save memory"; }, 2000); }
  });

  // Clear memory
  document.getElementById("clear-memory-btn")?.addEventListener("click", async () => {
    if (!confirm("Clear all Nuur memory? This cannot be undone.")) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/nuur_memory?user_id=eq.${NUUR_USER_ID}`, {
        method: "DELETE",
        headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` }
      });
      const btn = document.getElementById("clear-memory-btn");
      if (btn) { btn.textContent = "Cleared!"; setTimeout(() => { btn.textContent = "Clear all memory"; }, 2000); }
    } catch (_) {}
  });

  // Bookmark search
  document.getElementById("bookmark-search-btn")?.addEventListener("click", searchBookmarks);
  document.getElementById("bookmark-search")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") searchBookmarks();
  });

  } // end firstTime guard
}

async function searchBookmarks() {
  const query = document.getElementById("bookmark-search")?.value?.trim();
  const resultsEl = document.getElementById("bookmark-results");
  if (!query || !resultsEl) return;

  resultsEl.innerHTML = "";
  const loading = document.createElement("div");
  loading.style.cssText = "font-size:12px;color:var(--text3);padding:8px 0";
  loading.textContent = "Searching…";
  resultsEl.appendChild(loading);

  try {
    // Fetch all bookmarks and do AI-powered semantic matching
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/nuur_bookmarks?user_id=eq.${NUUR_USER_ID}&order=saved_at.desc&limit=100`,
      { headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` } }
    );
    const bookmarks = await res.json();

    if (!bookmarks.length) {
      loading.textContent = "No bookmarks saved yet.";
      return;
    }

    // Use Claude to find semantically matching bookmarks
    const bookmarkList = bookmarks.map((b, i) => `${i}: ${b.title} — ${b.summary} [${(b.tags || []).join(", ")}]`).join("\n");
    const aiRes = await fetch(PROXY, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` },
      body: JSON.stringify({
        prompt: `Find the bookmarks that best match this search query: "${query}"\n\nBookmarks:\n${bookmarkList}\n\nReturn only the index numbers of matching bookmarks, comma separated. If none match, return "none".`,
        model: "haiku",
        system: "You are a semantic search engine. Return only comma-separated index numbers like: 0,3,7 or 'none'. Nothing else."
      })
    });
    const aiData = await aiRes.json();
    const indices = aiData.content?.[0]?.text?.trim() || "none";

    resultsEl.innerHTML = "";

    if (indices === "none") {
      const empty = document.createElement("div");
      empty.style.cssText = "font-size:12px;color:var(--text3);padding:8px 0";
      empty.textContent = "No bookmarks found matching that search.";
      resultsEl.appendChild(empty);
      return;
    }

    const matchedIndices = indices.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    const matched = matchedIndices.map(i => bookmarks[i]).filter(Boolean);

    matched.forEach(b => {
      const item = document.createElement("div");
      item.style.cssText = "padding:10px 0;border-bottom:1px solid var(--border3)";

      const link = document.createElement("a");
      link.href = b.url;
      link.target = "_blank";
      link.style.cssText = "font-size:12px;color:var(--teal);font-weight:500;display:block;margin-bottom:3px;text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
      link.textContent = b.title;

      const summ = document.createElement("div");
      summ.style.cssText = "font-size:11px;color:var(--text3);margin-bottom:5px";
      summ.textContent = b.summary;

      const tags = document.createElement("div");
      tags.style.cssText = "display:flex;gap:4px;flex-wrap:wrap";
      (b.tags || []).forEach(tag => {
        const t = document.createElement("span");
        t.style.cssText = "background:rgba(13,148,136,0.08);border:1px solid rgba(13,148,136,0.15);border-radius:10px;padding:1px 7px;font-size:10px;color:var(--teal)";
        t.textContent = tag;
        tags.appendChild(t);
      });

      item.appendChild(link);
      item.appendChild(summ);
      item.appendChild(tags);
      resultsEl.appendChild(item);
    });

  } catch (e) {
    resultsEl.innerHTML = "";
    const err = document.createElement("div");
    err.style.cssText = "font-size:12px;color:#f87171;padding:8px 0";
    err.textContent = "Search error: " + e.message;
    resultsEl.appendChild(err);
  }
}

// ── REDIRECT WHEN DISABLED ────────────────────────────────────────
chrome.storage.local.get("nuur_newtab_disabled", ({ nuur_newtab_disabled }) => {
  if (nuur_newtab_disabled) {
    window.location.replace("https://www.google.com");
  }
});

// ── 1. CHAT EXPORT ────────────────────────────────────────────────
function exportChat() {
  const rows = document.querySelectorAll(".chat-row");
  if (!rows.length) { addChatMsg("nuur", "Nothing to export yet — start a conversation first."); return; }

  const lines = [`Nuur Chat Export — ${new Date().toLocaleString()}\n${"=".repeat(50)}\n`];
  rows.forEach(row => {
    const isUser = row.classList.contains("user");
    const bubble = row.querySelector(".chat-bubble");
    if (!bubble) return;
    const speaker = isUser ? "You" : "Nuur";
    lines.push(`[${speaker}]\n${bubble.innerText.trim()}\n`);
  });

  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nuur-chat-${new Date().toISOString().split("T")[0]}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// Export button — add to input bar hints
if (!document.getElementById("nuur-export-hint")) {
  const exportHint = document.createElement("div");
  exportHint.id = "nuur-export-hint";
  exportHint.className = "hint-chip";
  exportHint.textContent = "Export chat";
  exportHint.addEventListener("click", exportChat);
  document.querySelector(".input-hints")?.appendChild(exportHint);
}

// ── 2. FOLLOW-UP REMINDERS ────────────────────────────────────────
async function setFollowUpReminder(appId, jobTitle, company, days) {
  const remindAt = new Date(Date.now() + days * 86400000).toISOString();
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/nuur_applications?id=eq.${appId}`, {
      method: "PATCH",
      headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ follow_up_at: remindAt, notes: `Follow-up set for ${new Date(remindAt).toLocaleDateString()}` })
    });
    return true;
  } catch (_) { return false; }
}

async function checkFollowUpReminders() {
  try {
    const now = new Date().toISOString();
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/nuur_applications?user_id=eq.${NUUR_USER_ID}&follow_up_at=lte.${now}&status=eq.applied&order=follow_up_at.asc&limit=5`,
      { headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` } }
    );
    const due = await res.json();
    if (!Array.isArray(due) || !due.length) return;

    due.forEach(app => {
      showReminderToast(app);
    });
  } catch (_) {}
}

function showReminderToast(app) {
  const existing = document.getElementById(`nuur-reminder-${app.id}`);
  if (existing) return;

  const toast = document.createElement("div");
  toast.id = `nuur-reminder-${app.id}`;
  toast.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:9999;
    background:var(--bg1);border:1px solid var(--border);
    border-radius:14px;padding:14px 16px;width:320px;
    box-shadow:0 8px 32px rgba(0,0,0,0.12);font-family:var(--font);
  `;

  const hdr = document.createElement("div");
  hdr.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:8px";
  const lbl = document.createElement("span");
  lbl.style.cssText = "font-size:11px;color:var(--gold);font-weight:500";
  lbl.textContent = "📬 Follow-up reminder";
  const x = document.createElement("button");
  x.style.cssText = "background:none;border:none;color:var(--text3);cursor:pointer;font-size:16px;padding:0;line-height:1";
  x.textContent = "×";
  x.addEventListener("click", () => toast.remove());
  hdr.appendChild(lbl);
  hdr.appendChild(x);

  const body = document.createElement("div");
  body.style.cssText = "font-size:12px;color:var(--text1);margin-bottom:10px;line-height:1.5";
  const strong = document.createElement("strong");
  strong.textContent = `${app.job_title} at ${app.company}`;
  body.appendChild(strong);
  body.appendChild(document.createTextNode(" — applied " + new Date(app.applied_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })));

  const btns = document.createElement("div");
  btns.style.cssText = "display:flex;gap:6px";

  const draftBtn = document.createElement("button");
  draftBtn.style.cssText = "flex:1;padding:6px;border-radius:8px;background:var(--teal3);border:1px solid rgba(13,148,136,0.2);font-size:11px;color:var(--teal);cursor:pointer;font-family:var(--font)";
  draftBtn.textContent = "Draft follow-up";
  draftBtn.addEventListener("click", () => {
    toast.remove();
    mainInput.value = `Write a short professional follow-up email for a job application I sent to ${app.company} for the ${app.job_title} role. From Mohamud Mohamed. No em dashes.`;
    window.switchView("chat");
    handleChatSend();
  });

  const dismissBtn = document.createElement("button");
  dismissBtn.style.cssText = "padding:6px 12px;border-radius:8px;background:transparent;border:1px solid var(--border);font-size:11px;color:var(--text2);cursor:pointer;font-family:var(--font)";
  dismissBtn.textContent = "Dismiss";
  dismissBtn.addEventListener("click", async () => {
    // Clear the follow_up_at so it doesn't show again
    await fetch(`${SUPABASE_URL}/rest/v1/nuur_applications?id=eq.${app.id}`, {
      method: "PATCH",
      headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ follow_up_at: null })
    });
    toast.remove();
  });

  btns.appendChild(draftBtn);
  btns.appendChild(dismissBtn);
  toast.appendChild(hdr);
  toast.appendChild(body);
  toast.appendChild(btns);
  document.body.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 20000);
}

// checkFollowUpReminders is called inside loadDashboard directly (see above)
window._dashboardWithReminders = loadDashboard;

// ── 3. APPLICATION NOTES ──────────────────────────────────────────
function showAppNotes(appId, jobTitle, company) {
  const existing = document.getElementById("nuur-app-notes-panel");
  if (existing) { existing.remove(); return; }

  const panel = document.createElement("div");
  panel.id = "nuur-app-notes-panel";
  panel.style.cssText = `
    position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
    z-index:9999;background:var(--bg1);border:1px solid var(--border);
    border-radius:16px;padding:20px;width:380px;
    box-shadow:0 20px 60px rgba(0,0,0,0.15);font-family:var(--font);
  `;

  const hdr = document.createElement("div");
  hdr.style.cssText = "display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px";
  const titleEl = document.createElement("div");
  const h = document.createElement("div");
  h.style.cssText = "font-size:13px;font-weight:500;color:var(--text0)";
  h.textContent = jobTitle;
  const sub = document.createElement("div");
  sub.style.cssText = "font-size:11px;color:var(--text3);margin-top:2px";
  sub.textContent = company;
  titleEl.appendChild(h);
  titleEl.appendChild(sub);
  const x = document.createElement("button");
  x.style.cssText = "background:none;border:none;color:var(--text3);cursor:pointer;font-size:18px;padding:0;line-height:1";
  x.textContent = "×";
  x.addEventListener("click", () => panel.remove());
  hdr.appendChild(titleEl);
  hdr.appendChild(x);

  const reminderRow = document.createElement("div");
  reminderRow.style.cssText = "margin-bottom:12px;display:flex;align-items:center;gap:8px";
  const reminderLbl = document.createElement("div");
  reminderLbl.style.cssText = "font-size:11px;color:var(--text2);flex:1";
  reminderLbl.textContent = "Follow-up reminder";
  const select = document.createElement("select");
  select.style.cssText = "background:var(--bg0);border:1px solid var(--border);border-radius:7px;padding:4px 8px;font-size:11px;color:var(--text1);font-family:var(--font);cursor:pointer;outline:none";
  [["none","None"],["3","3 days"],["7","7 days"],["14","2 weeks"],["30","1 month"]].forEach(([val, label]) => {
    const opt = document.createElement("option");
    opt.value = val;
    opt.textContent = label;
    select.appendChild(opt);
  });
  reminderRow.appendChild(reminderLbl);
  reminderRow.appendChild(select);

  const notesLbl = document.createElement("div");
  notesLbl.style.cssText = "font-size:11px;color:var(--text2);margin-bottom:6px";
  notesLbl.textContent = "Notes";

  const textarea = document.createElement("textarea");
  textarea.style.cssText = `width:100%;background:var(--bg0);border:1px solid var(--border);border-radius:9px;padding:10px 12px;font-size:12px;color:var(--text1);line-height:1.6;resize:vertical;height:100px;font-family:var(--font);outline:none`;
  textarea.placeholder = "Interview notes, contacts, questions asked, salary discussed...";

  // Load existing notes
  fetch(`${SUPABASE_URL}/rest/v1/nuur_applications?id=eq.${appId}&select=notes,follow_up_at`, {
    headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` }
  }).then(r => r.json()).then(data => {
    if (data?.[0]?.notes) textarea.value = data[0].notes;
    if (data?.[0]?.follow_up_at) {
      const days = Math.round((new Date(data[0].follow_up_at) - Date.now()) / 86400000);
      if (days > 0 && days <= 30) select.value = String(Math.min([3,7,14,30].find(d => d >= days) || 7));
    }
  }).catch(() => {});

  const saveBtn = document.createElement("button");
  saveBtn.style.cssText = "width:100%;margin-top:12px;padding:9px;border-radius:9px;background:var(--teal);border:none;color:#fff;font-size:12px;font-weight:500;cursor:pointer;font-family:var(--font)";
  saveBtn.textContent = "Save notes";
  saveBtn.addEventListener("click", async () => {
    const notes = textarea.value.trim();
    const days = select.value;
    const patches = { notes };
    if (days !== "none") {
      patches.follow_up_at = new Date(Date.now() + parseInt(days) * 86400000).toISOString();
    } else {
      patches.follow_up_at = null;
    }
    await fetch(`${SUPABASE_URL}/rest/v1/nuur_applications?id=eq.${appId}`, {
      method: "PATCH",
      headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(patches)
    });
    saveBtn.textContent = "Saved!";
    setTimeout(() => panel.remove(), 800);
  });

  panel.appendChild(hdr);
  panel.appendChild(reminderRow);
  panel.appendChild(notesLbl);
  panel.appendChild(textarea);
  panel.appendChild(saveBtn);
  document.body.appendChild(panel);

  // Backdrop
  const backdrop = document.createElement("div");
  backdrop.id = "nuur-notes-backdrop";
  backdrop.style.cssText = "position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,0.3)";
  backdrop.addEventListener("click", () => { panel.remove(); backdrop.remove(); });
  document.body.insertBefore(backdrop, panel);
  textarea.focus();
}

// Wire notes button to dashboard app rows — patch after dashboard loads
async function _patchDashboard() {
  await new Promise(r => setTimeout(r, 500));
  document.querySelectorAll(".dash-app-row").forEach(row => {
    if (row.querySelector(".notes-btn")) return;
    const appId = row.dataset.appId;
    if (!appId) return;
    const notesBtn = document.createElement("button");
    notesBtn.className = "notes-btn";
    notesBtn.style.cssText = "background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:2px 6px;border-radius:6px;transition:color .12s";
    notesBtn.title = "Notes & reminder";
    notesBtn.textContent = "📝";
    notesBtn.addEventListener("click", () => {
      const title = row.querySelector(".dash-app-title")?.textContent;
      const company = row.querySelector(".dash-app-company")?.textContent?.split(" · ")[0];
      showAppNotes(appId, title, company);
    });
    row.appendChild(notesBtn);
  });
};

// ── 4. DEFAULT TAB SETTING ────────────────────────────────────────
function applyDefaultTab() {
  const defaultTab = localStorage.getItem("nuur_default_tab") || "chat";
  if (defaultTab !== "chat") {
    window.switchView(defaultTab);
  }
}

// Call after everything is initialized
setTimeout(applyDefaultTab, 150);

// ── 5. YOUTUBE SUMMARIZER ─────────────────────────────────────────
function detectAndShowYouTube() {
  const input = document.getElementById("main-input");
  if (!input) return;

  input.addEventListener("paste", (e) => {
    const text = (e.clipboardData || window.clipboardData).getData("text");
    if (text && (text.includes("youtube.com/watch") || text.includes("youtu.be/"))) {
      setTimeout(() => summarizeYouTube(text.trim()), 50);
    }
  });

  input.addEventListener("input", () => {
    const val = input.value.trim();
    if (val.match(/^https?:\/\/(www\.)?(youtube\.com\/watch|youtu\.be\/)/)) {
      if (!document.getElementById("nuur-yt-hint")) {
        const hint = document.createElement("div");
        hint.id = "nuur-yt-hint";
        hint.style.cssText = "font-size:11px;color:var(--teal);margin-top:4px;padding:4px 0";
        hint.textContent = "✦ YouTube URL detected — press Enter to summarize";
        input.parentElement?.parentElement?.appendChild(hint);
      }
    } else {
      document.getElementById("nuur-yt-hint")?.remove();
    }
  });
}

async function summarizeYouTube(url) {
  document.getElementById("nuur-yt-hint")?.remove();
  if (welcomeScreen) welcomeScreen.style.display = "none";

  const input = document.getElementById("main-input");
  if (input) input.value = "";

  addChatMsg("user", url);
  const loadingRow = document.createElement("div");
  loadingRow.className = "chat-row nuur";
  const av = document.createElement("div"); av.className = "chat-avatar"; av.textContent = "✦";
  const bub = document.createElement("div"); bub.className = "chat-bubble";
  const typing = document.createElement("div"); typing.className = "typing-indicator";
  [1,2,3].forEach(() => { const d = document.createElement("div"); d.className = "typing-dot"; typing.appendChild(d); });
  bub.appendChild(typing);
  loadingRow.appendChild(av); loadingRow.appendChild(bub);
  chatArea.appendChild(loadingRow);
  chatArea.scrollTop = chatArea.scrollHeight;

  try {
    // Extract video ID
    const videoId = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
    if (!videoId) throw new Error("Could not parse YouTube URL");

    const res = await fetch(PROXY, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` },
      body: JSON.stringify({
        model: "sonnet",
        system: "You are Nuur, an AI assistant. Be concise, no markdown symbols, no em dashes.",
        prompt: `Summarize this YouTube video based on its URL and what you know. Video ID: ${videoId}\nURL: ${url}\n\nProvide: 1) What the video is likely about based on the URL and channel 2) Key topics it probably covers 3) Who would benefit from watching it. If you don't have specific info about this video, give a general summary based on the URL structure and any recognizable patterns. Be honest about what you know vs infer.`
      })
    });
    const data = await res.json();
    const reply = data.content?.[0]?.text || "Could not summarize this video.";
    loadingRow.remove();
    addChatMsg("nuur", reply);
  } catch (e) {
    loadingRow.remove();
    addChatMsg("nuur", "Could not summarize that video — " + e.message);
  }
}

detectAndShowYouTube();

// Add YouTube summarizer to hint chips
if (!document.getElementById("nuur-yt-static-hint")) {
  const ytHint = document.createElement("div");
  ytHint.id = "nuur-yt-static-hint";
  ytHint.className = "hint-chip";
  ytHint.textContent = "Summarize YouTube video";
  ytHint.addEventListener("click", () => {
    if (mainInput) {
      mainInput.value = "https://youtube.com/watch?v=";
      mainInput.focus();
      mainInput.setSelectionRange(mainInput.value.length, mainInput.value.length);
    }
  });
  document.querySelector(".input-hints")?.appendChild(ytHint);
}

// ── AGENT FORM SUBMISSION PREVIEW (NEW TAB) ───────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== "AGENT_SUBMIT_PREVIEW") return;
  showAgentSubmitPreview(msg.fields, msg.url);
});

function showAgentSubmitPreview(fields, url) {
  const existing = document.getElementById("nuur-newtab-preview");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "nuur-newtab-preview";
  overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;padding:20px";

  const panel = document.createElement("div");
  panel.style.cssText = "background:var(--bg1);border:1px solid var(--border);border-radius:16px;padding:24px;width:100%;max-width:520px;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.2);font-family:var(--font)";

  const title = document.createElement("div");
  title.style.cssText = "font-size:15px;font-weight:600;color:var(--text0);margin-bottom:4px";
  title.textContent = "⚠️ Review before submitting";
  const urlEl = document.createElement("div");
  urlEl.style.cssText = "font-size:11px;color:var(--text3);margin-bottom:14px";
  try { urlEl.textContent = new URL(url).hostname; } catch (_) { urlEl.textContent = url; }

  const banner = document.createElement("div");
  banner.style.cssText = "background:rgba(217,119,6,0.06);border:1px solid rgba(217,119,6,0.18);border-radius:8px;padding:10px 12px;font-size:12px;color:var(--gold);line-height:1.5;margin-bottom:16px";
  banner.textContent = "Nuur filled this form automatically. Review each field and edit anything before confirming.";

  const fieldList = document.createElement("div");
  fieldList.style.cssText = "display:flex;flex-direction:column;gap:8px;margin-bottom:16px";
  const editedValues = {};

  (fields || []).forEach(field => {
    if (!field.label || field.type === "hidden") return;
    const row = document.createElement("div");
    const lbl = document.createElement("div");
    lbl.style.cssText = "font-size:10px;color:var(--text3);font-weight:500;letter-spacing:.04em;margin-bottom:4px;text-transform:uppercase";
    lbl.textContent = field.label + (field.required ? " *" : "");
    const inp = document.createElement("input");
    inp.value = field.value || "";
    inp.style.cssText = "width:100%;background:var(--bg0);border:1.5px solid var(--border);border-radius:8px;padding:8px 12px;font-size:13px;color:var(--text0);font-family:var(--font);outline:none;transition:border-color .15s";
    inp.addEventListener("focus", () => { inp.style.borderColor = "var(--teal)"; });
    inp.addEventListener("blur", () => { inp.style.borderColor = "var(--border)"; });
    inp.addEventListener("input", () => { editedValues[field.selector] = { selector: field.selector, value: inp.value }; });
    if (field.required && !field.value) {
      lbl.style.color = "var(--red)";
      inp.style.borderColor = "rgba(239,68,68,0.3)";
    }
    row.appendChild(lbl);
    row.appendChild(inp);
    fieldList.appendChild(row);
  });

  const btns = document.createElement("div");
  btns.style.cssText = "display:flex;gap:10px";
  const confirmBtn = document.createElement("button");
  confirmBtn.style.cssText = "flex:2;padding:11px;border-radius:10px;background:var(--teal);border:none;color:#fff;font-size:13px;font-weight:500;cursor:pointer;font-family:var(--font)";
  confirmBtn.textContent = "Confirm and submit";
  confirmBtn.addEventListener("click", () => {
    overlay.remove();
    const edits = Object.values(editedValues);
    chrome.runtime.sendMessage({ type: "AGENT_SUBMIT_CONFIRMED", editedFields: edits }, () => { chrome.runtime.lastError; });
    addChatMsg("nuur", "Confirmed. Submitting the form now...");
  });
  const cancelBtn = document.createElement("button");
  cancelBtn.style.cssText = "flex:1;padding:11px;border-radius:10px;background:transparent;border:1px solid var(--border);color:var(--text2);font-size:13px;cursor:pointer;font-family:var(--font)";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", () => {
    overlay.remove();
    chrome.runtime.sendMessage({ type: "AGENT_SUBMIT_CANCELLED" }, () => { chrome.runtime.lastError; });
    addChatMsg("nuur", "Submission cancelled — form was not submitted.");
  });
  btns.appendChild(confirmBtn);
  btns.appendChild(cancelBtn);

  panel.appendChild(title);
  panel.appendChild(urlEl);
  panel.appendChild(banner);
  panel.appendChild(fieldList);
  panel.appendChild(btns);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
}

// ── PRIVACY MODE ──────────────────────────────────────────────────
function isPrivacyMode() {
  return localStorage.getItem("nuur_privacy") === "on";
}

function applyPrivacyMode() {
  const on = isPrivacyMode();
  // Disable screen time logging
  chrome.runtime.sendMessage({ type: "SET_PRIVACY_MODE", enabled: on }, () => { chrome.runtime.lastError; });
  // Visual indicator in header
  const indicator = document.getElementById("privacy-indicator");
  if (on && !indicator) {
    const dot = document.createElement("div");
    dot.id = "privacy-indicator";
    dot.title = "Privacy mode on — nothing is being saved";
    dot.style.cssText = "width:8px;height:8px;border-radius:50%;background:#D97706;flex-shrink:0;margin-left:4px";
    document.querySelector(".header-right")?.prepend(dot);
  } else if (!on && indicator) {
    indicator.remove();
  }
}

// ── LANGUAGE TOGGLE ───────────────────────────────────────────────
function getNuurLanguage() {
  return localStorage.getItem("nuur_language") || "english";
}

function getLanguageSystemPrompt() {
  if (getNuurLanguage() === "somali") {
    return "Respond ONLY in Somali (af Soomaali). Keep all responses fully in Somali. Use natural, conversational Somali — not overly formal. Technical terms can stay in English where no Somali equivalent exists.";
  }
  return "";
}

async function getSystemPromptWithLanguage(pageUrl) {
  const base = await new Promise(resolve => {
    chrome.runtime.sendMessage({ type: "BUILD_SYSTEM_PROMPT", pageUrl: pageUrl || "" }, (res) => {
      if (chrome.runtime.lastError) { resolve("You are Nuur, an AI agent by Kulan Group Ltd."); return; }
      // res may be a string (from background.js) or an object {system:"..."} (from web shim)
      const prompt = typeof res === "string" ? res : (res?.system || res || "You are Nuur, an AI agent by Kulan Group Ltd.");
      resolve(prompt);
    });
  });
  const lang = getLanguageSystemPrompt();
  return lang ? base + "\n\n" + lang : base;
}

// ── ONBOARDING FLOW ───────────────────────────────────────────────
function shouldShowOnboarding() {
  return !localStorage.getItem("nuur_onboarded");
}

function showOnboarding() {
  const overlay = document.createElement("div");
  overlay.id = "nuur-onboarding";
  overlay.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:20px;font-family:var(--font)";

  const steps = [
    {
      icon: "✦",
      title: "Welcome to Nuur",
      sub: "AI browser agent by Kulan Group Ltd",
      body: "Nuur reads any page, takes autonomous actions, tracks your job search, and works for you in the background. Let's get you set up in 3 steps.",
      action: "Get started"
    },
    {
      icon: "👤",
      title: "Your profile",
      sub: "Used for job applications and cover letters",
      body: null, // renders profile fields
      action: "Save and continue"
    },
    {
      icon: "✨",
      title: "Pick your theme",
      sub: "You can change this any time in Settings",
      body: null, // renders theme picker
      action: "Start using Nuur"
    }
  ];

  let currentStep = 0;

  function renderStep() {
    overlay.innerHTML = "";
    const panel = document.createElement("div");
    panel.style.cssText = "background:var(--bg1);border:1px solid var(--border);border-radius:20px;padding:32px;width:100%;max-width:480px;box-shadow:0 24px 64px rgba(0,0,0,0.2)";

    const step = steps[currentStep];

    // Progress dots
    const dots = document.createElement("div");
    dots.style.cssText = "display:flex;gap:6px;justify-content:center;margin-bottom:24px";
    steps.forEach((_, i) => {
      const dot = document.createElement("div");
      dot.style.cssText = `width:${i === currentStep ? "20px" : "6px"};height:6px;border-radius:3px;background:${i === currentStep ? "var(--teal)" : "var(--border)"};transition:all .2s`;
      dots.appendChild(dot);
    });
    panel.appendChild(dots);

    // Icon
    const iconEl = document.createElement("div");
    iconEl.style.cssText = "width:52px;height:52px;border-radius:14px;background:var(--teal3);border:1px solid rgba(13,148,136,0.2);display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:16px";
    iconEl.textContent = step.icon;
    panel.appendChild(iconEl);

    // Title
    const titleEl = document.createElement("div");
    titleEl.style.cssText = "font-size:20px;font-weight:600;color:var(--text0);letter-spacing:-.02em;margin-bottom:4px";
    titleEl.textContent = step.title;
    const subEl = document.createElement("div");
    subEl.style.cssText = "font-size:12px;color:var(--text3);margin-bottom:16px";
    subEl.textContent = step.sub;
    panel.appendChild(titleEl);
    panel.appendChild(subEl);

    // Step content
    if (step.body) {
      const body = document.createElement("div");
      body.style.cssText = "font-size:13px;color:var(--text2);line-height:1.6;margin-bottom:20px";
      body.textContent = step.body;
      panel.appendChild(body);
    }

    // Step 1: Profile fields
    if (currentStep === 1) {
      const fields = [
        { id: "ob-name", label: "Full name", placeholder: "Mohamud Mohamed", val: "Mohamud Mohamed" },
        { id: "ob-email", label: "Email", placeholder: "your@email.com", val: "mohamedmohammud@gmail.com" },
        { id: "ob-location", label: "Location", placeholder: "Columbus, OH", val: "Columbus, OH" },
        { id: "ob-roles", label: "Target roles", placeholder: "GRC Analyst, SOC Analyst...", val: "Junior GRC Analyst, SOC Analyst Tier 1, IT Security Analyst" },
      ];
      const grid = document.createElement("div");
      grid.style.cssText = "display:flex;flex-direction:column;gap:10px;margin-bottom:20px";
      fields.forEach(f => {
        const wrap = document.createElement("div");
        const lbl = document.createElement("div");
        lbl.style.cssText = "font-size:10px;color:var(--text3);font-weight:500;letter-spacing:.06em;text-transform:uppercase;margin-bottom:4px";
        lbl.textContent = f.label;
        const inp = document.createElement("input");
        inp.id = f.id;
        inp.value = f.val;
        inp.placeholder = f.placeholder;
        inp.style.cssText = "width:100%;background:var(--bg0);border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-family:var(--font);font-size:12px;color:var(--text0);outline:none";
        inp.addEventListener("focus", () => { inp.style.borderColor = "var(--teal)"; });
        inp.addEventListener("blur", () => { inp.style.borderColor = "var(--border)"; });
        wrap.appendChild(lbl);
        wrap.appendChild(inp);
        grid.appendChild(wrap);
      });
      panel.appendChild(grid);
    }

    // Step 2: Theme picker
    if (currentStep === 2) {
      const themes = [
        { id: "light",    label: "Indigo",   swatch: "#4F46E5", bg: "#f8f9fc" },
        { id: "navy",     label: "Navy",     swatch: "#0B2545", bg: "#f0f2f7" },
        { id: "charcoal", label: "Coral",    swatch: "#D85A30", bg: "#f5f3f0" },
        { id: "purple",   label: "Purple",   swatch: "#7F77DD", bg: "#f5f3fe" },
        { id: "forest",   label: "Forest",   swatch: "#3B6D11", bg: "#f2f5f0" },
        { id: "rose",     label: "Rose",     swatch: "#D4537E", bg: "#fdf4f7" },
        { id: "dark",     label: "Midnight", swatch: "#0D9488", bg: "#0a0f1a" },
        { id: "black",    label: "Black",    swatch: "#ffffff", bg: "#000000" },
        { id: "literary",  label: "Literary", swatch: "#6366F1", bg: "#FAF5EC" },
      ];
      const grid = document.createElement("div");
      grid.style.cssText = "display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:20px";
      const currentTheme = localStorage.getItem("nuur_theme") || "literary";
      themes.forEach(t => {
        const btn = document.createElement("div");
        const active = currentTheme === t.id;
        btn.style.cssText = `display:flex;flex-direction:column;align-items:center;gap:5px;padding:8px 4px;border-radius:10px;cursor:pointer;border:2px solid ${active ? "var(--teal)" : "var(--border)"};background:var(--bg0);transition:all .15s`;
        const sw = document.createElement("div");
        sw.style.cssText = "width:32px;height:22px;border-radius:5px;border:1px solid rgba(0,0,0,0.08);overflow:hidden;display:flex;flex-direction:column";
        const swT = document.createElement("div"); swT.style.cssText = `flex:1;background:${t.bg}`;
        const swB = document.createElement("div"); swB.style.cssText = `height:6px;background:${t.swatch}`;
        sw.appendChild(swT); sw.appendChild(swB);
        const lbl = document.createElement("div");
        lbl.style.cssText = `font-size:10px;color:${active ? "var(--teal)" : "var(--text2)"};font-weight:${active ? "500" : "400"}`;
        lbl.textContent = t.label;
        btn.appendChild(sw);
        btn.appendChild(lbl);
        btn.addEventListener("click", () => {
          localStorage.setItem("nuur_theme", t.id);
          if (typeof applyNewtabTheme === "function") applyNewtabTheme();
          grid.querySelectorAll("[data-tid]").forEach(b => {
            const isCurrent = b.dataset.tid === t.id;
            b.style.borderColor = isCurrent ? "var(--teal)" : "var(--border)";
            b.querySelector("div:last-child").style.color = isCurrent ? "var(--teal)" : "var(--text2)";
          });
        });
        btn.dataset.tid = t.id;
        grid.appendChild(btn);
      });
      panel.appendChild(grid);
    }

    // Action button
    const btn = document.createElement("button");
    btn.style.cssText = "width:100%;padding:12px;border-radius:10px;background:var(--teal);border:none;color:#fff;font-size:13px;font-weight:500;cursor:pointer;font-family:var(--font);transition:all .15s";
    btn.textContent = step.action;
    btn.addEventListener("mouseenter", () => { btn.style.background = "var(--teal2)"; });
    btn.addEventListener("mouseleave", () => { btn.style.background = "var(--teal)"; });
    btn.addEventListener("click", async () => {
      // Save profile on step 1
      if (currentStep === 1) {
        const profile = {
          full_name: document.getElementById("ob-name")?.value?.trim(),
          email: document.getElementById("ob-email")?.value?.trim(),
          location: document.getElementById("ob-location")?.value?.trim(),
        };
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/nuur_profile?user_id=eq.${NUUR_USER_ID}`, {
            method: "PATCH",
            headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify(profile)
          });
        } catch (_) {}
      }

      if (currentStep < steps.length - 1) {
        currentStep++;
        renderStep();
      } else {
        // Done
        localStorage.setItem("nuur_onboarded", "1");
        overlay.style.opacity = "0";
        overlay.style.transition = "opacity .3s";
        setTimeout(() => overlay.remove(), 300);
      }
    });

    // Skip link (not on first step)
    if (currentStep > 0) {
      const skip = document.createElement("div");
      skip.style.cssText = "text-align:center;margin-top:10px;font-size:11px;color:var(--text3);cursor:pointer";
      skip.textContent = "Skip for now";
      skip.addEventListener("click", () => {
        localStorage.setItem("nuur_onboarded", "1");
        overlay.remove();
      });
      panel.appendChild(btn);
      panel.appendChild(skip);
    } else {
      panel.appendChild(btn);
    }

    overlay.appendChild(panel);
  }

  renderStep();
  document.body.appendChild(overlay);
}

// Run onboarding check after DOM is ready
setTimeout(() => {
  if (shouldShowOnboarding()) showOnboarding();
  applyPrivacyMode();
}, 200);

// ── DOCUMENT WRITER INTEGRATION ───────────────────────────────────
function openDocumentWriter() {
  if (typeof window.nuurShowDocWriter === "function") {
    window.nuurShowDocWriter(document.body, null);
  }
}

// Add to hint chips
if (!document.getElementById("nuur-doc-hint")) {
  const docHint = document.createElement("div");
  docHint.id = "nuur-doc-hint";
  docHint.className = "hint-chip";
  docHint.textContent = "Write a document";
  docHint.addEventListener("click", openDocumentWriter);
  document.querySelector(".input-hints")?.appendChild(docHint);
}

// ══════════════════════════════════════════════════════════════════
// ── FEATURE: NOTIFICATION PREFERENCES ─────────────────────────────
// ══════════════════════════════════════════════════════════════════

const NOTIF_PREFS_KEY = "nuur_notif_prefs";

const DEFAULT_NOTIF_PREFS = {
  job_page_detected:       { toast: true,  label: "Job page detected" },
  linkedin_job_detected:   { toast: true,  label: "LinkedIn job detected" },
  recruiter_email_detected:{ toast: true,  label: "Recruiter email" },
  keyword_on_page:         { toast: false, label: "Keyword on page" },
  page_visit:              { toast: false, label: "Page visit" },
  scheduled:               { toast: true,  label: "Scheduled workflow" },
  gap_analysis:            { toast: true,  label: "Gap analysis result" },
  summarize_page:          { toast: true,  label: "Page summary" },
  save_bookmark:           { toast: false, label: "Bookmark saved" },
  track_job:               { toast: false, label: "Job tracked" },
  draft_reply:             { toast: true,  label: "Draft email reply" },
  run_agent:               { toast: true,  label: "Agent task result" },
  notify:                  { toast: true,  label: "Custom notification" },
};

function getNotifPrefs() {
  try {
    const stored = JSON.parse(localStorage.getItem(NOTIF_PREFS_KEY) || "{}");
    return { ...DEFAULT_NOTIF_PREFS, ...stored };
  } catch (_) { return { ...DEFAULT_NOTIF_PREFS }; }
}

function saveNotifPrefs(prefs) {
  localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs));
  // Sync to chrome.storage so background/content scripts can read it
  chrome.storage.local.set({ nuur_notif_prefs: prefs });
}

function buildNotifPrefsUI(container) {
  container.replaceChildren();
  const prefs = getNotifPrefs();

  const title = document.createElement("div");
  title.style.cssText = "font-size:12px;font-weight:500;color:var(--text0);margin-bottom:4px";
  title.textContent = "Workflow notifications";
  const sub = document.createElement("div");
  sub.style.cssText = "font-size:11px;color:var(--text3);margin-bottom:14px";
  sub.textContent = "Choose which workflows show a toast notification when they run.";
  container.appendChild(title);
  container.appendChild(sub);

  const grid = document.createElement("div");
  grid.style.cssText = "display:flex;flex-direction:column;gap:6px";

  Object.entries(prefs).forEach(([key, pref]) => {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--bg0);border:1px solid var(--border3);border-radius:8px";

    const lbl = document.createElement("div");
    lbl.style.cssText = "font-size:12px;color:var(--text1)";
    lbl.textContent = pref.label;

    const toggle = document.createElement("div");
    toggle.style.cssText = `width:34px;height:18px;border-radius:9px;cursor:pointer;transition:background .15s;position:relative;background:${pref.toast ? "var(--teal)" : "var(--bg4)"}`;
    const dot = document.createElement("div");
    dot.style.cssText = `width:13px;height:13px;border-radius:50%;background:#fff;position:absolute;top:2.5px;left:${pref.toast ? "18px" : "2.5px"};transition:left .15s`;
    toggle.appendChild(dot);

    toggle.addEventListener("click", () => {
      const newPrefs = getNotifPrefs();
      newPrefs[key].toast = !newPrefs[key].toast;
      saveNotifPrefs(newPrefs);
      toggle.style.background = newPrefs[key].toast ? "var(--teal)" : "var(--bg4)";
      dot.style.left = newPrefs[key].toast ? "18px" : "2.5px";
    });

    row.appendChild(lbl);
    row.appendChild(toggle);
    grid.appendChild(row);
  });

  container.appendChild(grid);
}

// ══════════════════════════════════════════════════════════════════
// ── FEATURE: QUICK ACTION PINS ─────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

const PINNED_ACTIONS_KEY = "nuur_pinned_actions";

const ALL_AVAILABLE_ACTIONS = [
  "Summarize page", "Translate to Somali", "Focus reader", "Save bookmark",
  "What do I see?", "Export chat", "Write document", "Security check",
  "Interview prep", "Write cover letter", "Track application",
  "Research this person", "Summarize thread", "Draft reply",
  "Find follow-ups", "Analyze this job", "Auto-fill form",
  "Summarize YouTube", "Meeting notes", "Screen time"
];

function getPinnedActions() {
  try {
    const stored = localStorage.getItem(PINNED_ACTIONS_KEY);
    return stored ? JSON.parse(stored) : null; // null = use context defaults
  } catch (_) { return null; }
}

function buildPinnedActionsUI(container) {
  container.replaceChildren();
  const pinned = getPinnedActions() || [];

  const title = document.createElement("div");
  title.style.cssText = "font-size:12px;font-weight:500;color:var(--text0);margin-bottom:4px";
  title.textContent = "Pin quick actions";
  const sub = document.createElement("div");
  sub.style.cssText = "font-size:11px;color:var(--text3);margin-bottom:6px";
  sub.textContent = "Choose up to 6 actions that always show in the side panel, regardless of what page you're on.";
  container.appendChild(title);
  container.appendChild(sub);

  // Use context defaults toggle
  const useDefaultRow = document.createElement("div");
  useDefaultRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--teal3);border:1px solid rgba(13,148,136,0.2);border-radius:8px;margin-bottom:10px";
  const useDefaultLbl = document.createElement("div");
  useDefaultLbl.style.cssText = "font-size:12px;color:var(--teal)";
  useDefaultLbl.textContent = "Use smart context detection";
  const useDefaultToggle = document.createElement("div");
  const usingDefaults = getPinnedActions() === null;
  useDefaultToggle.style.cssText = `width:34px;height:18px;border-radius:9px;cursor:pointer;transition:background .15s;position:relative;background:${usingDefaults ? "var(--teal)" : "var(--bg4)"}`;
  const udd = document.createElement("div");
  udd.style.cssText = `width:13px;height:13px;border-radius:50%;background:#fff;position:absolute;top:2.5px;left:${usingDefaults ? "18px" : "2.5px"};transition:left .15s`;
  useDefaultToggle.appendChild(udd);
  useDefaultToggle.addEventListener("click", () => {
    if (getPinnedActions() === null) {
      // Switch to manual — start with current context defaults
      localStorage.setItem(PINNED_ACTIONS_KEY, JSON.stringify(["Summarize page", "Save bookmark", "Translate to Somali", "What do I see?"]));
      useDefaultToggle.style.background = "var(--bg4)";
      udd.style.left = "2.5px";
    } else {
      // Switch back to auto
      localStorage.removeItem(PINNED_ACTIONS_KEY);
      useDefaultToggle.style.background = "var(--teal)";
      udd.style.left = "18px";
    }
    buildPinnedActionsUI(container); // re-render
  });
  useDefaultRow.appendChild(useDefaultLbl);
  useDefaultRow.appendChild(useDefaultToggle);
  container.appendChild(useDefaultRow);

  if (getPinnedActions() === null) {
    const note = document.createElement("div");
    note.style.cssText = "font-size:11px;color:var(--text3);padding:8px;text-align:center";
    note.textContent = "Actions change automatically based on what page you're visiting.";
    container.appendChild(note);
    return;
  }

  const currentPinned = getPinnedActions() || [];

  const grid = document.createElement("div");
  grid.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:6px";

  ALL_AVAILABLE_ACTIONS.forEach(action => {
    const isPinned = currentPinned.includes(action);
    const btn = document.createElement("div");
    btn.style.cssText = `display:flex;align-items:center;gap:7px;padding:7px 10px;border-radius:8px;cursor:pointer;border:1px solid ${isPinned ? "rgba(13,148,136,0.3)" : "var(--border3)"};background:${isPinned ? "var(--teal3)" : "var(--bg0)"};transition:all .12s`;

    const pin = document.createElement("span");
    pin.style.cssText = `font-size:12px;color:${isPinned ? "var(--teal)" : "var(--text4)"}`;
    pin.textContent = isPinned ? "📌" : "○";
    const lbl = document.createElement("span");
    lbl.style.cssText = `font-size:11px;color:${isPinned ? "var(--teal)" : "var(--text2)"}`;
    lbl.textContent = action;
    btn.appendChild(pin);
    btn.appendChild(lbl);

    btn.addEventListener("click", () => {
      const current = getPinnedActions() || [];
      let updated;
      if (current.includes(action)) {
        updated = current.filter(a => a !== action);
      } else if (current.length >= 6) {
        // Flash the button to indicate limit
        btn.style.borderColor = "var(--red)";
        setTimeout(() => { btn.style.borderColor = "var(--border3)"; }, 600);
        return;
      } else {
        updated = [...current, action];
      }
      localStorage.setItem(PINNED_ACTIONS_KEY, JSON.stringify(updated));
      buildPinnedActionsUI(container);
    });

    grid.appendChild(btn);
  });

  const countNote = document.createElement("div");
  countNote.style.cssText = "font-size:10px;color:var(--text3);margin-bottom:8px;text-align:right";
  countNote.textContent = `${currentPinned.length}/6 pinned`;
  container.appendChild(countNote);
  container.appendChild(grid);
}

// ══════════════════════════════════════════════════════════════════
// ── FEATURE: RESUME AUTO-SELECTION ────────────────────────────────
// ══════════════════════════════════════════════════════════════════

const RESUME_KEYWORDS = {
  grc: ["grc", "governance", "risk", "compliance", "nist", "iso 27001", "audit", "policy", "regulatory", "sox", "hipaa", "pci"],
  soc: ["soc", "security operations", "threat", "incident response", "siem", "log analysis", "detection", "tier 1", "tier1", "analyst", "monitoring", "splunk", "crowdstrike"],
  itsec: ["it security", "information security", "infosec", "vulnerability", "penetration", "security analyst", "endpoint", "network security", "firewall"],
  helpdesk: ["help desk", "helpdesk", "desktop support", "it support", "technical support", "service desk"],
};

const RESUME_SUMMARIES = {
  grc: {
    label: "GRC Analyst",
    color: "#0D9488",
    summary: "Security+ certified IT professional with hands-on experience in risk management, policy development, and compliance frameworks including NIST CSF and ISO 27001. Founded Kulan Group Ltd, overseeing security governance across four digital products. Seeking Junior GRC Analyst roles in Columbus, OH.",
    highlights: ["NIST CSF · ISO 27001", "Risk & Policy", "Security+"]
  },
  soc: {
    label: "SOC Analyst Tier 1",
    color: "#D97706",
    summary: "CompTIA Security+ certified professional with experience in threat detection, log analysis, and endpoint security. Background in IT support at Franklin University with exposure to Active Directory, network monitoring, and incident response procedures. Targeting SOC Analyst Tier 1 roles.",
    highlights: ["Threat Detection", "Log Analysis", "Security+"]
  },
  itsec: {
    label: "IT Security Analyst",
    color: "#8b5cf6",
    summary: "Security+ certified IT professional combining technical support experience with cybersecurity expertise. Proficient in Windows administration, Active Directory, vulnerability assessment, and security policy implementation. Targeting IT Security Analyst roles.",
    highlights: ["Windows Admin", "AD · Vulnerability Mgmt", "Security+"]
  },
  helpdesk: {
    label: "Help Desk / IT Support",
    color: "#0ea5e9",
    summary: "IT professional with hands-on desktop support experience at Franklin University. Proficient in Windows troubleshooting, Active Directory user management, hardware/software support, and ticketing systems. Security+ certified with strong customer-facing skills.",
    highlights: ["Desktop Support", "Active Directory", "Security+"]
  }
};

function detectResumeVersion(pageText) {
  if (!pageText) return null;
  const text = pageText.toLowerCase();
  const scores = {};
  Object.entries(RESUME_KEYWORDS).forEach(([version, keywords]) => {
    scores[version] = keywords.filter(kw => text.includes(kw)).length;
  });
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : null;
}

function showResumeAutoSelector(pageText) {
  const detected = detectResumeVersion(pageText);
  if (!detected) return;

  const ver = RESUME_SUMMARIES[detected];
  const existing = document.getElementById("nuur-resume-suggest");
  if (existing) existing.remove();

  const banner = document.createElement("div");
  banner.id = "nuur-resume-suggest";
  banner.style.cssText = `
    position:fixed;top:80px;right:20px;z-index:9999;
    background:var(--bg1);border:1px solid var(--border);
    border-radius:14px;padding:14px 16px;width:300px;
    box-shadow:0 8px 32px rgba(0,0,0,0.12);font-family:var(--font);
    animation:fadeUp .2s ease;
  `;

  const hdr = document.createElement("div");
  hdr.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:8px";
  const lbl = document.createElement("div");
  lbl.style.cssText = "font-size:11px;font-weight:500;color:var(--text3)";
  lbl.textContent = "✦ Resume match detected";
  const x = document.createElement("button");
  x.style.cssText = "background:none;border:none;color:var(--text3);cursor:pointer;font-size:16px;padding:0;line-height:1";
  x.textContent = "×";
  x.addEventListener("click", () => banner.remove());
  hdr.appendChild(lbl);
  hdr.appendChild(x);

  const roleBadge = document.createElement("div");
  roleBadge.style.cssText = `display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:20px;background:${ver.color}15;border:1px solid ${ver.color}30;margin-bottom:8px`;
  const roleLabel = document.createElement("span");
  roleLabel.style.cssText = `font-size:12px;font-weight:500;color:${ver.color}`;
  roleLabel.textContent = ver.label;
  roleBadge.appendChild(roleLabel);

  const chips = document.createElement("div");
  chips.style.cssText = "display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px";
  ver.highlights.forEach(h => {
    const chip = document.createElement("span");
    chip.style.cssText = "background:var(--bg0);border:1px solid var(--border3);border-radius:10px;padding:2px 8px;font-size:10px;color:var(--text2)";
    chip.textContent = h;
    chips.appendChild(chip);
  });

  const summ = document.createElement("div");
  summ.style.cssText = "font-size:11px;color:var(--text2);line-height:1.55;margin-bottom:10px";
  summ.textContent = ver.summary.substring(0, 120) + "...";

  const btns = document.createElement("div");
  btns.style.cssText = "display:flex;gap:6px";

  const copyBtn = document.createElement("button");
  copyBtn.style.cssText = `flex:2;padding:7px;border-radius:8px;background:${ver.color}15;border:1px solid ${ver.color}30;font-size:11px;color:${ver.color};cursor:pointer;font-family:var(--font);font-weight:500`;
  copyBtn.textContent = "Copy summary";
  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(ver.summary).catch(() => {});
    copyBtn.textContent = "Copied!";
    setTimeout(() => { copyBtn.textContent = "Copy summary"; }, 2000);
  });

  const openDocBtn = document.createElement("button");
  openDocBtn.style.cssText = `flex:1;padding:7px;border-radius:8px;background:transparent;border:1px solid var(--border);font-size:11px;color:var(--text2);cursor:pointer;font-family:var(--font)`;
  openDocBtn.textContent = "Write resume";
  openDocBtn.addEventListener("click", () => {
    banner.remove();
    if (typeof window.nuurShowDocWriter === "function") {
      window.nuurShowDocWriter(document.body, null);
    }
  });

  btns.appendChild(copyBtn);
  btns.appendChild(openDocBtn);

  banner.appendChild(hdr);
  banner.appendChild(roleBadge);
  banner.appendChild(chips);
  banner.appendChild(summ);
  banner.appendChild(btns);
  document.body.appendChild(banner);

  setTimeout(() => { if (banner.parentNode) banner.remove(); }, 12000);
}

// Auto-detect when on job pages
document.addEventListener("DOMContentLoaded", () => {
  const url = window.location.href;
  if (url.includes("linkedin.com/jobs") || url.includes("indeed.com") ||
      url.includes("greenhouse.io") || url.includes("lever.co") ||
      url.includes("myworkdayjobs.com") || url.includes("ziprecruiter.com")) {
    setTimeout(() => {
      const text = document.body?.innerText || "";
      showResumeAutoSelector(text);
    }, 1500);
  }
});

// ══════════════════════════════════════════════════════════════════
// ── VOICE COMMANDS ────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

let voiceRecognition = null;
let voiceActive = false;

function initVoiceCommands() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return; // Not supported

  // Add voice button to input bar
  const inputInner = document.querySelector(".input-inner");
  if (!inputInner || document.getElementById("voice-btn")) return;

  const voiceBtn = document.createElement("button");
  voiceBtn.id = "voice-btn";
  voiceBtn.title = "Voice input (hold to speak)";
  voiceBtn.style.cssText = "background:transparent;border:none;cursor:pointer;color:var(--text3);padding:4px;border-radius:6px;display:flex;align-items:center;flex-shrink:0;transition:all .15s";
  voiceBtn.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>`;

  // Insert before send button
  const sendBtn = inputInner.querySelector(".send-btn");
  if (sendBtn) inputInner.insertBefore(voiceBtn, sendBtn);
  else inputInner.appendChild(voiceBtn);

  voiceBtn.addEventListener("mousedown", startVoice);
  voiceBtn.addEventListener("mouseup", stopVoice);
  voiceBtn.addEventListener("touchstart", e => { e.preventDefault(); startVoice(); });
  voiceBtn.addEventListener("touchend", stopVoice);

  function startVoice() {
    if (voiceActive) return;
    voiceActive = true;
    voiceBtn.style.color = "var(--red)";
    voiceBtn.style.background = "rgba(239,68,68,0.1)";
    voiceBtn.style.transform = "scale(1.15)";

    voiceRecognition = new SpeechRecognition();
    voiceRecognition.continuous = false;
    voiceRecognition.interimResults = true;
    voiceRecognition.lang = localStorage.getItem("nuur_language") === "somali" ? "so-SO" : "en-US";

    voiceRecognition.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join("");
      if (mainInput) {
        mainInput.value = transcript;
        mainInput.style.height = "auto";
        mainInput.style.height = mainInput.scrollHeight + "px";
      }
    };

    voiceRecognition.onend = () => {
      voiceActive = false;
      voiceBtn.style.color = "var(--text3)";
      voiceBtn.style.background = "transparent";
      voiceBtn.style.transform = "";
      if (mainInput?.value?.trim()) {
        // Auto-send after voice input
        setTimeout(() => handleChatSend(), 200);
      }
    };

    voiceRecognition.onerror = (e) => {
      voiceActive = false;
      voiceBtn.style.color = "var(--text3)";
      voiceBtn.style.background = "transparent";
      voiceBtn.style.transform = "";
    };

    voiceRecognition.start();
  }

  function stopVoice() {
    if (voiceRecognition && voiceActive) {
      voiceRecognition.stop();
    }
  }
}

// Also add keyboard shortcut: Cmd/Ctrl+Shift+V
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "v") {
    e.preventDefault();
    const voiceBtn = document.getElementById("voice-btn");
    if (voiceBtn) {
      voiceBtn.dispatchEvent(new MouseEvent("mousedown"));
      setTimeout(() => voiceBtn.dispatchEvent(new MouseEvent("mouseup")), 3000);
    }
  }
});

// Initialize on load
setTimeout(initVoiceCommands, 500);

// ══════════════════════════════════════════════════════════════════
// ── CHAT SEARCH ───────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

function initChatSearch() {
  // Button is now in static HTML — just wire the click handler
  const btn = document.getElementById("chat-search-btn");
  if (btn && !btn.dataset.wired) {
    btn.addEventListener("click", openChatSearch);
    btn.dataset.wired = "1";
  }
}

function openChatSearch() {
  const existing = document.getElementById("nuur-chat-search-modal");
  if (existing) { existing.remove(); return; }

  const overlay = document.createElement("div");
  overlay.id = "nuur-chat-search-modal";
  overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.4);display:flex;align-items:flex-start;justify-content:center;padding:80px 20px 20px;font-family:var(--font)";
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });

  const modal = document.createElement("div");
  modal.style.cssText = "background:var(--bg1);border:1px solid var(--border);border-radius:16px;width:100%;max-width:580px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.2)";

  // Search input
  const searchRow = document.createElement("div");
  searchRow.style.cssText = "display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--border3)";
  const searchIcon = document.createElement("span");
  searchIcon.innerHTML = `<svg width="16" height="16" fill="none" stroke="var(--text3)" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
  const searchInput = document.createElement("input");
  searchInput.placeholder = "Search conversations, topics, or keywords…";
  searchInput.autofocus = true;
  searchInput.style.cssText = "flex:1;background:transparent;border:none;outline:none;font-family:var(--font);font-size:14px;color:var(--text0);caret-color:var(--teal)";
  searchInput.setAttribute("placeholder", "Search conversations, topics, or keywords…");
  const closeBtn = document.createElement("button");
  closeBtn.style.cssText = "background:none;border:none;color:var(--text3);cursor:pointer;font-size:18px;padding:0;line-height:1";
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", () => overlay.remove());
  searchRow.appendChild(searchIcon);
  searchRow.appendChild(searchInput);
  searchRow.appendChild(closeBtn);

  // Results area
  const results = document.createElement("div");
  results.style.cssText = "max-height:400px;overflow-y:auto;padding:8px";

  const emptyState = document.createElement("div");
  emptyState.style.cssText = "text-align:center;padding:32px;font-size:12px;color:var(--text3)";
  emptyState.textContent = "Type to search your conversation history…";
  results.appendChild(emptyState);

  modal.appendChild(searchRow);
  modal.appendChild(results);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  searchInput.focus();

  let searchTimer = null;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    const q = searchInput.value.trim();
    if (!q) { results.replaceChildren(emptyState); return; }
    searchTimer = setTimeout(() => searchConversations(q, results), 300);
  });
}

async function searchConversations(query, container) {
  container.replaceChildren();
  const loading = document.createElement("div");
  loading.style.cssText = "text-align:center;padding:20px;font-size:12px;color:var(--text3);font-style:italic";
  loading.textContent = "Searching…";
  container.appendChild(loading);

  try {
    // Search Supabase nuur_memory for conversation history containing query
    const q = encodeURIComponent(query.toLowerCase());
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/nuur_memory?user_id=eq.${NUUR_USER_ID}&limit=1`,
      { headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` } }
    );
    const data = await res.json();
    const memory = data[0]?.memory_data || {};
    const summary = memory.conversation_summary || "";

    // Also search agent sessions
    const sessRes = await fetch(
      `${SUPABASE_URL}/rest/v1/nuur_agent_sessions?user_id=eq.${NUUR_USER_ID}&order=session_date.desc&limit=50`,
      { headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` } }
    );
    const sessions = await sessRes.json();

    container.replaceChildren();

    // Filter sessions by query
    const filtered = Array.isArray(sessions)
      ? sessions.filter(s =>
          s.goal?.toLowerCase().includes(query.toLowerCase()) ||
          s.summary?.toLowerCase().includes(query.toLowerCase())
        )
      : [];

    if (!filtered.length && !summary.toLowerCase().includes(query.toLowerCase())) {
      const empty = document.createElement("div");
      empty.style.cssText = "text-align:center;padding:32px;font-size:12px;color:var(--text3)";
      empty.textContent = `No conversations found matching "${query}"`;
      container.appendChild(empty);
      return;
    }

    // Render section header
    if (filtered.length) {
      const hdr = document.createElement("div");
      hdr.style.cssText = "font-size:10px;color:var(--text3);letter-spacing:.08em;padding:8px 8px 4px;text-transform:uppercase;font-weight:500";
      hdr.textContent = `Agent sessions (${filtered.length})`;
      container.appendChild(hdr);
    }

    filtered.forEach(session => {
      const item = document.createElement("div");
      item.style.cssText = "padding:10px;border-radius:9px;cursor:pointer;transition:background .12s;border:1px solid transparent;margin-bottom:3px";
      item.addEventListener("mouseenter", () => { item.style.background = "var(--bg0)"; item.style.borderColor = "var(--border3)"; });
      item.addEventListener("mouseleave", () => { item.style.background = "transparent"; item.style.borderColor = "transparent"; });

      const goal = document.createElement("div");
      goal.style.cssText = "font-size:12.5px;font-weight:500;color:var(--text0);margin-bottom:3px";
      goal.textContent = session.goal || "Agent session";

      const meta = document.createElement("div");
      meta.style.cssText = "font-size:11px;color:var(--text3);display:flex;gap:10px";
      const date = document.createElement("span");
      date.textContent = new Date(session.session_date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
      const steps = document.createElement("span");
      steps.textContent = `${session.steps || 0} steps`;
      const status = document.createElement("span");
      status.style.color = session.success ? "var(--green)" : "var(--red)";
      status.textContent = session.success ? "✓ Completed" : "✗ Failed";
      meta.appendChild(date);
      meta.appendChild(steps);
      meta.appendChild(status);

      if (session.summary) {
        const sum = document.createElement("div");
        sum.style.cssText = "font-size:11px;color:var(--text2);margin-top:4px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden";
        // Highlight query in summary
        sum.textContent = session.summary.substring(0, 150);
        item.appendChild(sum);
      }

      item.appendChild(goal);
      item.appendChild(meta);

      item.addEventListener("click", () => {
        // Load this session context into agent
        document.getElementById("nuur-chat-search-modal")?.remove();
        window.switchView("agent");
        const agentInput = document.getElementById("agent-input");
        if (agentInput && session.goal) {
          agentInput.value = `Continue this previous task: ${session.goal}`;
          agentInput.focus();
        }
      });

      container.appendChild(item);
    });

  } catch (e) {
    container.replaceChildren();
    const err = document.createElement("div");
    err.style.cssText = "text-align:center;padding:20px;font-size:12px;color:var(--red)";
    err.textContent = "Search failed: " + e.message;
    container.appendChild(err);
  }
}

// Keyboard shortcut: Cmd/Ctrl+F in new tab
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "f" && currentView !== "code") {
    e.preventDefault();
    openChatSearch();
  }
});

// Initialize chat search
setTimeout(initChatSearch, 600);

// ══════════════════════════════════════════════════════════════════
// ── PASSWORD VAULT UI ─────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

async function showPasswordVault() {
  const existing = document.getElementById("nuur-vault-modal");
  if (existing) { existing.remove(); return; }

  const overlay = document.createElement("div");
  overlay.id = "nuur-vault-modal";
  overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;padding:20px;font-family:var(--font)";
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });

  const card = document.createElement("div");
  card.style.cssText = "background:var(--bg1);border:1px solid var(--border);border-radius:16px;width:100%;max-width:560px;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.2)";

  // Header
  const hdr = document.createElement("div");
  hdr.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border)";
  const htitle = document.createElement("div");
  htitle.style.cssText = "display:flex;align-items:center;gap:8px";
  const hicon = document.createElement("div");
  hicon.style.cssText = "width:28px;height:28px;border-radius:8px;background:var(--teal3);display:flex;align-items:center;justify-content:center;font-size:14px";
  hicon.textContent = "🔐";
  const hlabel = document.createElement("div");
  hlabel.style.cssText = "font-size:14px;font-weight:600;color:var(--text0)";
  hlabel.textContent = "Password Vault";
  htitle.appendChild(hicon); htitle.appendChild(hlabel);
  const hclose = document.createElement("button");
  hclose.style.cssText = "background:none;border:none;color:var(--text3);cursor:pointer;font-size:18px;padding:0";
  hclose.textContent = "×";
  hclose.addEventListener("click", () => overlay.remove());
  hdr.appendChild(htitle); hdr.appendChild(hclose);

  // Search + Add row
  const toolbar = document.createElement("div");
  toolbar.style.cssText = "display:flex;gap:8px;padding:12px 20px;border-bottom:1px solid var(--border3)";
  const search = document.createElement("input");
  search.placeholder = "Search saved passwords…";
  search.style.cssText = "flex:1;background:var(--bg0);border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-family:var(--font);font-size:12px;color:var(--text0);outline:none";
  search.addEventListener("focus", () => search.style.borderColor = "var(--teal)");
  search.addEventListener("blur", () => search.style.borderColor = "var(--border)");
  const genBtn = document.createElement("button");
  genBtn.style.cssText = "padding:8px 14px;border-radius:8px;background:var(--teal3);border:1px solid rgba(13,148,136,0.2);color:var(--teal);font-size:11px;font-weight:500;cursor:pointer;font-family:var(--font);white-space:nowrap";
  genBtn.textContent = "Generate password";
  genBtn.addEventListener("click", generateAndShowPassword);
  toolbar.appendChild(search); toolbar.appendChild(genBtn);

  // List
  const list = document.createElement("div");
  list.style.cssText = "overflow-y:auto;flex:1;padding:8px 20px 16px";
  const loading = document.createElement("div");
  loading.style.cssText = "text-align:center;padding:40px;font-size:12px;color:var(--text3)";
  loading.textContent = "Loading vault…";
  list.appendChild(loading);

  card.appendChild(hdr); card.appendChild(toolbar); card.appendChild(list);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  search.focus();

  // Load passwords
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/nuur_vault?user_id=eq.${NUUR_USER_ID}&order=created_at.desc`,
      { headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` } }
    );
    const passwords = await res.json();
    list.replaceChildren();

    if (!Array.isArray(passwords) || !passwords.length) {
      const empty = document.createElement("div");
      empty.style.cssText = "text-align:center;padding:40px;color:var(--text3);font-size:13px";
      empty.textContent = "No saved passwords yet. Nuur saves passwords automatically when you use them on job application sites.";
      list.appendChild(empty);
      return;
    }

    let items = passwords;
    const render = (items) => {
      list.replaceChildren();
      items.forEach(p => {
        const row = document.createElement("div");
        row.style.cssText = "display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border3)";

        const icon = document.createElement("div");
        icon.style.cssText = "width:32px;height:32px;border-radius:8px;background:var(--bg0);border:1px solid var(--border3);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0";
        icon.textContent = "🔑";

        const info = document.createElement("div");
        info.style.flex = "1"; info.style.minWidth = "0";
        const domain = document.createElement("div");
        domain.style.cssText = "font-size:12.5px;font-weight:500;color:var(--text0);margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
        domain.textContent = p.domain || p.url || "Unknown site";
        const user = document.createElement("div");
        user.style.cssText = "font-size:11px;color:var(--text3)";
        user.textContent = p.username || p.email || "";
        info.appendChild(domain); info.appendChild(user);

        const actions = document.createElement("div");
        actions.style.cssText = "display:flex;gap:5px;flex-shrink:0";

        const copyPwBtn = document.createElement("button");
        copyPwBtn.style.cssText = "padding:5px 10px;border-radius:7px;background:var(--teal3);border:1px solid rgba(13,148,136,0.2);color:var(--teal);font-size:10px;cursor:pointer;font-family:var(--font)";
        copyPwBtn.textContent = "Copy";
        copyPwBtn.addEventListener("click", () => {
          navigator.clipboard.writeText(p.password_enc || "").catch(() => {});
          copyPwBtn.textContent = "Copied!";
          setTimeout(() => { copyPwBtn.textContent = "Copy"; }, 2000);
        });

        const delBtn = document.createElement("button");
        delBtn.style.cssText = "padding:5px 8px;border-radius:7px;background:transparent;border:1px solid var(--border);color:var(--text3);font-size:10px;cursor:pointer;font-family:var(--font);transition:color .12s";
        delBtn.textContent = "×";
        delBtn.addEventListener("mouseenter", () => { delBtn.style.color = "var(--red)"; delBtn.style.borderColor = "var(--red)"; });
        delBtn.addEventListener("mouseleave", () => { delBtn.style.color = "var(--text3)"; delBtn.style.borderColor = "var(--border)"; });
        delBtn.addEventListener("click", async () => {
          await fetch(`${SUPABASE_URL}/rest/v1/nuur_vault?id=eq.${p.id}`, {
            method: "DELETE",
            headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` }
          });
          row.style.opacity = "0"; row.style.transition = "opacity .2s";
          setTimeout(() => row.remove(), 200);
        });

        actions.appendChild(copyPwBtn); actions.appendChild(delBtn);
        row.appendChild(icon); row.appendChild(info); row.appendChild(actions);
        list.appendChild(row);
      });
    };

    render(items);

    search.addEventListener("input", () => {
      const q = search.value.toLowerCase();
      render(q ? items.filter(p => (p.domain + p.username + p.url).toLowerCase().includes(q)) : items);
    });

  } catch (e) {
    list.replaceChildren();
    const err = document.createElement("div");
    err.style.cssText = "text-align:center;padding:20px;font-size:12px;color:var(--red)";
    err.textContent = "Could not load vault: " + e.message;
    list.appendChild(err);
  }
}

function generateAndShowPassword() {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  const length = 16;
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  const password = Array.from(array, n => chars[n % chars.length]).join("");

  // Show generated password
  const existing = document.getElementById("nuur-gen-pw");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.id = "nuur-gen-pw";
  toast.style.cssText = "position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:10000;background:var(--bg1);border:1px solid var(--teal);border-radius:12px;padding:14px 18px;font-family:var(--font);box-shadow:0 8px 32px rgba(0,0,0,0.2);display:flex;align-items:center;gap:12px";
  const pw = document.createElement("code");
  pw.style.cssText = "font-size:14px;color:var(--teal);font-family:monospace;letter-spacing:.05em";
  pw.textContent = password;
  const copyBtn = document.createElement("button");
  copyBtn.style.cssText = "padding:6px 12px;border-radius:7px;background:var(--teal);border:none;color:#fff;font-size:11px;cursor:pointer;font-family:var(--font)";
  copyBtn.textContent = "Copy";
  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(password).catch(() => {});
    copyBtn.textContent = "Copied!";
    setTimeout(() => toast.remove(), 1000);
  });
  const x = document.createElement("button");
  x.style.cssText = "background:none;border:none;color:var(--text3);cursor:pointer;font-size:16px;padding:0";
  x.textContent = "×";
  x.addEventListener("click", () => toast.remove());
  toast.appendChild(pw); toast.appendChild(copyBtn); toast.appendChild(x);
  document.body.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 15000);
}


// ── MODULES LOADED SEPARATELY ────────────────────────────────────────
// nuur-dashboard-features.js — Interview, Salary, Networking, Kanban, Score
// nuur-career-coach.js — Negotiation, Debrief, Warmth, Compare, AB tracking
// nuur-system.js — Dark mode, Notifications, Brand score, IndexedDB, Dedup

// ── CROSS-MODULE ALIASES ─────────────────────────────────────────────
// Wire names used in switchView and hints to their actual implementations,
// which live in modules loaded after this file.

// loadSettingsTab — settings view is static HTML, just mark it loaded
function loadSettingsTab() {
  // Settings content is entirely in HTML — nothing async to load
  // Populate theme selector active state
  const current = localStorage.getItem("nuur_theme") || "literary";
  document.querySelectorAll("[data-theme]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.theme === current);
  });
}

// loadWorkflowsTab — alias for loadWorkflows which is defined above
function loadWorkflowsTab() {
  if (typeof loadWorkflows === "function") loadWorkflows();
}

// showDocumentWriter — alias for openDocumentWriter
function showDocumentWriter() {
  if (typeof openDocumentWriter === "function") openDocumentWriter();
}

// showNegotiationCoach — alias for the actual function name in career-coach.js
function showNegotiationCoach(data) {
  if (typeof showSalaryNegotiationCoach === "function") showSalaryNegotiationCoach(data);
}

// Wire nav-docs to document writer
document.getElementById("nav-docs")?.addEventListener("click", () => showDocumentWriter());

