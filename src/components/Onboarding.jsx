import { useState } from 'react'
import { P, T } from '../utils/constants.js'
import { today } from '../utils/helpers.js'
import * as api from '../utils/api.js'
import { Btn, inputStyle } from './UI.jsx'

const STEPS = [
  { label:"Starting weight (kg)", field:"startWeight", placeholder:"85.0", type:"number", hint:"Your Day 1 baseline — stored privately and securely." },
  { label:"Goal weight (kg)",     field:"goal",        placeholder:"75.0", type:"number", hint:"We'll forecast when you'll reach it based on your real trend." },
]

export default function Onboarding({ user, onDone }) {
  const [step,    setStep]    = useState(0)
  const [data,    setData]    = useState({ startWeight:"", goal:"" })
  const [loading, setLoading] = useState(false)

  const f = (k, v) => setData(p => ({ ...p, [k]: v }))
  const s = STEPS[step]

  const finish = async () => {
    setLoading(true)
    try {
      const sw = parseFloat(data.startWeight)
      const g  = parseFloat(data.goal) || null
      await Promise.all([
        sw ? api.addLog({ d: today(), w: sw, note: "Starting weight" }) : Promise.resolve(),
        g  ? api.saveGoal(g) : Promise.resolve(),
      ])
      onDone()
    } catch (e) {
      console.error(e)
      onDone() // proceed anyway
    } finally { setLoading(false) }
  }

  const next = () => step < STEPS.length - 1 ? setStep(i => i + 1) : finish()

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:`linear-gradient(145deg,${P[50]},${T[50]})`, padding:"1.5rem" }}>
      <div style={{ background:"#fff", borderRadius:24, padding:"2.25rem 2rem", width:"100%", maxWidth:380, boxShadow:"0 8px 40px rgba(83,74,183,0.12)" }}>
        <div style={{ textAlign:"center", marginBottom:"1.75rem" }}>
          <div style={{ fontSize:40, marginBottom:8 }}>👋</div>
          <h2 style={{ fontSize:20, fontWeight:700, color:P[800], margin:0 }}>Welcome, {user.name.split(" ")[0]}!</h2>
          <p style={{ fontSize:13, color:"#aaa", margin:"6px 0 0" }}>Quick setup — 30 seconds</p>
        </div>

        <div style={{ display:"flex", gap:6, marginBottom:"1.75rem", justifyContent:"center" }}>
          {STEPS.map((_,i)=>(
            <div key={i} style={{ width:i===step?24:8, height:8, borderRadius:4, background:i<=step?P[400]:"#e8e8e8", transition:"all 0.3s" }}/>
          ))}
        </div>

        <label style={{ fontSize:13, color:"#888", display:"block", marginBottom:4, fontWeight:500 }}>{s.label}</label>
        <p style={{ fontSize:12, color:T[400], marginBottom:10 }}>{s.hint}</p>
        <input type={s.type} placeholder={s.placeholder} value={data[s.field]}
          onChange={e=>f(s.field,e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&next()}
          style={{ ...inputStyle, fontSize:22, fontWeight:600, color:P[800], marginBottom:"1.5rem", padding:"14px" }}
          autoFocus/>

        <div style={{ display:"flex", gap:8 }}>
          {step>0&&<button onClick={()=>setStep(i=>i-1)} style={{ flex:1, padding:"11px", borderRadius:12, border:"1.5px solid #e8e8e8", background:"#fff", fontSize:14, fontWeight:500, cursor:"pointer", color:"#666" }}>← Back</button>}
          <div style={{ flex:step>0?2:1 }}>
            <Btn onClick={next} disabled={loading}>
              {step<STEPS.length-1?"Continue →":loading?"Setting up…":"Let's go! 🚀"}
            </Btn>
          </div>
        </div>
        {step===STEPS.length-1&&<p onClick={finish} style={{ fontSize:12, color:"#ccc", textAlign:"center", marginTop:12, cursor:"pointer" }}>Skip for now</p>}
      </div>
    </div>
  )
}
