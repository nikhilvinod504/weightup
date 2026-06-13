import { P, T, A } from '../utils/constants.js'
import { ALL_BADGES } from '../utils/constants.js'
import { getLevel, nextLevel } from '../utils/helpers.js'
import { XPBar } from './UI.jsx'

export default function BadgesTab({ user, logs, goal, streak, badges, xp, showToast }) {
  const lv    = getLevel(xp)
  const nl    = nextLevel(xp)
  const first  = logs.length ? logs[0].w : null
  const latest = logs.length ? logs[logs.length - 1].w : null
  const lost   = first && latest ? +(first - latest).toFixed(1) : 0

  const share = () => {
    const text = `🏋️ WeightUp: ${user.name} — ${lost > 0 ? lost + "kg lost" : "just started"} · ${streak} day streak · ${badges.length} badges · ${lv.name} level`
    navigator.clipboard?.writeText(text).catch(() => {})
    showToast("Progress copied to clipboard 📤")
  }

  return (
    <div>
      {/* Level card */}
      <div style={{ background: "#fff", borderRadius: 20, padding: "1.5rem", marginBottom: 10, border: "0.5px solid #f0f0f0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 52 }}>{lv.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: lv.color, marginBottom: 6 }}>{lv.name}</div>
            <XPBar xp={xp} />
          </div>
        </div>
        {nl && (
          <p style={{ fontSize: 12, color: "#bbb" }}>
            {nl.min - xp} XP to reach {nl.name} {nl.icon}
          </p>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 14 }}>
          {[
            { label: "XP earned", val: xp, color: lv.color },
            { label: "Badges",    val: `${badges.length}/${ALL_BADGES.length}`, color: P[400] },
            { label: "Streak",    val: `${streak} 🔥`, color: A[400] },
          ].map(s => (
            <div key={s.label} style={{ background: "#fafafa", borderRadius: 12, padding: "0.75rem", textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Badge grid */}
      <div style={{ background: "#fff", borderRadius: 20, padding: "1.25rem 1.5rem", marginBottom: 10, border: "0.5px solid #f0f0f0" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: P[800], marginBottom: 14 }}>
          Achievements ({badges.length}/{ALL_BADGES.length})
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {ALL_BADGES.map(b => {
            const earned = badges.some(e => e.id === b.id)
            return (
              <div key={b.id} style={{
                padding: "1rem", borderRadius: 14,
                border: `1.5px solid ${earned ? P[200] : "#f0f0f0"}`,
                background: earned ? P[50] : "#fafafa",
                opacity: earned ? 1 : 0.42,
                transition: "opacity 0.3s",
              }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>{b.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: earned ? P[800] : "#aaa" }}>{b.name}</div>
                <div style={{ fontSize: 11, color: earned ? P[400] : "#ccc", lineHeight: 1.4, marginTop: 3 }}>{b.desc}</div>
                {earned && <div style={{ fontSize: 10, color: T[400], marginTop: 6, fontWeight: 600 }}>✓ Earned</div>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Share card */}
      <div style={{
        background: `linear-gradient(135deg, ${P[400]} 0%, ${T[400]} 100%)`,
        borderRadius: 20, padding: "1.5rem", color: "#fff",
      }}>
        <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Your progress card</div>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 3 }}>{user.name}</div>
        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 3 }}>
          {lost > 0 ? `${lost}kg lost` : "Just starting out"}
        </div>
        <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 16 }}>
          {streak} day streak · {badges.length} badges · {lv.name} level
        </div>
        <button onClick={share} style={{
          background: "rgba(255,255,255,0.2)", color: "#fff",
          border: "1.5px solid rgba(255,255,255,0.45)",
          borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>
          Share milestone 📤
        </button>
      </div>
    </div>
  )
}
