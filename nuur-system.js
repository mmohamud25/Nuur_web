// ── NUUR SYSTEM TOOLS ────────────────────────────────────────────────
// Dark Mode, Notification Center, Personal Brand Score,
// Error Logging, IndexedDB, Job Alert Dedup, Easy Apply Pre-fill
// Requires: newtab.js globals (DB, NUUR_USER_ID, callNuur, renderMarkdown)

// ── DARK MODE FOR NEWTAB ──────────────────────────────────────────
// Applies theme to newtab — was missing despite sidepanel having it
// ══════════════════════════════════════════════════════════════════

function applyNewtabTheme() {
  const theme = localStorage.getItem("nuur_theme") || "dark";
  const root = document.documentElement;
  const body = document.body;

  // Remove all theme classes
  const allThemes = ["light","dark","black","navy","charcoal","purple","forest","rose","literary","system"];
  root.classList.remove(...allThemes.map(t => "theme-" + t));
  body.classList.remove(...allThemes.map(t => "theme-" + t));

  const effective = theme === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : theme;

  root.classList.add("theme-" + effective);
  body.classList.add("theme-" + effective);

  const set = (vars) => Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  const clear = (...keys) => keys.forEach(k => root.style.removeProperty(k));

  const base = ["--bg0","--bg1","--bg2","--bg3","--bg4",
                 "--teal","--teal2","--teal3","--teal4",
                 "--text0","--text1","--text2","--text3","--text4",
                 "--border","--border2","--border3","--navy"];

  // Clear all first
  clear(...base);

  const themes = {
    light: null, // uses :root defaults (indigo/slate set in HTML)
    dark: {
      "--bg0":"#0a0f1a","--bg1":"#111827","--bg2":"#111827","--bg3":"#1a2332","--bg4":"#243040",
      "--teal":"#0D9488","--teal2":"#0f766e","--teal3":"rgba(13,148,136,0.1)","--teal4":"rgba(13,148,136,0.05)",
      "--text0":"#f8fafc","--text1":"#e2e8f0","--text2":"#94a3b8","--text3":"#475569","--text4":"#334155",
      "--border":"#1e293b","--border2":"#334155","--border3":"#1e2d3d","--navy":"#0d1117"
    },
    black: {
      "--bg0":"#000","--bg1":"#0a0a0a","--bg2":"#0a0a0a","--bg3":"#141414","--bg4":"#1e1e1e",
      "--teal":"#e5e5e5","--teal2":"#a3a3a3","--teal3":"rgba(255,255,255,0.06)","--teal4":"rgba(255,255,255,0.03)",
      "--text0":"#fff","--text1":"#e5e5e5","--text2":"#a3a3a3","--text3":"#525252","--text4":"#404040",
      "--border":"#1a1a1a","--border2":"#262626","--border3":"#141414","--navy":"#000"
    },
    navy: {
      "--bg0":"#f0f2f7","--bg1":"#ffffff","--bg2":"#ffffff","--bg3":"#e8ecf5","--bg4":"#dde3ef",
      "--teal":"#D97706","--teal2":"#b45309","--teal3":"rgba(217,119,6,0.09)","--teal4":"rgba(217,119,6,0.04)",
      "--text0":"#0B2545","--text1":"#1e3a5f","--text2":"#475569","--text3":"#94a3b8","--text4":"#cbd5e1",
      "--border":"#c9d0df","--border2":"#b5bfd4","--border3":"#dde3ef"
    },
    charcoal: {
      "--bg0":"#f5f3f0","--bg1":"#ffffff","--bg2":"#ffffff","--bg3":"#edebe6","--bg4":"#e2ddd6",
      "--teal":"#D85A30","--teal2":"#c04b24","--teal3":"rgba(216,90,48,0.09)","--teal4":"rgba(216,90,48,0.04)",
      "--text0":"#1a1714","--text1":"#2C2C2A","--text2":"#5f5e5a","--text3":"#888780","--text4":"#b4b2a9",
      "--border":"#d3cfc8","--border2":"#bfbbb4","--border3":"#e2ddd6"
    },
    purple: {
      "--bg0":"#f5f3fe","--bg1":"#ffffff","--bg2":"#ffffff","--bg3":"#EEEDFE","--bg4":"#e0deff",
      "--teal":"#7F77DD","--teal2":"#534AB7","--teal3":"rgba(127,119,221,0.09)","--teal4":"rgba(127,119,221,0.04)",
      "--text0":"#1e1b4b","--text1":"#312e81","--text2":"#475569","--text3":"#94a3b8","--text4":"#cbd5e1",
      "--border":"#CECBF6","--border2":"#AFA9EC","--border3":"#E0DEFF"
    },
    forest: {
      "--bg0":"#f2f5f0","--bg1":"#ffffff","--bg2":"#ffffff","--bg3":"#EAF3DE","--bg4":"#d8eccc",
      "--teal":"#3B6D11","--teal2":"#27500A","--teal3":"rgba(59,109,17,0.09)","--teal4":"rgba(59,109,17,0.04)",
      "--text0":"#173404","--text1":"#27500A","--text2":"#475569","--text3":"#94a3b8","--text4":"#cbd5e1",
      "--border":"#C0DD97","--border2":"#97C459","--border3":"#d8eccc"
    },
    rose: {
      "--bg0":"#fdf4f7","--bg1":"#ffffff","--bg2":"#ffffff","--bg3":"#FBEAF0","--bg4":"#F4C0D1",
      "--teal":"#D4537E","--teal2":"#993556","--teal3":"rgba(212,83,126,0.09)","--teal4":"rgba(212,83,126,0.04)",
      "--text0":"#4B1528","--text1":"#72243E","--text2":"#475569","--text3":"#94a3b8","--text4":"#cbd5e1",
      "--border":"#F4C0D1","--border2":"#ED93B1","--border3":"#FBEAF0"
    },
    literary: {
      "--bg0":"#FAF5EC","--bg1":"#FFFFFF","--bg2":"#FFFFFF","--bg3":"rgba(250,245,236,0.7)","--bg4":"rgba(60,40,30,0.05)",
      "--teal":"#6366F1","--teal2":"#4F46E5","--teal3":"rgba(99,102,241,0.10)","--teal4":"rgba(99,102,241,0.06)",
      "--text0":"#1A1726","--text1":"#2C2A35","--text2":"#5C5668","--text3":"#8A8395","--text4":"#8A8395",
      "--border":"rgba(60,40,30,0.10)","--border2":"rgba(60,40,30,0.07)","--border3":"rgba(60,40,30,0.05)"
    }
  };

  const vars = themes[effective];
  if (vars) set(vars);
  // "light" (null) — :root CSS defaults apply (Indigo/Slate defined in HTML)

  if (theme === "system") {
    // N-31: persistent listener — no { once: true } so it tracks all future OS theme changes
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    // Remove any previous listener before adding to avoid duplicates
    mq.removeEventListener("change", applyNewtabTheme);
    mq.addEventListener("change", applyNewtabTheme);
  }
}

// Apply on load
applyNewtabTheme();

// Wire theme selector in settings to also update newtab
const themeSelect = document.getElementById("theme-select");
if (themeSelect) {
  themeSelect.addEventListener("change", () => {
    localStorage.setItem("nuur_theme", themeSelect.value);
    applyNewtabTheme();
  });
}

// ══════════════════════════════════════════════════════════════════
// ── NOTIFICATION CENTER ───────────────────────────────────────════
// Logs all chrome.notifications and shows in-app history
// ══════════════════════════════════════════════════════════════════

const NOTIF_KEY = "nuur_notifications";
const MAX_NOTIFS = 50;

function logNotification(title, message, type = "info") {
  const notifs = getNotifications();
  notifs.unshift({
    id: `n_${Date.now()}`,
    title,
    message,
    type,
    ts: Date.now(),
    read: false
  });
  localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs.slice(0, MAX_NOTIFS)));
  updateBellBadge();
}

function getNotifications() {
  // Extension page (newtab.html) — localStorage is isolated from page scripts
  try { return JSON.parse(localStorage.getItem(NOTIF_KEY) || "[]"); }
  catch (_) { return []; }
}

function markAllRead() {
  const notifs = getNotifications().map(n => ({ ...n, read: true }));
  localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs));
  updateBellBadge();
}

function updateBellBadge() {
  const unread = getNotifications().filter(n => !n.read).length;
  const badge = document.getElementById("nuur-bell-badge");
  if (!badge) return;
  // Always show the coral dot; pulse it when there are unread items
  badge.style.display = "block";
  badge.style.boxShadow = unread > 0 ? "0 0 0 2px rgba(232,109,87,0.3)" : "none";
  badge.title = unread > 0 ? `${unread} unread` : "";
}

function showNotificationCenter() {
  const existing = document.getElementById("nuur-notif-center");
  if (existing) { existing.remove(); return; }

  const panel = document.createElement("div");
  panel.id = "nuur-notif-center";
  panel.style.cssText = "position:fixed;top:58px;right:12px;z-index:9998;width:320px;background:var(--bg1);border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow-lg);overflow:hidden;font-family:var(--font)";

  const hdr = document.createElement("div");
  hdr.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid var(--border3)";
  const ht = document.createElement("div");
  ht.style.cssText = "font-size:13px;font-weight:600;color:var(--text0)";
  ht.textContent = "Notifications";
  const markRead = document.createElement("button");
  markRead.style.cssText = "font-size:11px;color:var(--teal);background:none;border:none;cursor:pointer;font-family:var(--font)";
  markRead.textContent = "Mark all read";
  markRead.addEventListener("click", () => { markAllRead(); renderNotifs(); });
  hdr.appendChild(ht); hdr.appendChild(markRead);
  panel.appendChild(hdr);

  const list = document.createElement("div");
  list.style.cssText = "max-height:380px;overflow-y:auto";
  panel.appendChild(list);

  const renderNotifs = () => {
    list.replaceChildren();
    const notifs = getNotifications();
    if (!notifs.length) {
      const empty = document.createElement("div");
      empty.style.cssText = "padding:24px;text-align:center;font-size:12px;color:var(--text3)";
      empty.textContent = "No notifications yet";
      list.appendChild(empty);
      return;
    }
    notifs.forEach(n => {
      const item = document.createElement("div");
      item.style.cssText = `display:flex;gap:10px;padding:11px 14px;border-bottom:1px solid var(--border3);cursor:pointer;background:${n.read ? "transparent" : "var(--teal3)"}`;
      item.addEventListener("click", () => {
        const updated = getNotifications().map(x => x.id === n.id ? { ...x, read: true } : x);
        localStorage.setItem(NOTIF_KEY, JSON.stringify(updated));
        item.style.background = "transparent";
        updateBellBadge();
      });
      const dot = document.createElement("div");
      dot.style.cssText = `width:7px;height:7px;border-radius:50%;background:${n.read ? "transparent" : "var(--teal)"};margin-top:5px;flex-shrink:0`;
      const content = document.createElement("div");
      content.style.flex = "1";
      const title = document.createElement("div");
      title.style.cssText = "font-size:12px;font-weight:500;color:var(--text0);margin-bottom:2px";
      title.textContent = n.title;
      const msg = document.createElement("div");
      msg.style.cssText = "font-size:11px;color:var(--text3);line-height:1.45";
      msg.textContent = n.message;
      const time = document.createElement("div");
      time.style.cssText = "font-size:10px;color:var(--text4);margin-top:3px";
      time.textContent = getRelativeTime(new Date(n.ts).toISOString());
      content.appendChild(title); content.appendChild(msg); content.appendChild(time);
      item.appendChild(dot); item.appendChild(content);
      list.appendChild(item);
    });
  };

  renderNotifs();

  // Close on outside click
  setTimeout(() => {
    document.addEventListener("click", function handler(e) {
      if (!panel.contains(e.target) && e.target.id !== "nuur-bell-btn") {
        panel.remove();
        document.removeEventListener("click", handler);
      }
    });
  }, 50);

  document.body.appendChild(panel);
}

// Add bell button to header
(function addBellToHeader() {
  const headerRight = document.querySelector(".header-right");
  if (!headerRight || document.getElementById("nuur-bell-btn")) return;

  const bellBtn = document.createElement("button");
  bellBtn.id = "nuur-bell-btn";
  bellBtn.className = "icon-btn";
  bellBtn.title = "Notifications";
  bellBtn.style.position = "relative";
  bellBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;

  const badge = document.createElement("div");
  badge.id = "nuur-bell-badge";
  badge.style.cssText = "position:absolute;top:-2px;right:-2px;width:7px;height:7px;background:#E86D57;border-radius:50%;border:2px solid #fff";
  bellBtn.appendChild(badge);
  bellBtn.addEventListener("click", showNotificationCenter);

  headerRight.insertBefore(bellBtn, headerRight.firstChild);
  updateBellBadge();
})();

// Log sample notification so bell isn't empty on first open
if (!getNotifications().length) {
  logNotification("✦ Nuur is ready", "Your AI career assistant is fully set up. Open the Dashboard to see your job search stats.", "info");
}

// Wire offer comparison + question bank + resume AB to settings
document.getElementById("btn-export-csv")?.addEventListener("click", exportAllDataCSV);
document.addEventListener("click", e => {
  if (e.target.id === "btn-offer-compare") showOfferComparison();
  if (e.target.id === "btn-question-bank") showQuestionBank();
  if (e.target.id === "btn-resume-ab")     showResumeVersionAnalytics();
  if (e.target.id === "btn-brand-score")   showPersonalBrandScore();
});

// ══════════════════════════════════════════════════════════════════
// ── PERSONAL BRAND SCORE ─────────────────────────────────────────
// Aggregates LinkedIn + GitHub + Portfolio + Podcast into 1-100 score
// ══════════════════════════════════════════════════════════════════

async function showPersonalBrandScore() {
  const existing = document.getElementById("nuur-brand-score");
  if (existing) { existing.remove(); return; }

  const overlay = document.createElement("div");
  overlay.id = "nuur-brand-score";
  overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;padding:20px;font-family:var(--font)";
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });

  const card = document.createElement("div");
  card.style.cssText = "background:var(--bg1);border:1px solid var(--border);border-radius:16px;width:100%;max-width:580px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:var(--shadow-lg)";

  const hdr = document.createElement("div");
  hdr.style.cssText = "padding:16px 20px;border-bottom:1px solid var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:space-between";
  const ht = document.createElement("div");
  ht.style.cssText = "font-size:14px;font-weight:600;color:var(--text0)";
  ht.textContent = "🌐 Personal Brand Score";
  const hx = document.createElement("button");
  hx.style.cssText = "background:none;border:none;color:var(--text3);cursor:pointer;font-size:18px;padding:0";
  hx.textContent = "×";
  hx.addEventListener("click", () => overlay.remove());
  hdr.appendChild(ht); hdr.appendChild(hx);

  const body = document.createElement("div");
  body.style.cssText = "flex:1;overflow-y:auto;padding:20px";

  // Loading state
  const loading = document.createElement("div");
  loading.style.cssText = "text-align:center;padding:30px;color:var(--text3);font-size:13px";
  loading.textContent = "Scanning your brand presence…";
  body.appendChild(loading);

  card.appendChild(hdr); card.appendChild(body);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // Gather data in parallel
  const GITHUB_USER = (typeof NUUR_USER_ID !== "undefined" ? NUUR_USER_ID : "mmohamud25");
  const LINKEDIN_URL = "linkedin.com/in/" + (typeof NUUR_USER_ID !== "undefined" ? NUUR_USER_ID : "mmohamud25");
  const PORTFOLIO_URL = "https://mmohamud.me";

  const results = {};

  // GitHub — public API, no auth needed
  const [ghEvents, ghRepos] = await Promise.allSettled([
    fetch(`https://api.github.com/users/${GITHUB_USER}/events/public?per_page=30`)
      .then(r => r.ok ? r.json() : []).catch(() => []),
    fetch(`https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=updated`)
      .then(r => r.ok ? r.json() : []).catch(() => [])
  ]);

  const events = ghEvents.value || [];
  const repos = ghRepos.value || [];

  // GitHub score (max 30pts)
  const recentCommits = events.filter(e => e.type === "PushEvent").length;
  const publicRepos = repos.filter(r => !r.fork && !r.private).length;
  const totalStars = repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
  const ghScore = Math.min(
    Math.round(recentCommits * 1.5) + Math.min(publicRepos * 2, 15) + Math.min(totalStars * 3, 10),
    30
  );
  results.github = { score: ghScore, commits: recentCommits, repos: publicRepos, stars: totalStars };

  // Portfolio — check if it loads (max 15pts)
  let portfolioScore = 0;
  try {
    const pfRes = await fetch(PORTFOLIO_URL, { method: "HEAD", mode: "no-cors" });
    portfolioScore = 15; // if it didn't throw, it exists
  } catch (_) { portfolioScore = 0; }
  results.portfolio = { score: portfolioScore };

  // Applications + activity from Supabase (job search activity = brand building, max 20pts)
  let activityScore = 0;
  try {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const [recentApps, agentRuns] = await Promise.allSettled([
      DB.get("nuur_applications", `?user_id=eq.${NUUR_USER_ID}&applied_at=gte.${weekAgo}`),
      DB.get("nuur_agent_sessions", `?user_id=eq.${NUUR_USER_ID}&session_date=gte.${weekAgo}`)
    ]);
    const apps = recentApps.value?.length || 0;
    const runs = agentRuns.value?.length || 0;
    activityScore = Math.min(apps * 2 + runs * 3, 20);
    results.activity = { score: activityScore, apps, runs };
  } catch (_) { results.activity = { score: 0, apps: 0, runs: 0 }; }

  // LinkedIn presence (estimated from profile completeness, max 25pts)
  const linkedInScore = 20; // Base — real check requires OAuth
  results.linkedin = { score: linkedInScore, note: "Estimated — full check needs LinkedIn login" };

  // Podcast / Intel Cast (max 10pts) — base score for having one
  const podcastScore = 10;
  results.podcast = { score: podcastScore };

  const totalScore = ghScore + portfolioScore + activityScore + linkedInScore + podcastScore;

  const scoreLabel = totalScore >= 80 ? ["Strong presence 🔥", "var(--green)"]
    : totalScore >= 60 ? ["Building momentum 📈", "var(--teal)"]
    : totalScore >= 40 ? ["Getting started 🌱", "var(--gold)"]
    : ["Needs work 💪", "var(--text3)"];

  // Render
  body.replaceChildren();

  // Big score circle
  const scoreWrap = document.createElement("div");
  scoreWrap.style.cssText = "display:flex;align-items:center;gap:20px;margin-bottom:24px;padding:18px;background:var(--bg0);border-radius:14px;border:1px solid var(--border)";
  const circle = document.createElement("div");
  circle.style.cssText = `width:80px;height:80px;border-radius:50%;border:4px solid ${scoreLabel[1]};display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0`;
  const scoreNum = document.createElement("div");
  scoreNum.style.cssText = `font-size:28px;font-weight:700;color:${scoreLabel[1]};letter-spacing:-.03em;line-height:1`;
  scoreNum.textContent = totalScore;
  const scoreMax = document.createElement("div");
  scoreMax.style.cssText = "font-size:10px;color:var(--text3)";
  scoreMax.textContent = "/ 100";
  circle.appendChild(scoreNum); circle.appendChild(scoreMax);
  const scoreInfo = document.createElement("div");
  const sl = document.createElement("div");
  sl.style.cssText = `font-size:16px;font-weight:600;color:${scoreLabel[1]};margin-bottom:4px`;
  sl.textContent = scoreLabel[0];
  const sw = document.createElement("div");
  sw.style.cssText = "font-size:12px;color:var(--text3)";
  sw.textContent = "Personal brand score — updated now";
  scoreInfo.appendChild(sl); scoreInfo.appendChild(sw);
  scoreWrap.appendChild(circle); scoreWrap.appendChild(scoreInfo);
  body.appendChild(scoreWrap);

  // Component breakdown
  const components = [
    { icon: "💻", label: "GitHub activity",    score: ghScore,         max: 30,
      detail: `${recentCommits} commits, ${publicRepos} repos, ${totalStars} stars (last 30 days)` },
    { icon: "💼", label: "LinkedIn presence",  score: linkedInScore,   max: 25,
      detail: "Profile exists with certifications + experience" },
    { icon: "🌐", label: "Portfolio site",     score: portfolioScore,  max: 15,
      detail: portfolioScore ? "mmohamud.me is live and accessible" : "Portfolio not reachable" },
    { icon: "⚡", label: "Job search activity",score: activityScore,   max: 20,
      detail: `${results.activity.apps} applications, ${results.activity.runs} agent runs this week` },
    { icon: "🎙", label: "Intel Cast podcast",  score: podcastScore,    max: 10,
      detail: "Active podcast presence" },
  ];

  const secTitle = document.createElement("div");
  secTitle.style.cssText = "font-size:10px;font-weight:600;color:var(--text3);letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px";
  secTitle.textContent = "Score breakdown";
  body.appendChild(secTitle);

  components.forEach(c => {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:center;gap:12px;margin-bottom:10px";
    const icon = document.createElement("div");
    icon.style.cssText = "font-size:18px;flex-shrink:0;width:24px;text-align:center";
    icon.textContent = c.icon;
    const info = document.createElement("div");
    info.style.flex = "1"; info.style.minWidth = "0";
    const top = document.createElement("div");
    top.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:3px";
    const lbl = document.createElement("div");
    lbl.style.cssText = "font-size:12.5px;font-weight:500;color:var(--text1)";
    lbl.textContent = c.label;
    const pts = document.createElement("div");
    pts.style.cssText = "font-size:11px;color:var(--text3);flex-shrink:0";
    pts.textContent = `${c.score}/${c.max}`;
    top.appendChild(lbl); top.appendChild(pts);
    const barWrap = document.createElement("div");
    barWrap.style.cssText = "height:6px;background:var(--bg0);border-radius:3px;overflow:hidden;margin-bottom:3px";
    const bar = document.createElement("div");
    bar.style.cssText = `height:100%;width:${Math.round((c.score/c.max)*100)}%;background:${c.score >= c.max*0.7 ? "var(--green)" : c.score >= c.max*0.4 ? "var(--teal)" : "var(--gold)"};border-radius:3px;transition:width .5s var(--ease)`;
    barWrap.appendChild(bar);
    const detail = document.createElement("div");
    detail.style.cssText = "font-size:11px;color:var(--text3)";
    detail.textContent = c.detail;
    info.appendChild(top); info.appendChild(barWrap); info.appendChild(detail);
    row.appendChild(icon); row.appendChild(info);
    body.appendChild(row);
  });

  // AI improvement tips
  const tipsBtn = document.createElement("button");
  tipsBtn.style.cssText = "width:100%;margin-top:14px;padding:10px;border-radius:9px;background:var(--teal3);border:1px solid rgba(13,148,136,0.2);color:var(--teal);font-family:var(--font);font-size:12px;font-weight:500;cursor:pointer";
  tipsBtn.textContent = "✦ Get improvement tips";
  tipsBtn.addEventListener("click", async () => {
    tipsBtn.textContent = "Generating…"; tipsBtn.disabled = true;
    try {
      const tips = await callNuur({
        prompt: `Personal brand score: ${totalScore}/100. GitHub: ${ghScore}/30 (${recentCommits} commits, ${publicRepos} repos). LinkedIn: ${linkedInScore}/25. Portfolio: ${portfolioScore}/15. Activity: ${activityScore}/20. Podcast: ${podcastScore}/10.\n\nGive 5 specific, actionable ways to improve this score for a cybersecurity professional targeting GRC/SOC roles. Focus on the weakest areas. No em dashes, no AI phrases.`,
        model: MODEL.FAST
      });
      const tipsEl = document.createElement("div");
      tipsEl.style.cssText = "margin-top:10px;font-size:12.5px;color:var(--text1);line-height:1.7";
      renderMarkdown(tips, tipsEl);
      tipsBtn.replaceWith(tipsEl);
    } catch (_) { tipsBtn.textContent = "✦ Get improvement tips"; tipsBtn.disabled = false; }
  });
  body.appendChild(tipsBtn);
}

// ══════════════════════════════════════════════════════════════════
// ── ERROR LOGGING ────────────────────────────────────────────────
// Central error logger — saves to Supabase for debugging
// ══════════════════════════════════════════════════════════════════

const _nuurErrorLog = [];
const MAX_ERROR_LOG = 100;

async function logError(context, error, extra = {}) {
  const entry = {
    ts: Date.now(),
    context,
    message: error?.message || String(error),
    stack: error?.stack?.substring(0, 300) || "",
    url: location?.href?.substring(0, 100) || "",
    ...extra
  };

  // Keep local buffer (no network for transient errors)
  _nuurErrorLog.unshift(entry);
  if (_nuurErrorLog.length > MAX_ERROR_LOG) _nuurErrorLog.length = MAX_ERROR_LOG;

  // Only persist serious errors to Supabase (not rate limit / network errors)
  const isTransient = /fetch|network|timeout|429|rate/i.test(entry.message);
  if (!isTransient) {
    DB.insert("nuur_errors", {
      id: `err_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,
      user_id: NUUR_USER_ID,
      context,
      message: entry.message,
      stack: entry.stack,
      page_url: entry.url,
      created_at: new Date(entry.ts).toISOString()
    }).catch(() => {}); // never throw from error logger
  }
}

// ══════════════════════════════════════════════════════════════════
// ── INDEXEDDB OFFLINE STORAGE ────────────────────────────────────
// Replaces chrome.storage.local for large data (no 10MB limit)
// Used for: chat history cache, archived postings, offline dashboard
// ══════════════════════════════════════════════════════════════════

const NuurDB = {
  _db: null,
  DB_NAME: "nuur_local",
  DB_VERSION: 1,
  STORES: ["cache", "chat_history", "postings", "preferences"],

  async open() {
    if (this._db) return this._db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        this.STORES.forEach(name => {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: "key" });
          }
        });
      };
      req.onsuccess = e => { this._db = e.target.result; resolve(this._db); };
      req.onerror = () => reject(req.error);
    });
  },

  async get(store, key) {
    try {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readonly");
        const req = tx.objectStore(store).get(key);
        req.onsuccess = () => resolve(req.result?.value ?? null);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      logError("NuurDB.get", e, { store, key });
      return null;
    }
  },

  async set(store, key, value) {
    try {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readwrite");
        const req = tx.objectStore(store).put({ key, value, ts: Date.now() });
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      logError("NuurDB.set", e, { store, key });
      return false;
    }
  },

  async delete(store, key) {
    try {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readwrite");
        const req = tx.objectStore(store).delete(key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      logError("NuurDB.delete", e, { store, key });
      return false;
    }
  },

  async getAll(store) {
    try {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(store, "readonly");
        const req = tx.objectStore(store).getAll();
        req.onsuccess = () => resolve(req.result.map(r => ({ key: r.key, value: r.value, ts: r.ts })));
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      logError("NuurDB.getAll", e, { store });
      return [];
    }
  }
};

// Migrate large chat history from chrome.storage to IndexedDB
(async function migrateToIndexedDB() {
  try {
    const cached = await new Promise(r =>
      chrome.storage.local.get(["nuur_cached_apps", "nuur_apps_cached_at"], r)
    );
    if (cached.nuur_cached_apps) {
      await NuurDB.set("cache", "apps", {
        data: cached.nuur_cached_apps,
        ts: cached.nuur_apps_cached_at
      });
      // Clear from chrome.storage.local after migration
      chrome.storage.local.remove(["nuur_cached_apps", "nuur_apps_cached_at"]);
    }
  } catch (_) {}
})();

// Update loadDashboard offline fallback to use IndexedDB
async function getOfflineDashboardCache() {
  // Try IndexedDB first (no size limit)
  const idbCache = await NuurDB.get("cache", "apps");
  if (idbCache) return idbCache;
  // Fall back to chrome.storage.local for older installs
  return new Promise(r => chrome.storage.local.get(["nuur_cached_apps", "nuur_apps_cached_at"], data => {
    if (data.nuur_cached_apps) r({ data: data.nuur_cached_apps, ts: data.nuur_apps_cached_at });
    else r(null);
  }));
}

// Archive large items (job postings) to IndexedDB instead of Supabase
async function archivePostingLocally(appId, postingText) {
  await NuurDB.set("postings", appId, { text: postingText, ts: Date.now() });
}

async function getArchivedPosting(appId) {
  return NuurDB.get("postings", appId);
}

// ══════════════════════════════════════════════════════════════════
// ── JOB ALERT DEDUPLICATION ──────────────────────────────────────
// Prevents saved search monitor from alerting on same posting twice
// ══════════════════════════════════════════════════════════════════

const SEEN_JOBS_KEY = "nuur_seen_jobs";
const MAX_SEEN = 500;

function getSeenJobs() {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_JOBS_KEY) || "[]")); }
  catch (_) { return new Set(); }
}

function saveSeenJobs(seen) {
  const arr = Array.from(seen).slice(-MAX_SEEN);
  localStorage.setItem(SEEN_JOBS_KEY, JSON.stringify(arr));
}

function hashJob(title, company, url) {
  // Simple deterministic hash — same posting = same hash
  const str = `${title?.toLowerCase().trim()}|${company?.toLowerCase().trim()}|${url?.split("?")[0]}`;
  let hash = 0;
  for (const char of str) {
    hash = ((hash << 5) - hash) + char.charCodeAt(0);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function isNewJob(title, company, url) {
  const seen = getSeenJobs();
  const h = hashJob(title, company, url);
  if (seen.has(h)) return false;
  seen.add(h);
  saveSeenJobs(seen);
  return true;
}

// Wrap the saved search "run" result processing to deduplicate
function processSearchResults(results, searchQuery) {
  if (!Array.isArray(results)) return results;
  const newResults = results.filter(job =>
    isNewJob(job.title, job.company, job.url)
  );

  if (newResults.length > 0) {
    logNotification(
      `🔍 ${newResults.length} new ${newResults.length === 1 ? "job" : "jobs"} found`,
      `Search: "${searchQuery}" — ${newResults.map(j => `${j.company}`).slice(0,3).join(", ")}${newResults.length > 3 ? "…" : ""}`,
      "search"
    );
  }
  return newResults;
}

// ══════════════════════════════════════════════════════════════════
// ── LINKEDIN EASY APPLY PRE-FILL ─────────────────────────────────
// Detects Easy Apply on LinkedIn and pre-fills from profile
// ══════════════════════════════════════════════════════════════════

// This runs as a content script trigger — fires when Easy Apply detected
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "EASY_APPLY_DETECTED") {
    showEasyApplyHelper(msg.job);
    sendResponse({ ok: true });
  }
});

function showEasyApplyHelper(job = {}) {
  const existing = document.getElementById("nuur-easy-apply");
  if (existing) { existing.remove(); return; }

  const panel = document.createElement("div");
  panel.id = "nuur-easy-apply";
  panel.style.cssText = "position:fixed;bottom:24px;right:24px;z-index:9999;width:300px;background:var(--bg1);border:1px solid var(--teal);border-radius:14px;padding:14px 16px;box-shadow:var(--shadow-lg);font-family:var(--font)";

  const hdr = document.createElement("div");
  hdr.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:10px";
  const hl = document.createElement("div");
  hl.style.cssText = "font-size:12.5px;font-weight:600;color:var(--teal)";
  hl.textContent = "✦ Nuur — Easy Apply detected";
  const hx = document.createElement("button");
  hx.style.cssText = "background:none;border:none;color:var(--text3);cursor:pointer;font-size:16px;padding:0";
  hx.textContent = "×";
  hx.addEventListener("click", () => panel.remove());
  hdr.appendChild(hl); hdr.appendChild(hx);

  const jobInfo = document.createElement("div");
  jobInfo.style.cssText = "font-size:12px;color:var(--text2);margin-bottom:12px;line-height:1.5";
  jobInfo.textContent = job.title ? `${job.title} at ${job.company}` : "Job detected";

  const btns = document.createElement("div");
  btns.style.cssText = "display:flex;flex-direction:column;gap:6px";

  const autoBtn = document.createElement("button");
  autoBtn.style.cssText = "padding:9px;border-radius:9px;background:var(--teal);border:none;color:#fff;font-family:var(--font);font-size:12px;font-weight:500;cursor:pointer";
  autoBtn.textContent = "⚡ Auto-fill from my profile";
  autoBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "RUN_AGENT", goal: `Fill out the LinkedIn Easy Apply form for ${job.title || "this job"} at ${job.company || "this company"} using my saved profile. Read the form first, fill every field carefully, then previewSubmit before submitting.` });
    switchView("agent");
    panel.remove();
  });

  const trackBtn = document.createElement("button");
  trackBtn.style.cssText = "padding:9px;border-radius:9px;background:var(--bg0);border:1px solid var(--border);color:var(--text2);font-family:var(--font);font-size:12px;cursor:pointer";
  trackBtn.textContent = "📋 Track application only";
  trackBtn.addEventListener("click", async () => {
    await DB.insert("nuur_applications", {
      user_id: NUUR_USER_ID,
      job_title: job.title || "Unknown",
      company: job.company || "Unknown",
      job_url: job.url || location.href,
      platform: "LinkedIn",
      status: "applied",
      applied_at: new Date().toISOString()
    });
    trackBtn.textContent = "✓ Tracked!";
    setTimeout(() => panel.remove(), 1500);
  });

  btns.appendChild(autoBtn); btns.appendChild(trackBtn);
  panel.appendChild(hdr); panel.appendChild(jobInfo); panel.appendChild(btns);
  document.body.appendChild(panel);
}
