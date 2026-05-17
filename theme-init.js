// Applies theme synchronously before body renders — no flash
(function() {
  try {
    // Migrate any pre-NUR default (dark) to literary on first load
    var stored = localStorage.getItem("nuur_theme");
    if (!stored || stored === "dark") {
      localStorage.setItem("nuur_theme", "literary");
    }
    var t = localStorage.getItem("nuur_theme") || "literary"; // NUR literary default
    var f = localStorage.getItem("nuur_font") || "small";
    var html = document.documentElement;
    var applyClasses = function(el) {
      el.className = el.className.replace(/\btheme-\S+|\bfont-\S+/g, "").trim();
      el.classList.add("theme-" + t);
      if (f !== "small") el.classList.add("font-" + f);
    };
    applyClasses(html);
    if (document.body) {
      applyClasses(document.body);
    } else {
      document.addEventListener("DOMContentLoaded", function() {
        applyClasses(document.body);
      });
    }
  } catch(_) {}
})();
