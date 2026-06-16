import { LEVELS, ALL_BADGES } from './constants.js'

// Use local date (not UTC) so date matches user's timezone (e.g. IST)
export const today = () => {
  const d = new Date()
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0"), day = String(d.getDate()).padStart(2,"0")
  return `${y}-${m}-${day}`
}

export const initials = name =>
  (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()

export const genCode = () =>
  Math.random().toString(36).slice(2, 8).toUpperCase()

export const hashPw = async pw => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("")
}

export function calcStreak(logs) {
  if (!logs.length) return 0
  const dates = [...new Set(logs.map(l => l.d))].sort().reverse()
  let streak = 0
  let cur = new Date(today())
  for (const dt of dates) {
    const diff = Math.round((cur - new Date(dt)) / 86400000)
    if (diff <= 1) { streak++; cur = new Date(dt) }
    else break
  }
  return streak
}

export function calcXP(logs, streak, badges) {
  return logs.length * 10 + streak * 5 + badges.length * 50
}

export function getLevel(xp) {
  return [...LEVELS].reverse().find(l => xp >= l.min) || LEVELS[0]
}

export function nextLevel(xp) {
  return LEVELS.find(l => l.min > xp) || null
}

export function movingAvg(logs, n = 7) {
  return logs.map((l, i) => {
    const sl = logs.slice(Math.max(0, i - n + 1), i + 1)
    return { d: l.d, avg: +(sl.reduce((s, x) => s + x.w, 0) / sl.length).toFixed(1) }
  })
}

export function predictGoalDate(logs, goal) {
  if (logs.length < 3 || !goal) return null
  const r = logs.slice(-14)
  const f = r[0], la = r[r.length - 1]
  const days = Math.max(1, (new Date(la.d) - new Date(f.d)) / 86400000)
  const rate = (f.w - la.w) / days
  if (rate <= 0) return null
  const dLeft = (la.w - goal) / rate
  const d = new Date()
  d.setDate(d.getDate() + Math.round(dLeft))
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

export function aiInsight(logs) {
  if (logs.length < 7) return null
  const byDay = {}
  logs.forEach(l => {
    const d = new Date(l.d).getDay()
    if (!byDay[d]) byDay[d] = { s: 0, n: 0 }
    byDay[d].s += l.w; byDay[d].n++
  })
  const avgs = Object.entries(byDay)
    .map(([d, v]) => ({ d: +d, avg: v.s / v.n }))
    .sort((a, b) => b.avg - a.avg)
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  return `📊 You tend to weigh more on ${names[avgs[0].d]}s. Try logging right after waking up for consistency.`
}

export function getMemberStats(logs, goal) {
  const streak  = calcStreak(logs)
  const badges  = ALL_BADGES.filter(b => b.check(logs, streak, goal))
  const xp      = calcXP(logs, streak, badges)
  const level   = getLevel(xp)
  const first   = logs.length ? logs[0].w : null
  const latest  = logs.length ? logs[logs.length - 1].w : null
  const lost    = (first && latest) ? +(first - latest).toFixed(1) : 0
  const goalPct = goal && first ? Math.min(100, Math.round((lost / (first - goal)) * 100)) : 0
  return { streak, badges, xp, level, first, latest, lost, goalPct }
}
