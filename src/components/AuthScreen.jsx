import { useState } from 'react'
import { P, T, C } from '../utils/constants.js'
import { signup, login } from '../utils/api.js'
import { Btn, inputStyle } from './UI.jsx'

const labelStyle = { fontSize:12, color:"#888", display:"block", marginBottom:5, fontWeight:500 }
const wrapStyle  = { marginBottom:14 }

export default function AuthScreen({ onLogin }) {
  const [mode,    setMode]    = useState("login")
  const [name,    setName]    = useState("")
  const [height,  setHeight]  = useState("")
  const [username,setUsername]= useState("")
  const [password,setPassword]= useState("")
  const [err,     setErr]     = useState("")
  const [loading, setLoading] = useState(false)

  const handleSignup = async () => {
    if (!username.trim() || !password || !name.trim()) { setErr("Please fill in all fields"); return }
    if (password.length < 4) { setErr("Password must be at least 4 characters"); return }
    if (!/^[a-z0-9_]+$/i.test(username)) { setErr("Username: letters, numbers, underscores only"); return }
    setLoading(true); setErr("")
    try {
      const user = await signup({ username, password, name: name.trim(), height: parseFloat(height) || 0 })
      onLogin(user, true)
    } catch (e) {
      setErr(e.message || "Signup failed")
    } finally { setLoading(false) }
  }

  const handleLogin = async () => {
    if (!username.trim() || !password) { setErr("Enter your username and password"); return }
    setLoading(true); setErr("")
    try {
      const user = await login({ username, password })
      onLogin(user, false)
    } catch (e) {
      setErr(e.message || "Login failed")
    } finally { setLoading(false) }
  }

  const submit = () => mode === "login" ? handleLogin() : handleSignup()
  const switchMode = (m) => { setMode(m); setErr("") }

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:`linear-gradient(145deg,${P[50]} 0%,${T[50]} 100%)`, padding:"1.5rem" }}>
      <div style={{ background:"#fff", borderRadius:24, padding:"2.25rem 2rem", width:"100%", maxWidth:380, boxShadow:"0 8px 40px rgba(83,74,183,0.12)" }}>

        <div style={{ textAlign:"center", marginBottom:"2rem" }}>
          <div style={{ fontSize:52, marginBottom:8 }}>⚖️</div>
          <h1 style={{ fontSize:26, fontWeight:700, color:P[800], margin:0 }}>WeightUp</h1>
          <p style={{ fontSize:13, color:"#aaa", margin:"4px 0 0" }}>Gamified weight tracking for you &amp; your crew</p>
        </div>

        <div style={{ display:"flex", background:"#f3f3f3", borderRadius:12, padding:3, marginBottom:"1.5rem" }}>
          {["login","signup"].map(m=>(
            <button key={m} onClick={()=>switchMode(m)} style={{
              flex:1, padding:"8px", borderRadius:10, border:"none", cursor:"pointer",
              fontSize:13, fontWeight:600,
              background:mode===m?"#fff":"transparent",
              color:mode===m?P[600]:"#999",
              boxShadow:mode===m?"0 1px 6px rgba(0,0,0,0.09)":"none", transition:"all 0.2s"
            }}>
              {m==="login"?"Sign in":"Create account"}
            </button>
          ))}
        </div>

        {mode==="signup" && (
          <>
            <div style={wrapStyle}>
              <label style={labelStyle}>Full name</label>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Nikhil Vinod" style={inputStyle}/>
            </div>
            <div style={wrapStyle}>
              <label style={labelStyle}>Height (cm) <span style={{color:"#ccc",fontWeight:400}}>— optional</span></label>
              <input type="number" value={height} onChange={e=>setHeight(e.target.value)} placeholder="180" style={inputStyle}/>
            </div>
          </>
        )}

        <div style={wrapStyle}>
          <label style={labelStyle}>Username</label>
          <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="nikhil123" autoComplete="username" style={inputStyle}/>
        </div>

        <div style={wrapStyle}>
          <label style={labelStyle}>Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••"
            autoComplete={mode==="login"?"current-password":"new-password"}
            onKeyDown={e=>e.key==="Enter"&&submit()} style={inputStyle}/>
        </div>

        {err && <div style={{ fontSize:12, color:C[400], marginBottom:12, textAlign:"center", fontWeight:500 }}>{err}</div>}

        <Btn onClick={submit} disabled={loading}>
          {loading?"Please wait…":mode==="login"?"Sign in →":"Create account 🚀"}
        </Btn>

        <p style={{ fontSize:12, color:"#bbb", textAlign:"center", marginTop:14, marginBottom:0 }}>
          {mode==="login"?"New here? ":"Already have an account? "}
          <span onClick={()=>switchMode(mode==="login"?"signup":"login")} style={{ color:P[400], cursor:"pointer", fontWeight:600 }}>
            {mode==="login"?"Create account":"Sign in"}
          </span>
        </p>
      </div>
    </div>
  )
}
