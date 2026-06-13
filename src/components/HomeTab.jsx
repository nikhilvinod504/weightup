import { P, T, A, C } from '../utils/constants.js'
import { aiInsight, predictGoalDate } from '../utils/helpers.js'
import { today } from '../utils/helpers.js'

export default function HomeTab({ user, logs, goal, streak, badges, xp, level, groups, activeChallenge, onCompleteChallenge, onGoToLog, onGoToGroup, setActiveGroup }) {
  const latest  = logs.length ? logs[logs.length - 1].w : null
  const first   = logs.length ? logs[0].w : null
  const lost    = first && latest ? +(first - latest).toFixed(1) : 0
  const goalPct = goal && first ? Math.min(100, Math.round((lost / (first - goal)) * 100)) : 0
  const pred    = predictGoalDate(logs, goal)
  const insight = aiInsight(logs)

  return (
    <div>
      {/* Today's weight hero card */}
      <div style={{ background: "#fff", borderRadius: 20, padding: "1.5rem", marginBottom: 10, border: "0.5px solid #f0f0f0", boxShadow: "0 2px 12px rgba(83,74,183,0.05)" }}>
        <div style={{ fontSize: 11, color: "#bbb", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
          {today()}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 48, fontWeight: 700, color: P[800], lineHeight: 1 }}>{latest ?? "—"}</span>
          <span style={{ fontSize: 16, color: "#aaa" }}>kg</span>
          {lost !== 0 && (
            <span style={{ fontSize: 13, color: lost > 0 ? T[400] : C[400], marginLeft: 4 }}>
              {lost > 0 ? `▼ ${lost}kg` : `▲ ${Math.abs(lost)}kg`} from start
            </span>
          )}
        </div>

        {goal && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#bbb", marginBottom: 5 }}>
              <span>Goal progress</span>
              <span style={{ color: P[400], fontWeight: 600 }}>{goalPct}%</span>
            </div>
            <div style={{ height: 8, background: "#f0f0f0", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ width: `${goalPct}%`, height: "100%", background: `linear-gradient(90deg,${P[400]},${T[400]})`, borderRadius: 8, transition: "width 0.8s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#ccc", marginTop: 4 }}>
              <span>Start {first}kg</span>
              <span>Goal {goal}kg</span>
            </div>
          </>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 10 }}>
        {[
          { label: "Streak", val: `${streak} 🔥`, color: A[400] },
          { label: "Badges", val: `${badges.length} 🏅`, color: P[400] },
          { label: "Level",  val: level.name,      color: level.color },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 14, padding: "0.875rem", textAlign: "center", border: "0.5px solid #f0f0f0" }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* AI insight */}
      {insight && (
        <div style={{ background: P[50], borderRadius: 14, padding: "0.875rem 1rem", marginBottom: 10, border: `1px solid ${P[100]}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: P[800], marginBottom: 3 }}>AI Insight</div>
          <div style={{ fontSize: 13, color: P[600], lineHeight: 1.55 }}>{insight}</div>
        </div>
      )}

      {/* Predicted goal date */}
      {pred && (
        <div style={{ background: T[50], borderRadius: 14, padding: "0.875rem 1rem", marginBottom: 10, border: `1px solid ${T[100]}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T[600], marginBottom: 3 }}>📅 Predicted goal date</div>
          <div style={{ fontSize: 17, color: T[600], fontWeight: 700 }}>{pred}</div>
          <div style={{ fontSize: 10, color: T[400], marginTop: 2 }}>Based on your last 14 days of data</div>
        </div>
      )}

      {/* Active challenge */}
      {activeChallenge && (
        <div style={{ background: A[50], borderRadius: 14, padding: "0.875rem 1rem", marginBottom: 10, border: `1px solid ${A[100]}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, color: A[400], fontWeight: 600 }}>Active challenge</div>
              <div style={{ fontSize: 14, color: A[600], marginTop: 3 }}>{activeChallenge.icon} {activeChallenge.name}</div>
              <div style={{ fontSize: 11, color: A[400], marginTop: 2 }}>+{activeChallenge.xp} XP on completion</div>
            </div>
            <button onClick={() => onCompleteChallenge(activeChallenge)} style={{
              background: A[400], color: "#fff", border: "none", borderRadius: 10,
              padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>
              Mark done ✓
            </button>
          </div>
        </div>
      )}

      {/* Groups quick-access */}
      {groups.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 14, padding: "0.875rem 1rem", marginBottom: 10, border: "0.5px solid #f0f0f0" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#bbb", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Your Groups</div>
          {groups.map(g => (
            <div key={g.id} onClick={() => { setActiveGroup(g); onGoToGroup() }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", cursor: "pointer", borderBottom: "0.5px solid #f8f8f8" }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: P[50], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👥</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: P[800], fontWeight: 500 }}>{g.name}</div>
                <div style={{ fontSize: 10, color: "#bbb" }}>{g.members.length} member{g.members.length !== 1 ? "s" : ""} · Code: <strong style={{ letterSpacing: 1 }}>{g.code}</strong></div>
              </div>
              <div style={{ fontSize: 16, color: "#ddd" }}>›</div>
            </div>
          ))}
        </div>
      )}

      <button onClick={onGoToLog} style={{
        width: "100%", padding: "14px", borderRadius: 16, border: "none",
        background: P[400], color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer",
        boxShadow: `0 4px 16px ${P[400]}55`,
      }}>
        ⚖️ Log today's weight
      </button>
    </div>
  )
}
