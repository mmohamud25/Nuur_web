// ── NUUR SHARED CONFIG ────────────────────────────────────────────

// ── SECURITY: HTML ESCAPER ────────────────────────────────────────
// Use this for ALL AI-generated content inserted into innerHTML.
// Prevents XSS when extension runs on <all_urls>.
function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}


var NUUR_USER_ID = "mmohamud";
var SUPABASE_URL = "https://advphrgxoemjhgsqxkbl.supabase.co";
// NOTE: Content scripts run in isolated worlds — these vars are NOT accessible
// by page JavaScript. The PROXY_API relay in background.js is available for
// background-only operations, but content scripts can use these vars directly.
var ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkdnBocmd4b2Vtamhnc3F4a2JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MzAyMjYsImV4cCI6MjA5MTAwNjIyNn0.8tiWdrqxgFvXLWCuHr3Z2KMOMMw8msU95QmKG9CfuP8";
var PROXY = SUPABASE_URL + "/functions/v1/kulan-chrome";

// ── GLOBAL EVENT DELEGATION ───────────────────────────────────────
// Handles data-nuur-close and data-nuur-copy on any injected panel
// Avoids inline onclick which is blocked by strict CSP pages

document.addEventListener("click", (e) => {
  // Close button: data-nuur-close="panel-id" removes the panel
  const closeEl = e.target.closest("[data-nuur-close]");
  if (closeEl) {
    const targetId = closeEl.dataset.nuurClose;
    const target = targetId
      ? document.getElementById(targetId)
      : closeEl.closest('[id^="nuur-"]');
    if (target) target.remove();
    return;
  }

  // Copy button: data-nuur-copy="text to copy"
  const copyEl = e.target.closest("[data-nuur-copy]");
  if (copyEl) {
    const text = copyEl.dataset.nuurCopy;
    if (text) {
      navigator.clipboard.writeText(text).catch(() => {});
      const orig = copyEl.textContent;
      copyEl.textContent = "Copied!";
      setTimeout(() => { copyEl.textContent = orig; }, 2000);
    }
    return;
  }

  // Toggle button: data-nuur-toggle="element-id" or toggles next sibling
  const toggleEl = e.target.closest("[data-nuur-toggle]");
  if (toggleEl) {
    const targetId = toggleEl.dataset.nuurToggle;
    let target;
    if (targetId === "next") {
      target = toggleEl.nextElementSibling;
    } else {
      target = document.getElementById(targetId);
    }
    if (target) {
      target.style.display = target.style.display === "none" ? "block" : "none";
    }
    return;
  }
}, true);

// ── callClaude COMPATIBILITY WRAPPER ──────────────────────────────
// Several content scripts call callClaude(prompt, system, model).
// This wrapper maps to callNuur which is defined in supabase.js.
// Loaded here so it's available before supabase.js in content scripts.
async function callClaude(prompt, system, model) {
  const m = model || "sonnet";
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: "PROXY_API", payload: { prompt, system, model: m } },
      (res) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        if (!res?.ok) return reject(new Error(res?.error || "API relay error"));
        const text = res.data?.content?.[0]?.text || "";
        resolve(text);
      }
    );
  });
}
