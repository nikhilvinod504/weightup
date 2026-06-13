/**
 * WeightUp — Cloudflare Worker API
 *
 * KV namespace: WEIGHTUP_KV  (bind in wrangler.toml)
 * Env var:      SESSION_SECRET  (set via Cloudflare dashboard → Workers → Settings → Variables)
 *
 * Routes
 * ──────
 * POST /api/auth/signup          { username, password, name, height? }
 * POST /api/auth/login           { username, password }
 *
 * All routes below require header:  Authorization: Bearer <token>
 *
 * GET  /api/me                   → user profile
 * POST /api/logs                 { d, w, note }   upsert by date
 * GET  /api/logs                 → []
 * POST /api/goal                 { w }
 * GET  /api/goal                 → { w } | null
 * POST /api/challenge/active     { challenge } | { challenge: null }
 * GET  /api/challenge/active     → challenge | null
 * POST /api/challenge/complete   { id }
 * GET  /api/challenges/completed → []
 *
 * POST /api/groups               { name }          → { group }
 * POST /api/groups/join          { code }          → { group }
 * GET  /api/groups               → []
 * GET  /api/groups/:id           → group
 * POST /api/groups/:id/messages  { text }
 * POST /api/groups/:id/kudos     { msgId }
 * GET  /api/groups/:id/members-stats  → [{ username, name, lost, goalPct, streak, level, xp }]
 */

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const json  = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } })
const err   = (msg,  status = 400) => json({ error: msg }, status)
const today = () => new Date().toISOString().split("T")[0]

async function sha256hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("")
}

// Simple HMAC-based token:  base64(username):base64(hmac)
async function signToken(username, secret) {
  const key  = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const sig  = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(username))
  const b64  = btoa(String.fromCharCode(...new Uint8Array(sig)))
  return btoa(username) + "." + b64
}

async function verifyToken(token, secret) {
  try {
    const [encUser, sig] = token.split(".")
    if (!encUser || !sig) return null
    const username = atob(encUser)
    const expected = await signToken(username, secret)
    // constant-time compare
    if (token !== expected) return null
    return username
  } catch { return null }
}

async function getAuthedUser(request, env) {
  const auth = request.headers.get("Authorization") || ""
  const token = auth.replace("Bearer ", "").trim()
  if (!token) return null
  const username = await verifyToken(token, env.SESSION_SECRET)
  if (!username) return null
  const user = await env.WEIGHTUP_KV.get(`user:${username}`, "json")
  return user || null
}

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  const arr = new Uint8Array(6)
  crypto.getRandomValues(arr)
  arr.forEach(b => code += chars[b % chars.length])
  return code
}

// ─────────────────────────────────────────────────────────────────────────────
// Game logic (duplicated from frontend for server-side leaderboard calc)
// ─────────────────────────────────────────────────────────────────────────────
const LEVELS = [
  { name: "Rookie",   min: 0,    icon: "🌱" },
  { name: "Climber",  min: 200,  icon: "🔼" },
  { name: "Warrior",  min: 500,  icon: "⚔️"  },
  { name: "Champion", min: 1000, icon: "🏆" },
  { name: "Legend",   min: 2000, icon: "👑" },
]

function calcStreak(logs) {
  if (!logs.length) return 0
  const dates = [...new Set(logs.map(l => l.d))].sort().reverse()
  const todayStr = today()
  let streak = 0
  let cur = new Date(todayStr)
  for (const dt of dates) {
    const diff = Math.round((cur - new Date(dt)) / 86400000)
    if (diff <= 1) { streak++; cur = new Date(dt) }
    else break
  }
  return streak
}

function calcXP(logs, streak, badgeCount) {
  return logs.length * 10 + streak * 5 + badgeCount * 50
}

function getLevel(xp) {
  return [...LEVELS].reverse().find(l => xp >= l.min) || LEVELS[0]
}

function countBadges(logs, streak, goal) {
  let count = 0
  if (logs.length >= 1)  count++
  if (streak >= 7)       count++
  if (streak >= 30)      count++
  const lost = logs.length >= 2 ? logs[0].w - logs[logs.length - 1].w : 0
  if (lost >= 1)  count++
  if (lost >= 5)  count++
  if (lost >= 10) count++
  if (logs.length >= 20) count++
  if (goal && logs.length > 0 && logs[logs.length - 1].w <= goal) count++
  return count
}

async function getMemberStats(username, env) {
  const logs   = (await env.WEIGHTUP_KV.get(`logs:${username}`, "json")) || []
  const goalD  = await env.WEIGHTUP_KV.get(`goal:${username}`, "json")
  const goal   = goalD?.w || null
  const streak = calcStreak(logs)
  const badges = countBadges(logs, streak, goal)
  const xp     = calcXP(logs, streak, badges)
  const level  = getLevel(xp)
  const first  = logs.length ? logs[0].w : null
  const latest = logs.length ? logs[logs.length - 1].w : null
  const lost   = first && latest ? +(first - latest).toFixed(1) : 0
  const goalPct = goal && first ? Math.min(100, Math.round((lost / (first - goal)) * 100)) : 0
  return { streak, xp, level: level.name, levelIcon: level.icon, lost, goalPct, badgeCount: badges }
}

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url    = new URL(request.url)
    const path   = url.pathname
    const method = request.method

    // CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin":  "*",
          "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type,Authorization",
        },
      })
    }

    // ── Auth: signup ─────────────────────────────────────────────────────────
    if (path === "/api/auth/signup" && method === "POST") {
      const { username, password, name, height } = await request.json()
      if (!username || !password || !name) return err("username, password and name are required")
      if (password.length < 4) return err("Password must be at least 4 characters")
      if (!/^[a-z0-9_]+$/i.test(username)) return err("Username: letters, numbers, underscores only")

      const key = `user:${username.toLowerCase()}`
      const existing = await env.WEIGHTUP_KV.get(key)
      if (existing) return err("Username already taken", 409)

      const hash = await sha256hex(password + env.SESSION_SECRET)
      const user = { username: username.toLowerCase(), name, height: height || 0, hash, joinDate: today(), groups: [] }
      await env.WEIGHTUP_KV.put(key, JSON.stringify(user))

      const token = await signToken(user.username, env.SESSION_SECRET)
      return json({ token, user: { ...user, hash: undefined } })
    }

    // ── Auth: login ──────────────────────────────────────────────────────────
    if (path === "/api/auth/login" && method === "POST") {
      const { username, password } = await request.json()
      if (!username || !password) return err("username and password required")

      const user = await env.WEIGHTUP_KV.get(`user:${username.toLowerCase()}`, "json")
      if (!user) return err("No account found with that username", 404)

      const hash = await sha256hex(password + env.SESSION_SECRET)
      if (hash !== user.hash) return err("Incorrect password", 401)

      const token = await signToken(user.username, env.SESSION_SECRET)
      return json({ token, user: { ...user, hash: undefined } })
    }

    // ── All routes below require auth ─────────────────────────────────────────
    const user = await getAuthedUser(request, env)
    if (!user && path.startsWith("/api/") && !path.startsWith("/api/auth/")) {
      return err("Unauthorised", 401)
    }

    // ── GET /api/me ──────────────────────────────────────────────────────────
    if (path === "/api/me" && method === "GET") {
      return json({ ...user, hash: undefined })
    }

    // ── Logs ─────────────────────────────────────────────────────────────────
    if (path === "/api/logs") {
      const key = `logs:${user.username}`
      if (method === "GET") {
        const logs = (await env.WEIGHTUP_KV.get(key, "json")) || []
        return json(logs)
      }
      if (method === "POST") {
        const { d, w, note } = await request.json()
        if (!d || !w) return err("d and w required")
        const logs = (await env.WEIGHTUP_KV.get(key, "json")) || []
        const updated = [...logs.filter(l => l.d !== d), { d, w, note: note || "" }]
          .sort((a, b) => a.d.localeCompare(b.d))
        await env.WEIGHTUP_KV.put(key, JSON.stringify(updated))
        return json(updated)
      }
    }

    // ── Goal ─────────────────────────────────────────────────────────────────
    if (path === "/api/goal") {
      const key = `goal:${user.username}`
      if (method === "GET") {
        const goal = await env.WEIGHTUP_KV.get(key, "json")
        return json(goal)
      }
      if (method === "POST") {
        const { w } = await request.json()
        if (!w) return err("w required")
        await env.WEIGHTUP_KV.put(key, JSON.stringify({ w }))
        return json({ w })
      }
    }

    // ── Active challenge ─────────────────────────────────────────────────────
    if (path === "/api/challenge/active") {
      const key = `achallenge:${user.username}`
      if (method === "GET") {
        return json(await env.WEIGHTUP_KV.get(key, "json"))
      }
      if (method === "POST") {
        const { challenge } = await request.json()
        if (challenge) await env.WEIGHTUP_KV.put(key, JSON.stringify(challenge))
        else           await env.WEIGHTUP_KV.delete(key)
        return json({ ok: true })
      }
    }

    // ── Completed challenges ─────────────────────────────────────────────────
    if (path === "/api/challenges/completed") {
      const key = `challenges:${user.username}`
      if (method === "GET") {
        return json((await env.WEIGHTUP_KV.get(key, "json")) || [])
      }
      if (method === "POST") {
        const { id } = await request.json()
        const existing = (await env.WEIGHTUP_KV.get(key, "json")) || []
        if (!existing.includes(id)) {
          await env.WEIGHTUP_KV.put(key, JSON.stringify([...existing, id]))
        }
        return json({ ok: true })
      }
    }

    // ── Groups: create ───────────────────────────────────────────────────────
    if (path === "/api/groups" && method === "POST") {
      const { name } = await request.json()
      if (!name?.trim()) return err("name required")
      const code = genCode()
      const gid  = `group:${Date.now()}_${user.username}`
      const group = {
        id: gid, name: name.trim(), code,
        owner: user.username,
        members: [{ username: user.username, name: user.name }],
        messages: [],
        createdAt: today(),
      }
      await env.WEIGHTUP_KV.put(gid, JSON.stringify(group))
      // update code index for fast lookup
      await env.WEIGHTUP_KV.put(`code:${code}`, gid)
      // add group to user's list
      const updUser = { ...user, groups: [...(user.groups || []), gid] }
      await env.WEIGHTUP_KV.put(`user:${user.username}`, JSON.stringify(updUser))
      return json(group)
    }

    // ── Groups: list ─────────────────────────────────────────────────────────
    if (path === "/api/groups" && method === "GET") {
      const u = await env.WEIGHTUP_KV.get(`user:${user.username}`, "json")
      const gids = u?.groups || []
      const groups = (await Promise.all(gids.map(gid => env.WEIGHTUP_KV.get(gid, "json")))).filter(Boolean)
      return json(groups)
    }

    // ── Groups: join ─────────────────────────────────────────────────────────
    if (path === "/api/groups/join" && method === "POST") {
      const { code } = await request.json()
      if (!code?.trim()) return err("code required")

      const gid = await env.WEIGHTUP_KV.get(`code:${code.trim().toUpperCase()}`)
      if (!gid) return err("No group found with that code", 404)

      const group = await env.WEIGHTUP_KV.get(gid, "json")
      if (!group) return err("Group not found", 404)

      const u = await env.WEIGHTUP_KV.get(`user:${user.username}`, "json")
      if ((u?.groups || []).includes(gid)) return err("You're already in this group", 409)

      const already = group.members.some(m => m.username === user.username)
      if (!already) {
        group.members.push({ username: user.username, name: user.name })
        await env.WEIGHTUP_KV.put(gid, JSON.stringify(group))
      }

      const updUser = { ...u, groups: [...(u?.groups || []), gid] }
      await env.WEIGHTUP_KV.put(`user:${user.username}`, JSON.stringify(updUser))
      return json(group)
    }

    // ── Groups: single group ─────────────────────────────────────────────────
    const groupMatch = path.match(/^\/api\/groups\/([^/]+)$/)
    if (groupMatch && method === "GET") {
      const gid   = decodeURIComponent(groupMatch[1])
      const group = await env.WEIGHTUP_KV.get(gid, "json")
      if (!group) return err("Group not found", 404)
      return json(group)
    }

    // ── Groups: send message ─────────────────────────────────────────────────
    const msgMatch = path.match(/^\/api\/groups\/([^/]+)\/messages$/)
    if (msgMatch && method === "POST") {
      const gid   = decodeURIComponent(msgMatch[1])
      const group = await env.WEIGHTUP_KV.get(gid, "json")
      if (!group) return err("Group not found", 404)

      const { text } = await request.json()
      if (!text?.trim()) return err("text required")

      const msg = {
        id: Date.now(),
        user: user.name,
        username: user.username,
        text: text.trim(),
        time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        kudos: 0,
      }
      group.messages = [...(group.messages || []), msg]
      await env.WEIGHTUP_KV.put(gid, JSON.stringify(group))
      return json(group)
    }

    // ── Groups: kudos ────────────────────────────────────────────────────────
    const kudosMatch = path.match(/^\/api\/groups\/([^/]+)\/kudos$/)
    if (kudosMatch && method === "POST") {
      const gid   = decodeURIComponent(kudosMatch[1])
      const group = await env.WEIGHTUP_KV.get(gid, "json")
      if (!group) return err("Group not found", 404)

      const { msgId } = await request.json()
      group.messages = (group.messages || []).map(m =>
        m.id === msgId ? { ...m, kudos: (m.kudos || 0) + 1 } : m
      )
      await env.WEIGHTUP_KV.put(gid, JSON.stringify(group))
      return json(group)
    }

    // ── Groups: member stats (leaderboard) ───────────────────────────────────
    const statsMatch = path.match(/^\/api\/groups\/([^/]+)\/members-stats$/)
    if (statsMatch && method === "GET") {
      const gid   = decodeURIComponent(statsMatch[1])
      const group = await env.WEIGHTUP_KV.get(gid, "json")
      if (!group) return err("Group not found", 404)

      const stats = await Promise.all(
        group.members.map(async m => ({
          username: m.username,
          name: m.name,
          ...(await getMemberStats(m.username, env)),
        }))
      )
      stats.sort((a, b) => b.goalPct - a.goalPct)
      return json(stats)
    }

    return err("Not found", 404)
  },
}
