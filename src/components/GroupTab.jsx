import { useState, useEffect, useRef } from 'react'
import { P, T, A, C } from '../utils/constants.js'
import { CHALLENGES } from '../utils/constants.js'
import * as api from '../utils/api.js'
import { Avatar, Modal, Btn, inputStyle } from './UI.jsx'

function CreateGroupModal({ onCreated, onClose }) {
  const [name, setName] = useState("")
  const [err,  setErr]  = useState("")
  const [busy, setBusy] = useState(false)

  const create = async () => {
    if (!name.trim()) { setErr("Please enter a group name"); return }
    setBusy(true)
    try {
      const gr = await api.createGroup(name.trim())
      onCreated(gr)
    } catch (e) { setErr(e.message || "Failed to create group") }
    finally { setBusy(false) }
  }

  return (
    <Modal title="Create a group" onClose={onClose}>
      <label style={{ fontSize:12, color:"#888", display:"block", marginBottom:5, fontWeight:500 }}>Group name</label>
      <input value={name} onChange={e=>setName(e.target.value)} placeholder="Office Fitness Squad"
        onKeyDown={e=>e.key==="Enter"&&create()} style={{ ...inputStyle, marginBottom:10 }} autoFocus/>
      <p style={{ fontSize:12, color:"#bbb", marginBottom:14, lineHeight:1.5 }}>
        A random invite code will be generated automatically. Share it with anyone you want to add.
      </p>
      {err&&<p style={{ fontSize:12, color:C[400], marginBottom:10 }}>{err}</p>}
      <Btn onClick={create} disabled={busy}>{busy?"Creating…":"Create group 🚀"}</Btn>
    </Modal>
  )
}

function JoinGroupModal({ onJoined, onClose }) {
  const [code, setCode] = useState("")
  const [err,  setErr]  = useState("")
  const [busy, setBusy] = useState(false)

  const join = async () => {
    if (!code.trim()) { setErr("Enter an invite code"); return }
    setBusy(true)
    try {
      const gr = await api.joinGroup(code.trim().toUpperCase())
      onJoined(gr)
    } catch (e) { setErr(e.message || "Failed to join group") }
    finally { setBusy(false) }
  }

  return (
    <Modal title="Join a group" onClose={onClose}>
      <label style={{ fontSize:12, color:"#888", display:"block", marginBottom:5, fontWeight:500 }}>Invite code</label>
      <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="AB12CD"
        maxLength={8} onKeyDown={e=>e.key==="Enter"&&join()}
        style={{ ...inputStyle, fontSize:22, fontWeight:700, letterSpacing:6, textAlign:"center", marginBottom:14 }} autoFocus/>
      {err&&<p style={{ fontSize:12, color:C[400], marginBottom:10, textAlign:"center" }}>{err}</p>}
      <Btn onClick={join} color={T[400]} disabled={busy}>{busy?"Joining…":"Join group →"}</Btn>
    </Modal>
  )
}

function Leaderboard({ group, currentUsername }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.getMemberStats(group.id)
      .then(setEntries)
      .catch(()=>setEntries([]))
      .finally(()=>setLoading(false))
  }, [group.id])

  const medals = ["🥇","🥈","🥉"]
  return (
    <div style={{ background:"#fff", borderRadius:16, padding:"1rem", border:"0.5px solid #f0f0f0" }}>
      <p style={{ fontSize:11, color:"#bbb", marginBottom:12 }}>Ranked by % of goal reached — fair regardless of starting weight</p>
      {loading&&<div style={{ textAlign:"center", color:"#bbb", fontSize:13, padding:"1.5rem 0" }}>Loading board…</div>}
      {!loading && entries.map((m,i)=>(
        <div key={m.username} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:"0.5px solid #f8f8f8" }}>
          <div style={{ width:24, fontSize:18, textAlign:"center" }}>{medals[i]??i+1}</div>
          <Avatar name={m.name} size={36} bg={m.username===currentUsername?P[50]:T[50]} fg={m.username===currentUsername?P[400]:T[400]}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:m.username===currentUsername?700:500, color:m.username===currentUsername?P[800]:"#333" }}>
              {m.name}{m.username===currentUsername?" (you)":""}
            </div>
            <div style={{ fontSize:10, color:"#bbb" }}>{m.levelIcon} {m.level} · {m.lost>0?`${m.lost}kg lost`:"just started"} · {m.streak}🔥</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:18, fontWeight:700, color:T[400] }}>{m.goalPct}%</div>
            <div style={{ fontSize:10, color:"#ccc" }}>of goal</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function Chat({ group, currentUsername, onGroupUpdate }) {
  const [text,   setText]   = useState("")
  const [kudoed, setKudoed] = useState({})
  const [busy,   setBusy]   = useState(false)
  const bottomRef = useRef(null)

  useEffect(()=>{ bottomRef.current?.scrollIntoView({ behavior:"smooth" }) }, [group.messages?.length])

  // Poll for new messages every 4 seconds
  useEffect(()=>{
    const iv = setInterval(async ()=>{
      try {
        const fresh = await api.getGroup(group.id)
        if (fresh.messages?.length !== group.messages?.length) onGroupUpdate(fresh)
      } catch {}
    }, 4000)
    return ()=>clearInterval(iv)
  }, [group.id, group.messages?.length, onGroupUpdate])

  const send = async () => {
    if (!text.trim() || busy) return
    setBusy(true)
    try {
      const upd = await api.sendMessage(group.id, text.trim())
      onGroupUpdate(upd); setText("")
    } catch {} finally { setBusy(false) }
  }

  const giveKudos = async msgId => {
    if (kudoed[msgId]) return
    try {
      const upd = await api.giveKudos(group.id, msgId)
      onGroupUpdate(upd); setKudoed(k=>({...k,[msgId]:true}))
    } catch {}
  }

  const messages = group.messages || []
  return (
    <div style={{ background:"#fff", borderRadius:16, border:"0.5px solid #f0f0f0", overflow:"hidden" }}>
      <div style={{ padding:"1rem", maxHeight:380, overflowY:"auto", display:"flex", flexDirection:"column", gap:14 }}>
        {messages.length===0&&<div style={{ textAlign:"center", color:"#bbb", fontSize:13, padding:"3rem 0" }}>No messages yet — say hi! 👋</div>}
        {messages.map((m,i)=>(
          <div key={m.id??i} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
            <Avatar name={m.user} size={32} bg={m.username===currentUsername?P[50]:T[50]} fg={m.username===currentUsername?P[400]:T[400]}/>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
                <span style={{ fontSize:12, fontWeight:700, color:P[800] }}>{m.user}</span>
                <span style={{ fontSize:10, color:"#ccc" }}>{m.time}</span>
              </div>
              <div style={{ fontSize:14, color:"#444", marginTop:3, lineHeight:1.45 }}>{m.text}</div>
              <button onClick={()=>giveKudos(m.id)} disabled={kudoed[m.id]} style={{ marginTop:4, background:"none", border:"none", cursor:kudoed[m.id]?"default":"pointer", fontSize:12, color:kudoed[m.id]?A[400]:"#ccc", padding:0, fontWeight:kudoed[m.id]?600:400 }}>
                👏 {m.kudos||0}
              </button>
            </div>
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>
      <div style={{ padding:"0.75rem", borderTop:"0.5px solid #f0f0f0", display:"flex", gap:8 }}>
        <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}
          placeholder="Say something to your group…"
          style={{ flex:1, padding:"9px 14px", borderRadius:22, border:"1.5px solid #e8e8e8", fontSize:14, outline:"none" }}/>
        <button onClick={send} disabled={busy} style={{ background:P[400], color:"#fff", border:"none", borderRadius:22, padding:"9px 18px", cursor:"pointer", fontSize:14, fontWeight:600, opacity:busy?0.7:1 }}>Send</button>
      </div>
    </div>
  )
}

function ChallengesPanel({ activeChallenge, completedChallenges, onStart }) {
  return (
    <div style={{ background:"#fff", borderRadius:16, padding:"1rem", border:"0.5px solid #f0f0f0" }}>
      {CHALLENGES.map(c=>(
        <div key={c.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:"0.5px solid #f8f8f8" }}>
          <span style={{ fontSize:22 }}>{c.icon}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:500, color:"#333", textDecoration:completedChallenges.includes(c.id)?"line-through":"none" }}>{c.name}</div>
            <div style={{ fontSize:11, color:A[400], fontWeight:600 }}>+{c.xp} XP</div>
          </div>
          {completedChallenges.includes(c.id)
            ?<span style={{ fontSize:12, color:T[400], fontWeight:700 }}>✓ Done</span>
            :activeChallenge?.id===c.id
              ?<span style={{ fontSize:12, color:A[400], fontWeight:700 }}>Active</span>
              :<button onClick={()=>onStart(c)} style={{ background:P[50], color:P[600], border:"none", borderRadius:10, padding:"7px 14px", fontSize:12, fontWeight:600, cursor:"pointer" }}>Start</button>
          }
        </div>
      ))}
    </div>
  )
}

export default function GroupTab({ user, groups, activeGroup, setActiveGroup, setGroups, showToast, boom, activeChallenge, completedChallenges, onStartChallenge }) {
  const [subTab,     setSubTab]     = useState("chat")
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin,   setShowJoin]   = useState(false)

  const handleCreated = gr => { setGroups(g=>[...g,gr]); setActiveGroup(gr); setShowCreate(false); boom(); showToast(`Group "${gr.name}" created! Code: ${gr.code}`) }
  const handleJoined  = gr => { setGroups(g=>[...g,gr]); setActiveGroup(gr); setShowJoin(false);   boom(); showToast(`Joined "${gr.name}"! 🎉`) }
  const handleGroupUpdate = upd => { setActiveGroup(upd); setGroups(gs=>gs.map(g=>g.id===upd.id?upd:g)) }

  const copyCode = () => {
    if (!activeGroup) return
    navigator.clipboard?.writeText(activeGroup.code).catch(()=>{})
    showToast("Invite code copied! 📋")
  }

  const SUB_TABS = [{id:"chat",label:"💬 Chat"},{id:"leaderboard",label:"🏆 Board"},{id:"challenges",label:"⚡ Challenges"}]

  return (
    <div>
      {showCreate&&<CreateGroupModal onCreated={handleCreated} onClose={()=>setShowCreate(false)}/>}
      {showJoin  &&<JoinGroupModal   onJoined={handleJoined}   onClose={()=>setShowJoin(false)}/>}

      {groups.length===0&&(
        <div style={{ background:"#fff", borderRadius:20, padding:"2.5rem 1.5rem", textAlign:"center", border:"0.5px solid #f0f0f0", marginBottom:12 }}>
          <div style={{ fontSize:52, marginBottom:14 }}>👥</div>
          <div style={{ fontSize:18, fontWeight:700, color:P[800], marginBottom:8 }}>No groups yet</div>
          <p style={{ fontSize:14, color:"#aaa", marginBottom:"1.5rem", lineHeight:1.6 }}>
            Create a group and invite your partner or friends with a code, or join a group someone shared with you.
          </p>
          <Btn onClick={()=>setShowCreate(true)} style={{ marginBottom:10 }}>Create a group 🚀</Btn>
          <Btn onClick={()=>setShowJoin(true)} outline color={P[400]}>Join with invite code →</Btn>
        </div>
      )}

      {groups.length>0&&(
        <>
          <div style={{ display:"flex", gap:8, marginBottom:10, overflowX:"auto", paddingBottom:2 }}>
            {groups.map(g=>(
              <button key={g.id} onClick={()=>{setActiveGroup(g);setSubTab("chat")}} style={{ flexShrink:0, padding:"7px 16px", borderRadius:22, border:`2px solid ${activeGroup?.id===g.id?P[400]:"#e8e8e8"}`, background:activeGroup?.id===g.id?P[50]:"#fff", color:activeGroup?.id===g.id?P[600]:"#888", fontSize:13, fontWeight:activeGroup?.id===g.id?700:500, cursor:"pointer" }}>
                {g.name}
              </button>
            ))}
            <button onClick={()=>setShowCreate(true)} style={{ flexShrink:0, padding:"7px 14px", borderRadius:22, border:"1.5px dashed #ddd", background:"#fff", color:"#bbb", fontSize:13, cursor:"pointer" }}>+ New</button>
            <button onClick={()=>setShowJoin(true)}   style={{ flexShrink:0, padding:"7px 14px", borderRadius:22, border:"1.5px dashed #ddd", background:"#fff", color:"#bbb", fontSize:13, cursor:"pointer" }}>Join</button>
          </div>

          {activeGroup&&(
            <div style={{ background:`linear-gradient(135deg,${P[50]},${T[50]})`, borderRadius:14, padding:"0.875rem 1.25rem", marginBottom:10, display:"flex", alignItems:"center", justifyContent:"space-between", border:`1px solid ${P[100]}` }}>
              <div>
                <div style={{ fontSize:10, color:P[400], fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:2 }}>Invite code</div>
                <div style={{ fontSize:26, fontWeight:800, color:P[800], letterSpacing:6 }}>{activeGroup.code}</div>
                <div style={{ fontSize:10, color:"#aaa", marginTop:2 }}>Share this with friends to join</div>
              </div>
              <button onClick={copyCode} style={{ background:P[400], color:"#fff", border:"none", borderRadius:10, padding:"10px 18px", fontSize:13, fontWeight:700, cursor:"pointer" }}>Copy</button>
            </div>
          )}

          <div style={{ display:"flex", background:"#f3f3f3", borderRadius:12, padding:3, marginBottom:10 }}>
            {SUB_TABS.map(t=>(
              <button key={t.id} onClick={()=>setSubTab(t.id)} style={{ flex:1, padding:"8px 4px", borderRadius:10, border:"none", cursor:"pointer", fontSize:12, fontWeight:600, background:subTab===t.id?"#fff":"transparent", color:subTab===t.id?P[600]:"#999", boxShadow:subTab===t.id?"0 1px 6px rgba(0,0,0,0.09)":"none", transition:"all 0.2s" }}>
                {t.label}
              </button>
            ))}
          </div>

          {activeGroup&&subTab==="chat"        &&<Chat group={activeGroup} currentUsername={user.username} onGroupUpdate={handleGroupUpdate}/>}
          {activeGroup&&subTab==="leaderboard" &&<Leaderboard group={activeGroup} currentUsername={user.username}/>}
          {subTab==="challenges"               &&<ChallengesPanel activeChallenge={activeChallenge} completedChallenges={completedChallenges} onStart={onStartChallenge}/>}
        </>
      )}
    </div>
  )
}
