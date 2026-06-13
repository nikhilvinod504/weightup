import { P, T, A, C } from '../utils/constants.js'
import { movingAvg, getLevel, nextLevel, initials } from '../utils/helpers.js'

// ── Avatar ─────────────────────────────────────────────────────────────────
export function Avatar({ name, size = 36, bg = P[50], fg = P[400] }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: bg, display: "flex", alignItems: "center",
      justifyContent: "center", fontSize: size * 0.34,
      fontWeight: 600, color: fg, flexShrink: 0,
      userSelect: "none",
    }}>
      {initials(name)}
    </div>
  )
}

// ── XPBar ──────────────────────────────────────────────────────────────────
export function XPBar({ xp }) {
  const lv  = getLevel(xp)
  const nl  = nextLevel(xp)
  const pct = nl ? Math.round(((xp - lv.min) / (nl.min - lv.min)) * 100) : 100
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: lv.color, minWidth: 70 }}>
        {lv.icon} {lv.name}
      </span>
      <div style={{ flex: 1, height: 5, background: "#e8e8e8", borderRadius: 5, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: lv.color, borderRadius: 5, transition: "width 0.6s" }} />
      </div>
      <span style={{ fontSize: 10, color: "#aaa", minWidth: 60, textAlign: "right" }}>
        {xp}{nl ? `/${nl.min}` : ""} XP
      </span>
    </div>
  )
}

// ── Toast ──────────────────────────────────────────────────────────────────
export function Toast({ msg, type }) {
  const bg = type === "error" ? C[400] : type === "info" ? T[400] : P[600]
  return (
    <div style={{
      position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
      background: bg, color: "#fff", padding: "10px 20px", borderRadius: 24,
      fontSize: 13, fontWeight: 500, zIndex: 10000, whiteSpace: "nowrap",
      boxShadow: "0 4px 20px rgba(0,0,0,0.18)", maxWidth: "90vw",
      textAlign: "center", pointerEvents: "none",
    }}>
      {msg}
    </div>
  )
}

// ── Confetti ───────────────────────────────────────────────────────────────
export function Confetti({ show }) {
  if (!show) return null
  const pieces = Array.from({ length: 28 }, (_, i) => ({
    left: `${Math.random() * 100}%`,
    color: [P[400], T[400], A[400], C[400], "#D4537E"][i % 5],
    delay: `${(Math.random() * 0.5).toFixed(2)}s`,
    size: Math.random() * 9 + 4,
  }))
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999 }}>
      {pieces.map((p, i) => (
        <div key={i} style={{
          position: "absolute", top: -12, left: p.left,
          width: p.size, height: p.size, background: p.color,
          borderRadius: 2, animation: `cffall 2.4s ${p.delay} ease-in forwards`,
        }} />
      ))}
      <style>{`
        @keyframes cffall {
          0%   { transform: translateY(0) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

// ── Modal (bottom-sheet style) ─────────────────────────────────────────────
export function Modal({ title, onClose, children }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.38)", zIndex: 500, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "1.5rem 1.25rem 2rem", width: "100%", maxWidth: 480, boxShadow: "0 -4px 24px rgba(0,0,0,0.12)" }}>
        <div style={{ width: 36, height: 4, background: "#e0e0e0", borderRadius: 4, margin: "0 auto 1.25rem" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: P[800] }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#bbb", lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Sparkline chart ────────────────────────────────────────────────────────
export function Sparkline({ logs, goal, h = 140 }) {
  if (logs.length < 2) {
    return (
      <div style={{ height: h, display: "flex", alignItems: "center", justifyContent: "center", color: "#ccc", fontSize: 13 }}>
        Log at least 2 days to see your chart
      </div>
    )
  }
  const W    = 320
  const vals = logs.map(l => l.w)
  const mn   = Math.min(...vals, goal || 999) - 1
  const mx   = Math.max(...vals) + 1
  const px   = (v, i) => [8 + (i / (vals.length - 1)) * (W - 16), h - 8 - ((v - mn) / (mx - mn)) * (h - 24)]
  const pts  = vals.map((v, i) => px(v, i))
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ")
  const area = `${path} L${pts[pts.length - 1][0]},${h} L${pts[0][0]},${h} Z`
  const avg  = movingAvg(logs)
  const ap   = avg.map((a, i) => px(a.avg, i))
  const avgP = ap.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ")
  const gY   = goal ? h - 8 - ((goal - mn) / (mx - mn)) * (h - 24) : null
  const last = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${W} ${h}`} style={{ width: "100%", height: h }}>
      <defs>
        <linearGradient id="gfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={P[400]} stopOpacity="0.18" />
          <stop offset="100%" stopColor={P[400]} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#gfill)" />
      <path d={path} fill="none" stroke={P[400]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={avgP} fill="none" stroke={T[400]} strokeWidth="1.5" strokeDasharray="4,3" strokeLinecap="round" />
      {gY && <line x1={8} y1={gY} x2={W - 8} y2={gY} stroke={C[400]} strokeWidth="1.5" strokeDasharray="5,4" />}
      {gY && <text x={W - 10} y={gY - 5} fontSize="9" fill={C[400]} textAnchor="end">Goal</text>}
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#fff" stroke={P[400]} strokeWidth="1.5" />)}
      <text x={last[0]} y={last[1] - 8} fontSize="11" fill={P[600]} textAnchor="middle" fontWeight="600">
        {vals[vals.length - 1]}
      </text>
    </svg>
  )
}

// ── Input ──────────────────────────────────────────────────────────────────
export const inputStyle = {
  width: "100%", padding: "11px 14px", borderRadius: 12,
  border: "1.5px solid #e8e8e8", fontSize: 15, outline: "none",
  boxSizing: "border-box", background: "#fafafa", color: "#222",
  transition: "border-color 0.15s",
}

// ── Btn ────────────────────────────────────────────────────────────────────
export function Btn({ children, onClick, color = P[400], outline = false, style: s = {}, disabled = false }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "11px 20px", borderRadius: 12, border: outline ? `1.5px solid ${color}` : "none",
      background: outline ? "transparent" : color, color: outline ? color : "#fff",
      fontSize: 14, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.65 : 1, width: "100%", transition: "opacity 0.15s",
      ...s,
    }}>
      {children}
    </button>
  )
}
