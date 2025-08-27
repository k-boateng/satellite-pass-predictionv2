export default function SummaryCard({ data, loading, error, onClose }) {
  const box = {
    position: "absolute",
    top: 12,
    right: 12,
    width: 260,
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.12)",
    borderRadius: 10,
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
    padding: "12px 12px 10px 12px",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
    fontSize: 13,
    color: "#111",
    zIndex: 20,
  };

  const close = {
    position: "absolute",
    top: 6,
    right: 8,
    border: "none",
    background: "transparent",
    fontSize: 16,
    lineHeight: 1,
    cursor: "pointer",
    color: "#555",
  };

  const h1 = { margin: "0 18px 8px 0", fontWeight: 700, fontSize: 14 };
  const row = { display: "flex", justifyContent: "space-between", margin: "6px 0" };
  const k = { opacity: 0.65, marginRight: 8 };
  const v = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" };

  const fmtNum = (x, d = 2) => (x == null ? "—" : Number(x).toFixed(d));
  const fmtUTC = (isoOrDate) => {
    if (!isoOrDate) return "—";
    const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getUTCDate())}-${pad(d.getUTCMonth() + 1)}-${d.getUTCFullYear()} ${pad(
      d.getUTCHours()
    )}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
  };

  return (
    <div style={box}>
      <button aria-label="Close" onClick={onClose} style={close}>
        ×
      </button>

      <div style={h1}>{loading ? "Loading…" : error ? "Satellite" : data?.name || "Satellite"}</div>

      {loading && <div>Fetching details…</div>}

      {error && (
        <div style={{ color: "#b00020" }}>
          {String(error?.message || error) || "Failed to load summary."}
        </div>
      )}

      {!loading && !error && data && (
        <div>
          <div style={row}>
            <div style={k}>NORAD</div>
            <div style={v}>{data.norad_id}</div>
          </div>
          <div style={row}>
            <div style={k}>Velocity</div>
            <div style={v}>{fmtNum(data.velocity_kms, 2)} km/s</div>
          </div>
          <div style={row}>
            <div style={k}>Altitude</div>
            <div style={v}>{fmtNum(data.altitude_km, 1)} km</div>
          </div>
          <div style={row}>
            <div style={k}>Period</div>
            <div style={v}>{fmtNum(data.period_minutes, 1)} min</div>
          </div>
          <div style={{ ...row, marginTop: 8 }}>
            <div style={k}>TLE epoch</div>
            <div style={v}>{fmtUTC(data.epoch_utc)}</div>
          </div>
        </div>
      )}
    </div>
  );
}