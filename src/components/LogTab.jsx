import { useState } from 'react'
import { P, T, C } from '../utils/constants.js'
import { Btn, inputStyle } from './UI.jsx'

export default function LogTab({ logs, goal, onLog, onSaveGoal }) {
  const [wInput,    setWInput]    = useState("")
  const [noteInput, setNoteInput] = useState("")
  const [goalInput, setGoalInput] = useState(goal ?? "")

  const handleLog = () => {
    const w = parseFloat(wInput)
    if (!w || w < 20 || w > 500) return
    onLog(w, noteInput)
    setWInput(""); setNoteInput("")
  }

  const handleSaveGoal = () => {
    const g = parseFloat(goalInput)
    if (!g) return
    onSaveGoal(g)
  }

  return (
    <div>
      {/* Log entry */}
      <div style={{ background: "#fff", borderRadius: 20, padding: "1.5rem", marginBottom: 10, border: "0.5px solid #f0f0f0" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: P[800], marginBottom: 14 }}>Log your weight</div>
        <input
          type="number" step="0.1" placeholder="e.g. 83.5" value={wInput}
          onChange={e => setWInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleLog()}
          style={{ ...inputStyle, fontSize: 28, fontWeight: 700, color: P[800], marginBottom: 10, padding: "14px", textAlign: "center" }}
        />
        <input
          type="text" placeholder="Add a note — optional" value={noteInput}
          onChange={e => setNoteInput(e.target.value)}
          style={{ ...inputStyle, marginBottom: 14 }}
        />
        <Btn onClick={handleLog}>Log weight 💪</Btn>
      </div>

      {/* Goal */}
      <div style={{ background: "#fff", borderRadius: 20, padding: "1.25rem 1.5rem", marginBottom: 10, border: "0.5px solid #f0f0f0" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: P[800], marginBottom: 10 }}>🎯 Target weight</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="number" placeholder="Goal kg" value={goalInput}
            onChange={e => setGoalInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSaveGoal()}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={handleSaveGoal} style={{
            padding: "11px 20px", borderRadius: 12, border: "none",
            background: T[400], color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
          }}>
            Save
          </button>
        </div>
        {goal && <p style={{ fontSize: 12, color: T[400], marginTop: 8 }}>Current goal: {goal} kg</p>}
      </div>

      {/* History */}
      <div style={{ background: "#fff", borderRadius: 20, padding: "1.25rem 1.5rem", border: "0.5px solid #f0f0f0" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: P[800], marginBottom: 12 }}>Recent logs</div>
        {[...logs].reverse().slice(0, 20).map((l, i, arr) => {
          const prev = arr[i + 1]
          const diff = prev ? +(prev.w - l.w).toFixed(1) : 0
          return (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "0.5px solid #f8f8f8" }}>
              <div>
                <span style={{ fontSize: 18, fontWeight: 600, color: P[800] }}>{l.w}</span>
                <span style={{ fontSize: 13, color: "#aaa" }}> kg</span>
                {diff !== 0 && (
                  <span style={{ fontSize: 12, color: diff > 0 ? T[400] : C[400], marginLeft: 8 }}>
                    {diff > 0 ? `▼ ${diff}` : `▲ ${Math.abs(diff)}`}
                  </span>
                )}
                {l.note && <div style={{ fontSize: 11, color: "#bbb", marginTop: 2 }}>{l.note}</div>}
              </div>
              <div style={{ fontSize: 11, color: "#ccc" }}>{l.d}</div>
            </div>
          )
        })}
        {!logs.length && (
          <div style={{ textAlign: "center", color: "#bbb", fontSize: 13, padding: "2rem 0" }}>
            No logs yet — enter your weight above to start!
          </div>
        )}
      </div>
    </div>
  )
}
