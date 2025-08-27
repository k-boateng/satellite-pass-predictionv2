export default function ClockHUD({ utc }) {
  const style = {
    position: "absolute",
    bottom: 12,
    right: 12,
    color: "#000",           
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: 14,
    letterSpacing: 0.5,
    pointerEvents: "none",   
    userSelect: "none",
  };

  const fmt = (d) => {
    if (!d) return "—";
    const pad = (n) => String(n).padStart(2, "0");
    const day = pad(d.getUTCDate());
    const month = pad(d.getUTCMonth() + 1);
    const year = d.getUTCFullYear();
    const h = pad(d.getUTCHours());
    const m = pad(d.getUTCMinutes());
    const s = pad(d.getUTCSeconds());
    return `${day}-${month}-${year} ${h}:${m}:${s} UTC`;
  };

  return <div style={style}>{fmt(utc)}</div>;
}
