// Use Vercel env in prod; fall back to localhost in dev; allow same-origin if a Vercel rewrite is done.
const envBase = (import.meta.env?.VITE_API_BASE ?? "").trim();
const isLocal =
  typeof window !== "undefined" &&
  /^(localhost|127\.0\.0\.1)/.test(window.location.hostname);

export const BASE = (envBase || (isLocal ? "http://127.0.0.1:8000" : "")).replace(/\/$/, "");

export async function fetchIds(limit = 800) {
  try {
    const r = await fetch(`${BASE}/api/debug/sat-ids?limit=${limit}`);
    if (r.ok) return await r.json();
  } catch {
    // ignore/fall through
  }
  return [25544]; // fallback
}

export async function fetchGeoJSON(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`GeoJSON load error: ${r.status}`);
  return r.json();
}

export async function fetchSummary(noradId, { signal } = {}) {
  const r = await fetch(`${BASE}/api/satellites/${noradId}/summary`, { signal });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

