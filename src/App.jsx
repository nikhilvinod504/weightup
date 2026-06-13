import { useState, useEffect, useCallback } from 'react'
import { P, ALL_BADGES } from './utils/constants.js'
import { calcStreak, calcXP, getLevel, today } from './utils/helpers.js'
import * as api from './utils/api.js'
import { XPBar, Toast, Confetti, Avatar } from './components/UI.jsx'
import AuthScreen  from './components/AuthScreen.jsx'
import Onboarding  from './components/Onboarding.jsx'
import HomeTab     from './components/HomeTab.jsx'
import LogTab      from './components/LogTab.jsx'
import ChartTab    from './components/ChartTab.jsx'
import GroupTab    from './components/GroupTab.jsx'
import BadgesTab   from './components/BadgesTab.jsx'

const TABS = [
  { id:"home",   icon:"🏠", label:"Home"   },
  { id:"log",    icon:"⚖️",  label:"Log"    },
  { id:"chart",  icon:"📈", label:"Chart"  },
  { id:"group",  icon:"👥", label:"Group"  },
  { id:"badges", icon:"🏅", label:"Badges" },
]

export default function App() {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const [authUser,     setAuthUser]     = useState(null)
  const [needsOnboard, setNeedsOnboard] = useState(false)
  const [authLoading,  setAuthLoading]  = useState(true)   // check persisted token

  // ── Core data ────────────────────────────────────────────────────────────────
  const [logs,    setLogs]    = useState([])
  const [goal,    setGoal]    = useState(null)
  const [tab,     setTab]     = useState("home")
  const [toast,   setToast]   = useState(null)
  const [confetti,setConfetti]= useState(false)
  const [loading, setLoading] = useState(false)

  // ── Groups ──────────────────────────────────────────────────────────────────
  const [groups,      setGroups]      = useState([])
  const [activeGroup, setActiveGroup] = useState(null)

  // ── Challenges ──────────────────────────────────────────────────────────────
  const [activeChallenge,     setActiveChallenge]     = useState(null)
  const [completedChallenges, setCompletedChallenges] = useState([])

  // ── Toast / confetti helpers ────────────────────────────────────────────────
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3200)
  }, [])

  const boom = useCallback(() => {
    setConfetti(true)
    setTimeout(() => setConfetti(false), 2600)
  }, [])

  // ── Load all user data from API ─────────────────────────────────────────────
  const loadUserData = useCallback(async () => {
    setLoading(true)
    try {
      const [l, g, ac, cc, gr] = await Promise.all([
        api.getLogs(),
        api.getGoal(),
        api.getActiveChallenge(),
        api.getCompletedChallenges(),
        api.getGroups(),
      ])
      setLogs(l || [])
      setGoal(g?.w ?? null)
      setActiveChallenge(ac || null)
      setCompletedChallenges(cc || [])
      setGroups(gr || [])
      if (gr?.length) setActiveGroup(gr[0])
    } catch (e) {
      showToast("Failed to load data — check connection", "error")
    } finally {
      setLoading(false)
    }
  }, [showToast])

  // ── Try to restore session on mount ────────────────────────────────────────
  useEffect(() => {
    const token = api.getToken()
    if (!token) { setAuthLoading(false); return }
    api.getMe()
      .then(user => { setAuthUser(user); loadUserData() })
      .catch(() => { api.clearToken() })
      .finally(() => setAuthLoading(false))
  }, [loadUserData])

  // ── Auth handlers ───────────────────────────────────────────────────────────
  const handleLogin = async (user, isNew) => {
    setAuthUser(user)
    if (isNew) { setNeedsOnboard(true); return }
    await loadUserData()
  }

  const handleOnboardDone = async () => {
    setNeedsOnboard(false)
    await loadUserData()
    boom()
    showToast("You're all set! Let's crush those goals 💪")
  }

  const handleLogout = () => {
    api.logout()
    setAuthUser(null); setLogs([]); setGoal(null)
    setGroups([]); setActiveGroup(null); setTab("home")
    setActiveChallenge(null); setCompletedChallenges([])
  }

  // ── Derived stats ───────────────────────────────────────────────────────────
  const streak = calcStreak(logs)
  const badges = ALL_BADGES.filter(b => b.check(logs, streak, goal))
  const xp     = calcXP(logs, streak, badges)
  const level  = getLevel(xp)

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleLog = async (w, note) => {
    try {
      const newLogs = await api.addLog({ d: today(), w, note })
      setLogs(newLogs)
      const prev = logs.length ? logs[logs.length - 1].w : w
      const diff = +(prev - w).toFixed(1)
      if (diff >= 0.5)  { boom(); showToast(`⬇️ Down ${diff}kg from last log!`) }
      else if (diff < 0) showToast("Up a bit — stay consistent, it's a long game!", "info")
      else               showToast("Logged! Consistency is the superpower.")
      if (goal && w <= goal) { boom(); showToast("🎯 You've hit your goal — INCREDIBLE! 🎉") }
    } catch (e) {
      showToast(e.message || "Failed to save log", "error")
    }
  }

  const handleSaveGoal = async g => {
    try {
      await api.saveGoal(g)
      setGoal(g)
      showToast("Goal saved! 🎯")
    } catch (e) {
      showToast(e.message || "Failed to save goal", "error")
    }
  }

  const handleStartChallenge = async c => {
    try {
      await api.setActiveChallenge(c)
      setActiveChallenge(c)
      showToast(`Challenge started: ${c.name}`)
    } catch {}
  }

  const handleCompleteChallenge = async c => {
    try {
      await Promise.all([api.clearActiveChallenge(), api.completeChallenge(c.id)])
      setActiveChallenge(null)
      setCompletedChallenges(cc => [...cc, c.id])
      boom()
      showToast(`🏆 Challenge complete! +${c.xp} XP`)
    } catch {}
  }

  // ── Render guards ───────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f7f6fb" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:52, marginBottom:12 }}>⚖️</div>
          <div style={{ fontSize:14, color:"#aaa" }}>Loading WeightUp…</div>
        </div>
      </div>
    )
  }

  if (!authUser)    return <AuthScreen  onLogin={handleLogin} />
  if (needsOnboard) return <Onboarding user={authUser} onDone={handleOnboardDone} />

  return (
    <div style={{ fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif", minHeight:"100vh", background:"#f7f6fb", maxWidth:480, margin:"0 auto", position:"relative" }}>
      <Confetti show={confetti}/>
      {toast && <Toast msg={toast.msg} type={toast.type}/>}

      {/* Header */}
      <div style={{ background:"#fff", borderBottom:"0.5px solid #f0f0f0", padding:"12px 16px 10px", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:7 }}>
          <div style={{ fontSize:17, fontWeight:700, color:P[800], flex:1 }}>⚖️ WeightUp</div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:17 }}>🔥</div>
            <div style={{ fontSize:9, color:"#aaa" }}>{streak}d</div>
          </div>
          <Avatar name={authUser.name} size={30} bg={P[50]} fg={P[400]}/>
          <button onClick={handleLogout} style={{ background:"none", border:"1px solid #eee", borderRadius:8, padding:"4px 10px", fontSize:11, color:"#bbb", cursor:"pointer" }}>
            Sign out
          </button>
        </div>
        <XPBar xp={xp}/>
      </div>

      {/* Loading bar */}
      {loading && (
        <div style={{ height:2, background:"#f0f0f0", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", height:"100%", background:P[400], width:"40%", animation:"slide 1.2s infinite linear" }}/>
          <style>{`@keyframes slide{0%{left:-40%}100%{left:100%}}`}</style>
        </div>
      )}

      {/* Tab content */}
      <div style={{ padding:"14px 14px 88px" }}>
        {tab==="home" && (
          <HomeTab
            user={authUser} logs={logs} goal={goal}
            streak={streak} badges={badges} xp={xp} level={level}
            groups={groups} activeChallenge={activeChallenge}
            onCompleteChallenge={handleCompleteChallenge}
            onGoToLog={()=>setTab("log")}
            onGoToGroup={()=>setTab("group")}
            setActiveGroup={setActiveGroup}
          />
        )}
        {tab==="log" && (
          <LogTab logs={logs} goal={goal} onLog={handleLog} onSaveGoal={handleSaveGoal}/>
        )}
        {tab==="chart" && (
          <ChartTab user={authUser} logs={logs} goal={goal} streak={streak}/>
        )}
        {tab==="group" && (
          <GroupTab
            user={authUser} groups={groups} activeGroup={activeGroup}
            setActiveGroup={setActiveGroup} setGroups={setGroups}
            showToast={showToast} boom={boom}
            activeChallenge={activeChallenge}
            completedChallenges={completedChallenges}
            onStartChallenge={handleStartChallenge}
          />
        )}
        {tab==="badges" && (
          <BadgesTab
            user={authUser} logs={logs} goal={goal}
            streak={streak} badges={badges} xp={xp}
            showToast={showToast}
          />
        )}
      </div>

      {/* Bottom nav */}
      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:480, background:"#fff", borderTop:"0.5px solid #f0f0f0", display:"flex", zIndex:100, paddingBottom:"env(safe-area-inset-bottom)" }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, padding:"10px 0 8px", background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
            <span style={{ fontSize:19 }}>{t.icon}</span>
            <span style={{ fontSize:10, color:tab===t.id?P[600]:"#bbb", fontWeight:tab===t.id?700:400, transition:"color 0.15s" }}>
              {t.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
