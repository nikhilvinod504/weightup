import { P, T, A, C } from '../utils/constants.js'
import { predictGoalDate } from '../utils/helpers.js'
import { Sparkline } from './UI.jsx'

export default function ChartTab({ user, logs, goal, streak }) {
  const first   = logs.length ? logs[0].w : null
  const latest  = logs.length ? logs[logs.length - 1].w : null
  const lost    = first && latest ? +(first - latest).toFixed(1) : 0
  const pred    = predictGoalDate(logs, goal)

  const bmi = user.height && latest
    ? +(latest / ((user.height / 100) ** 2)).toFixed(1)
    : null
  const bmiCat = !bmi ? null : bmi < 18.5 ? "Underweight" : bmi < 25 ? "Healthy weight" : bmi < 30 ? "Overweight" : "Obese"
  const bmiCol = !bmi ? "#aaa" : bmi < 18.5 ? A[400] : bmi < 25 ? T[400] : bmi < 30 ? A[400] : C[400]

  return (
    <div>
      {/* Main chart */}
      <div style={{ background: "#fff", borderRadius: 20, padding: "1.5rem", marginBottom: 10, border: "0.5px solid #f0f0f0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: P[800] }}>Weight trend</div>
          <div style={{ display: "flex", gap: 12, fontSize: 10 }}>
            <span style={{ color: P[400] }}>— you</span>
            <span style={{ color: T[400] }}>-- 7d avg</span>
            {goal && <span style={{ color: C[400] }}>— goal</span>}
          </div>
        </div>
        <Sparkline logs={logs} goal={goal} />
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        {[
          { label: "Total lost",      val: `${lost > 0 ? lost : 0} kg`,        color: T[400] },
          { label: "Goal weight",     val: goal ? `${goal} kg` : "Not set",    color: C[400] },
          { label: "Days logged",     val: `${logs.length}`,                   color: P[400] },
          { label: "Current streak",  val: `${streak} 🔥`,                     color: A[400] },
          { label: "Starting weight", val: first ? `${first} kg` : "—",        color: "#aaa" },
          { label: "Predicted date",  val: pred ?? "Log more days",            color: T[600] },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 14, padding: "0.875rem 1rem", border: "0.5px solid #f0f0f0" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* BMI */}
      {bmi && (
        <div style={{ background: "#fff", borderRadius: 20, padding: "1.5rem", border: "0.5px solid #f0f0f0" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: P[800], marginBottom: 12 }}>Body Mass Index</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 42, fontWeight: 700, color: bmiCol }}>{bmi}</span>
            <span style={{ fontSize: 16, color: bmiCol, fontWeight: 500 }}>{bmiCat}</span>
          </div>
          <p style={{ fontSize: 11, color: "#bbb", marginBottom: 14 }}>Based on {latest}kg / {user.height}cm</p>

          {/* BMI scale */}
          <div style={{ position: "relative", height: 12, borderRadius: 8, background: "linear-gradient(90deg,#9FE1CB 0%,#9FE1CB 32%,#FAC775 52%,#F5C4B3 72%,#F09595 100%)", marginBottom: 8 }}>
            <div style={{
              position: "absolute",
              left: `${Math.min(95, Math.max(2, (bmi - 14) / 26 * 100))}%`,
              top: -4, transform: "translateX(-50%)",
              width: 18, height: 18, borderRadius: "50%",
              background: bmiCol, border: "3px solid #fff",
              boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#bbb" }}>
            <span>Under</span><span>Healthy</span><span>Over</span><span>Obese</span>
          </div>
        </div>
      )}

      {!user.height && (
        <div style={{ background: "#fafafa", borderRadius: 14, padding: "1rem", textAlign: "center", border: "0.5px solid #f0f0f0" }}>
          <p style={{ fontSize: 13, color: "#bbb" }}>Add your height in your profile to see BMI</p>
        </div>
      )}
    </div>
  )
}
