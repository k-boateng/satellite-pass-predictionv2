export const BASE = "http://127.0.0.1:8000";

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