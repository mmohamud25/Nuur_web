// ── NUUR WEB — Chrome API Compatibility Shim ─────────────────────
// Maps chrome.* extension APIs to browser-native equivalents
// so newtab.js runs unchanged in a regular web browser.

(function() {

// ── chrome.storage.local ─────────────────────────────────────────
const storage = {
  get(keys, cb) {
    try {
      const result = {};
      const ks = typeof keys === "string" ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
      ks.forEach(k => {
        const v = localStorage.getItem("nuur_" + k) ?? localStorage.getItem(k);
        if (v !== null) {
          try { result[k] = JSON.parse(v); } catch { result[k] = v; }
        } else if (typeof keys === "object" && !Array.isArray(keys) && k in keys) {
          result[k] = keys[k]; // default value
        }
      });
      if (cb) cb(result);
      return Promise.resolve(result);
    } catch(e) { if (cb) cb({}); return Promise.resolve({}); }
  },
  set(items, cb) {
    try {
      Object.entries(items).forEach(([k, v]) => {
        localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
      });
      if (cb) cb();
      return Promise.resolve();
    } catch(e) { if (cb) cb(); return Promise.resolve(); }
  },
  remove(keys, cb) {
    try {
      const ks = typeof keys === "string" ? [keys] : keys;
      ks.forEach(k => { localStorage.removeItem(k); localStorage.removeItem("nuur_" + k); });
      if (cb) cb();
      return Promise.resolve();
    } catch(e) { if (cb) cb(); return Promise.resolve(); }
  }
};

// ── sendMessage handlers — web equivalents of background.js ──────
async function handleMessage(msg) {
  if (!msg || !msg.type) return null;

  // Memory — read/write from localStorage
  if (msg.type === "GET_MEMORY") {
    const raw = localStorage.getItem("nuur_memory") || "{}";
    try { return JSON.parse(raw); } catch { return {}; }
  }
  if (msg.type === "UPDATE_MEMORY") {
    const existing = JSON.parse(localStorage.getItem("nuur_memory") || "{}");
    const updated = { ...existing, ...msg.memory };
    localStorage.setItem("nuur_memory", JSON.stringify(updated));
    return { ok: true };
  }

  // System prompt — build from profile + memory
  if (msg.type === "BUILD_SYSTEM_PROMPT") {
    const profile = JSON.parse(localStorage.getItem("nuur_profile") || "{}");
    const memory = JSON.parse(localStorage.getItem("nuur_memory") || "{}");
    const prompt = [
      profile.name ? `User: ${profile.name}` : "",
      profile.role ? `Role: ${profile.role}` : "",
      profile.goals ? `Goals: ${profile.goals}` : "",
      memory.conversation_summary ? `Context: ${memory.conversation_summary}` : "",
    ].filter(Boolean).join("\n") || "You are Nuur, a helpful AI assistant by Kulan Group.";
    return { system: prompt };
  }

  // Workflows — localStorage based
  if (msg.type === "GET_WORKFLOWS") {
    const raw = localStorage.getItem("nuur_workflows") || "[]";
    try { return { workflows: JSON.parse(raw) }; } catch { return { workflows: [] }; }
  }
  if (msg.type === "SAVE_WORKFLOW") {
    const wfs = JSON.parse(localStorage.getItem("nuur_workflows") || "[]");
    const idx = wfs.findIndex(w => w.id === msg.workflow?.id);
    if (idx > -1) wfs[idx] = msg.workflow; else wfs.push({ ...msg.workflow, id: Date.now().toString() });
    localStorage.setItem("nuur_workflows", JSON.stringify(wfs));
    return { ok: true };
  }
  if (msg.type === "DELETE_WORKFLOW") {
    const wfs = JSON.parse(localStorage.getItem("nuur_workflows") || "[]");
    localStorage.setItem("nuur_workflows", JSON.stringify(wfs.filter(w => w.id !== msg.id)));
    return { ok: true };
  }
  if (msg.type === "TOGGLE_WORKFLOW") {
    const wfs = JSON.parse(localStorage.getItem("nuur_workflows") || "[]");
    const w = wfs.find(x => x.id === msg.id);
    if (w) w.enabled = !w.enabled;
    localStorage.setItem("nuur_workflows", JSON.stringify(wfs));
    return { ok: true };
  }
  if (msg.type === "GET_WORKFLOW_RUNS") {
    return { runs: [] };
  }

  // Privacy mode
  if (msg.type === "SET_PRIVACY_MODE") {
    localStorage.setItem("nuur_privacy", msg.enabled ? "1" : "0");
    return { ok: true };
  }

  // Theme relay — no-op on web (CSS class already applied)
  if (msg.type === "THEME_CHANGED") return { ok: true };

  // Agent — not supported on web
  if (msg.type === "RUN_AGENT") return { ok: false, error: "Agent requires the browser extension" };
  if (msg.type === "DO_CAPTURE_SCREEN") return { ok: false, error: "Screen capture requires the browser extension" };
  if (msg.type === "LEARN_FROM_CONVERSATION") return { ok: true };
  if (msg.type === "AGENT_SUBMIT_CONFIRMED") return { ok: true };
  if (msg.type === "AGENT_SUBMIT_CANCELLED") return { ok: true };

  return null;
}

// ── chrome.runtime ────────────────────────────────────────────────
const _listeners = [];
const runtime = {
  sendMessage(msg, cb) {
    handleMessage(msg).then(res => {
      if (cb) { try { cb(res); } catch(e) {} }
    });
    return undefined;
  },
  onMessage: {
    addListener(fn) { _listeners.push(fn); },
    removeListener(fn) { const i = _listeners.indexOf(fn); if (i > -1) _listeners.splice(i, 1); }
  },
  lastError: null,
  getURL(path) { return "/" + path; },
  id: "nuur-web",
};

// ── chrome.tabs ───────────────────────────────────────────────────
const tabs = {
  query(opts, cb) { if (cb) cb([{ id: 1, url: location.href, title: document.title, windowId: 1 }]); },
  update(id, props) { if (props?.url) location.href = props.url; },
};

// ── chrome.alarms — no-op on web ─────────────────────────────────
const alarms = {
  create() {}, get(n, cb) { if (cb) cb(undefined); },
  onAlarm: { addListener() {} },
};

// ── chrome.notifications — no-op on web ──────────────────────────
const notifications = {
  create() {}, clear() {},
  onClicked: { addListener() {} },
};

// ── chrome.sidePanel — no-op on web ──────────────────────────────
const sidePanel = { open() {}, setOptions() {} };

// ── Expose global chrome object ───────────────────────────────────
window.chrome = {
  storage: { local: storage, sync: storage, session: storage },
  runtime,
  tabs,
  alarms,
  notifications,
  sidePanel,
  windows: { getCurrent(cb) { if(cb) cb({ id: 1 }); } },
  scripting: { executeScript() {} },
  action: { setBadgeText() {}, setBadgeBackgroundColor() {} },
};

// ── Nuur config constants ─────────────────────────────────────────
window.SUPABASE_URL = "https://advphrgxoemjhgsqxkbl.supabase.co";
window.ANON_KEY     = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkdnBocmd4b2Vtamhnc3F4a2JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MzAyMjYsImV4cCI6MjA5MTAwNjIyNn0.8tiWdrqxgFvXLWCuHr3Z2KMOMMw8msU95QmKG9CfuP8";
window.PROXY        = window.SUPABASE_URL + "/functions/v1/kulan-chrome";
window.NUUR_USER_ID = "mmohamud";

function escapeHtml(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
window.escapeHtml = escapeHtml;

console.log("Nuur Web: chrome-compat.js loaded");
})();
