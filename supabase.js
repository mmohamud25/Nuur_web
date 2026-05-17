// ── NUUR API MODULE ───────────────────────────────────────────────
// Single source of truth for all Claude API calls across Nuur.
// Every content script and background script uses callNuur().

const MODEL = { FAST: "haiku", DEFAULT: "sonnet", HEAVY: "sonnet" };

async function callNuur({ prompt, model = MODEL.DEFAULT, system = null, messages = null }) {
  const body = { model };
  if (messages) { body.messages = messages; } else { body.prompt = prompt; }
  if (system) body.system = system;

  const res = await fetch(PROXY, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Nuur API ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "Unknown error");
  return data.content?.[0]?.text || "";
}

// ── SUPABASE REST HELPERS ─────────────────────────────────────────
const DB = {
  _h() {
    return {
      "apikey": ANON_KEY,
      "Authorization": `Bearer ${ANON_KEY}`,
      "Content-Type": "application/json"
    };
  },
  async get(table, params = "") {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`,
        { headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` } });
      if (!res.ok) return [];
      return await res.json();
    } catch (_) { return []; }
  },
  async insert(table, data, upsert = false) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: "POST",
        headers: { ...this._h(), ...(upsert ? { "Prefer": "resolution=merge-duplicates" } : {}) },
        body: JSON.stringify(data)
      });
      return res.ok;
    } catch (_) { return false; }
  },
  async update(table, filter, data) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
        method: "PATCH", headers: this._h(), body: JSON.stringify(data)
      });
      return res.ok;
    } catch (_) { return false; }
  },
  async delete(table, filter) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`,
        { method: "DELETE", headers: this._h() });
      return res.ok;
    } catch (_) { return false; }
  }
};
