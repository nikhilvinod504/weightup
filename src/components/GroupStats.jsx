import { useState, useEffect } from 'react'
import { P, T, A, C, LEVELS, ALL_BADGES } from '../utils/constants.js'
import { calcStreak, calcXP, getLevel } from '../utils/helpers.js'
import { getGroupMembersData } from '../utils/api.js'

const MEMBER_COLORS = [P[400], T[400], A[400], C[400], "#D4537E", "#639922", "#185FA5", "#854F0B"]

// Always use local date — never toISOString() which gives UTC
const localStr = d => {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
}
const daysAgo = n => { const d = new Date(); d.setDate(d.getDate()-n); return d }
const localToday = () => localStr(new Date())

function computeStats(rawMembers) {
  return rawMembers.map((m, i) => {
    const { logs = [], goal = null } = m
    const streak   = calcStreak(logs)
    const badges   = ALL_BADGES.filter(b => b.check(logs, streak, goal))
    const xp       = calcXP(logs, streak, badges)
    const level    = getLevel(xp)
    const first    = logs.length ? logs[0].w : null
    const latest   = logs.length ? logs[logs.length-1].w : null
    const lost     = first && latest ? +(first-latest).toFixed(1) : 0
    const goalPct  = goal && first && first > goal
      ? Math.min(100, Math.max(0, Math.round((lost/(first-goal))*100))) : 0

    const weekAgoStr = localStr(daysAgo(7))
    const weekLogs   = logs.filter(l => l.d >= weekAgoStr)
    const weekChange = weekLogs.length >= 2
      ? +(weekLogs[0].w - weekLogs[weekLogs.length-1].w).toFixed(1) : 0

    const last14   = logs.slice(-14)
    const logDates = new Set(logs.map(l => l.d))

    return {
      username: m.username, name: m.name,
      color: MEMBER_COLORS[i % MEMBER_COLORS.length],
      logs, goal, streak, xp, level, first, latest, lost,
      goalPct, weekChange, last14, logDates, badgeCount: badges.length,
    }
  })
}

function Card({ children }) {
  return <div style={{ background:"#fff", borderRadius:16, padding:"1.25rem", marginBottom:12, border:"0.5px solid #f0f0f0" }}>{children}</div>
}

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ fontSize:15, fontWeight:700, color:P[800] }}>{icon} {title}</div>
      {subtitle && <div style={{ fontSize:11, color:"#aaa", marginTop:2 }}>{subtitle}</div>}
    </div>
  )
}

function Legend({ members }) {
  return (
    <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:8 }}>
      {members.map(m => (
        <div key={m.username} style={{ display:"flex", alignItems:"center", gap:4 }}>
          <div style={{ width:12, height:4, borderRadius:2, background:m.color }}/>
          <span style={{ fontSize:10, color:"#888" }}>{m.name.split(" ")[0]}</span>
        </div>
      ))}
    </div>
  )
}

function TrendChart({ members }) {
  const W = 300, H = 130
  const allW = members.flatMap(m => m.last14.map(l => l.w)).filter(Boolean)
  if (!allW.length) return <div style={{ color:"#bbb", fontSize:13, textAlign:"center", padding:"1.5rem 0" }}>Not enough data yet</div>
  const mn = Math.min(...allW)-1, mx = Math.max(...allW)+1
  const px = (v,i,total) => [8+(i/Math.max(total-1,1))*(W-16), H-8-((v-mn)/(mx-mn))*(H-22)]
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:H }}>
        {members.map(m => {
          if (m.last14.length < 2) return null
          const pts  = m.last14.map((l,i) => px(l.w, i, m.last14.length))
          const path = pts.map((p,i) => i===0?`M${p[0]},${p[1]}`:`L${p[0]},${p[1]}`).join(" ")
          const last = pts[pts.length-1]
          return (
            <g key={m.username}>
              <path d={path} fill="none" stroke={m.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx={last[0]} cy={last[1]} r="4" fill={m.color}/>
              <text x={last[0]+6} y={last[1]+4} fontSize="9" fill={m.color} fontWeight="700">{m.name.split(" ")[0]}</text>
            </g>
          )
        })}
      </svg>
      <Legend members={members}/>
    </>
  )
}

function HBar({ members, getValue, fmt, colorBySign=false }) {
  const vals = members.map(m => ({ name:m.name.split(" ")[0], val:getValue(m), color:m.color }))
  const max  = Math.max(...vals.map(v => Math.abs(v.val)), 0.1)
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {vals.map((v,i) => {
        const barColor  = colorBySign ? (v.val>0?T[400]:v.val<0?C[400]:"#ddd") : v.color
        const textColor = colorBySign ? barColor : v.color
        return (
          <div key={i}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:3 }}>
              <span style={{ fontWeight:500, color:P[800] }}>{v.name}</span>
              <span style={{ fontWeight:700, color:textColor }}>{fmt(v.val)}</span>
            </div>
            <div style={{ height:8, background:"#f0f0f0", borderRadius:8, overflow:"hidden" }}>
              <div style={{ width:`${(Math.abs(v.val)/max)*100}%`, height:"100%", background:barColor, borderRadius:8, transition:"width 0.7s" }}/>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RaceTrack({ members }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {[...members].sort((a,b)=>b.goalPct-a.goalPct).map(m => (
        <div key={m.username}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:10, height:10, borderRadius:"50%", background:m.color }}/>
              <span style={{ fontSize:12, fontWeight:600, color:P[800] }}>{m.name.split(" ")[0]}</span>
              {!m.goal && <span style={{ fontSize:10, color:"#ccc" }}>no goal set</span>}
            </div>
            <span style={{ fontSize:13, fontWeight:700, color:m.color }}>{m.goalPct}%</span>
          </div>
          <div style={{ position:"relative", height:22, background:"#f0f0f0", borderRadius:11 }}>
            <div style={{ width:`${Math.max(m.goalPct,2)}%`, height:"100%", background:m.color, borderRadius:11, opacity:0.85, transition:"width 0.8s" }}/>
            <div style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", fontSize:12 }}>🏁</div>
            {m.goalPct > 8 && <div style={{ position:"absolute", left:`${Math.max(m.goalPct,2)}%`, top:-10, transform:"translateX(-50%)", fontSize:14 }}>🏃</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

function HeatmapRow({ member }) {
  const days = []
  for (let i=29; i>=0; i--) {
    const str = localStr(daysAgo(i))   // local date, not UTC
    days.push({ str, logged: member.logDates.has(str) })
  }
  return (
    <div>
      <div style={{ fontSize:12, fontWeight:600, color:P[800], marginBottom:5 }}>
        {member.name.split(" ")[0]}
        <span style={{ fontSize:10, color:"#bbb", fontWeight:400, marginLeft:6 }}>{days.filter(d=>d.logged).length}/30 days</span>
      </div>
      <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
        {days.map((d,i) => (
          <div key={i} title={d.str} style={{ width:11, height:11, borderRadius:2, background:d.logged?member.color:"#efefef" }}/>
        ))}
      </div>
    </div>
  )
}

function LevelLadder({ members }) {
  return (
    <div>
      {[...LEVELS].reverse().map(lv => {
        const here = members.filter(m => m.level.name === lv.name)
        return (
          <div key={lv.name} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"0.5px solid #f5f5f5" }}>
            <div style={{ fontSize:18, width:26 }}>{lv.icon}</div>
            <div style={{ fontSize:12, fontWeight:700, color:lv.color, minWidth:72 }}>{lv.name}</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {here.map(m => (
                <div key={m.username} style={{ background:m.color+"22", border:`1px solid ${m.color}44`, borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:700, color:m.color }}>
                  {m.name.split(" ")[0]}
                </div>
              ))}
              {!here.length && <span style={{ fontSize:11, color:"#ddd" }}>—</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function WeeklyBars({ members }) {
  const W=300, H=110
  const barGroupW = Math.floor((W-16)/7)
  const barW = Math.max(2, Math.floor((barGroupW-4)/members.length))

  // Build last 7 days using LOCAL dates
  const last7 = Array.from({length:7}, (_,i) => localStr(daysAgo(6-i)))
  const dayLabels = last7.map(s => {
    const d = new Date(s+"T00:00:00")
    return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]
  })

  const dayData = last7.map(str =>
    members.map(m => m.logs.find(l => l.d === str)?.w || null)
  )

  const allVals = dayData.flat().filter(Boolean)
  if (!allVals.length) return <div style={{ color:"#bbb", fontSize:13, textAlign:"center", padding:"1rem" }}>No data logged this week yet</div>
  const mn = Math.min(...allVals)-1, mx = Math.max(...allVals)+0.5

  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:H }}>
        {dayData.map((vals,di) =>
          vals.map((v,mi) => {
            if (!v) return null
            const bh = Math.max(3, ((v-mn)/(mx-mn))*(H-20))
            const x  = 8 + di*barGroupW + mi*barW + 1
            return (
              <g key={`${di}-${mi}`}>
                <rect x={x} y={H-16-bh} width={barW-1} height={bh} fill={members[mi].color} rx="2" opacity="0.85"/>
                {bh > 18 && <text x={x+(barW-1)/2} y={H-18-bh} fontSize="7" fill={members[mi].color} textAnchor="middle">{v}</text>}
              </g>
            )
          })
        )}
        {dayLabels.map((d,i) => (
          <text key={i} x={8+i*barGroupW+barGroupW/2} y={H-2} fontSize="8" fill="#bbb" textAnchor="middle">{d}</text>
        ))}
      </svg>
      <Legend members={members}/>
    </>
  )
}

function FunAwards({ members }) {
  const top = fn => [...members].sort(fn)[0]
  const awards = [
    { icon:"📅", title:"Most consistent",    winner:top((a,b)=>b.logs.length-a.logs.length),  stat:m=>`${m.logs.length} total logs`,    color:T[400] },
    { icon:"📉", title:"Biggest total drop",  winner:top((a,b)=>b.lost-a.lost),                stat:m=>`${m.lost} kg lost`,              color:P[400] },
    { icon:"🔥", title:"On fire",             winner:top((a,b)=>b.streak-a.streak),             stat:m=>`${m.streak} day streak`,         color:A[400] },
    { icon:"⚡", title:"XP leader",           winner:top((a,b)=>b.xp-a.xp),                    stat:m=>`${m.xp} XP`,                    color:C[400] },
    { icon:"📆", title:"Best this week",      winner:top((a,b)=>b.weekChange-a.weekChange),     stat:m=>`${m.weekChange} kg this week`,  color:"#D4537E" },
    { icon:"🏅", title:"Badge collector",     winner:top((a,b)=>b.badgeCount-a.badgeCount),     stat:m=>`${m.badgeCount} badges`,        color:"#639922" },
  ]
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
      {awards.map(a => (
        <div key={a.title} style={{ background:"#fafafa", borderRadius:14, padding:"0.875rem", border:"0.5px solid #f0f0f0" }}>
          <div style={{ fontSize:22, marginBottom:4 }}>{a.icon}</div>
          <div style={{ fontSize:10, color:"#aaa", marginBottom:3 }}>{a.title}</div>
          <div style={{ fontSize:14, fontWeight:700, color:a.color }}>{a.winner?.name?.split(" ")[0] || "—"}</div>
          <div style={{ fontSize:11, color:"#bbb" }}>{a.winner ? a.stat(a.winner) : "—"}</div>
        </div>
      ))}
    </div>
  )
}

export default function GroupStats({ group }) {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!group?.id) return
    setLoading(true); setError(null)
    getGroupMembersData(group.id)
      .then(raw => setData(computeStats(raw)))
      .catch(e  => setError(e.message || "Failed to load stats"))
      .finally(() => setLoading(false))
  }, [group?.id])

  if (loading) return <div style={{ textAlign:"center", padding:"3rem 0" }}><div style={{ fontSize:32, marginBottom:12 }}>📊</div><div style={{ fontSize:13, color:"#bbb" }}>Loading group stats…</div></div>
  if (error)   return <div style={{ textAlign:"center", padding:"2rem", color:C[400], fontSize:13 }}>{error}</div>
  if (!data.length) return <div style={{ textAlign:"center", padding:"2rem", color:"#bbb", fontSize:13 }}>No members found</div>
  if (!data.some(m => m.logs.length > 0)) return (
    <div style={{ textAlign:"center", padding:"3rem 1rem" }}>
      <div style={{ fontSize:40, marginBottom:12 }}>🌱</div>
      <div style={{ fontSize:15, fontWeight:600, color:P[800], marginBottom:6 }}>No data yet</div>
      <div style={{ fontSize:13, color:"#aaa" }}>Once members start logging weights, charts will appear here.</div>
    </div>
  )

  return (
    <div>
      <Card><SectionHeader icon="📈" title="Weight trends" subtitle="Everyone's last 14 days overlaid"/><TrendChart members={data}/></Card>
      <Card><SectionHeader icon="⬇️" title="Total kg lost" subtitle="From starting weight to today"/><HBar members={data} getValue={m=>Math.max(m.lost,0)} fmt={v=>`${v} kg`}/></Card>
      <Card><SectionHeader icon="🏁" title="Goal race" subtitle="% of goal reached — who's winning?"/><RaceTrack members={data}/></Card>
      <Card><SectionHeader icon="📆" title="This week's change" subtitle="kg lost in the last 7 days"/><HBar members={data} getValue={m=>m.weekChange} fmt={v=>v>0?`▼ ${v} kg`:v<0?`▲ ${Math.abs(v)} kg`:"no change"} colorBySign/></Card>
      <Card><SectionHeader icon="📊" title="Daily weights this week" subtitle="Each bar = a day, colours = members"/><WeeklyBars members={data}/></Card>
      <Card><SectionHeader icon="🔥" title="Logging streaks" subtitle="Consecutive days logged"/><HBar members={data} getValue={m=>m.streak} fmt={v=>`${v} days`}/></Card>
      <Card>
        <SectionHeader icon="🗓️" title="Consistency heatmap" subtitle="Last 30 days — coloured = logged"/>
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>{data.map(m => <HeatmapRow key={m.username} member={m}/>)}</div>
        <div style={{ display:"flex", gap:10, marginTop:12, fontSize:10, color:"#bbb", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:3 }}><div style={{ width:11, height:11, borderRadius:2, background:"#efefef" }}/> missed</div>
          <div style={{ display:"flex", alignItems:"center", gap:3 }}><div style={{ width:11, height:11, borderRadius:2, background:P[400] }}/> logged</div>
        </div>
      </Card>
      <Card><SectionHeader icon="⚡" title="XP comparison" subtitle="Total experience points earned"/><HBar members={data} getValue={m=>m.xp} fmt={v=>`${v} XP`}/></Card>
      <Card><SectionHeader icon="🪜" title="Level ladder" subtitle="Where everyone stands"/><LevelLadder members={data}/></Card>
      <Card><SectionHeader icon="🏆" title="Group awards" subtitle="Standouts across all categories"/><FunAwards members={data}/></Card>
    </div>
  )
}
