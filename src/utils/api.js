/**
 * api.js — All network calls to the WeightUp Worker API.
 *
 * BASE_URL is read from the Vite env variable VITE_API_URL.
 * During local dev:  VITE_API_URL=http://localhost:8787  (wrangler dev)
 * In production:     VITE_API_URL=https://weightup-api.<your-subdomain>.workers.dev
 *
 * The token returned at login/signup is stored in localStorage and sent
 * as `Authorization: Bearer <token>` on every subsequent request.
 */

const BASE = import.meta.env.VITE_API_URL || ""

// ── Token management ──────────────────────────────────────────────────────────
export const getToken  = ()        => localStorage.getItem("wt_token")
export const setToken  = token     => localStorage.setItem("wt_token", token)
export const clearToken = ()       => localStorage.removeItem("wt_token")

// ── Core fetch wrapper ────────────────────────────────────────────────────────
async function call(method, path, body) {
  const headers = { "Content-Type": "application/json" }
  const token   = getToken()
  if (token) headers["Authorization"] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

const get  = path        => call("GET",  path)
const post = (path, body) => call("POST", path, body)

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function signup({ username, password, name, height }) {
  const data = await post("/api/auth/signup", { username, password, name, height })
  setToken(data.token)
  return data.user
}

export async function login({ username, password }) {
  const data = await post("/api/auth/login", { username, password })
  setToken(data.token)
  return data.user
}

export function logout() {
  clearToken()
}

export function getMe() {
  return get("/api/me")
}

// ── Logs ──────────────────────────────────────────────────────────────────────
export function getLogs()      { return get("/api/logs") }
export function addLog(entry)  { return post("/api/logs", entry) }   // { d, w, note }

// ── Goal ──────────────────────────────────────────────────────────────────────
export function getGoal()      { return get("/api/goal") }
export function saveGoal(w)    { return post("/api/goal", { w }) }

// ── Challenges ────────────────────────────────────────────────────────────────
export function getActiveChallenge()      { return get("/api/challenge/active") }
export function setActiveChallenge(c)     { return post("/api/challenge/active", { challenge: c }) }
export function clearActiveChallenge()    { return post("/api/challenge/active", { challenge: null }) }
export function getCompletedChallenges()  { return get("/api/challenges/completed") }
export function completeChallenge(id)     { return post("/api/challenges/completed", { id }) }

// ── Groups ────────────────────────────────────────────────────────────────────
export function getGroups()           { return get("/api/groups") }
export function createGroup(name)     { return post("/api/groups", { name }) }
export function joinGroup(code)       { return post("/api/groups/join", { code }) }
export function getGroup(id)          { return get(`/api/groups/${encodeURIComponent(id)}`) }
export function sendMessage(gid, text){ return post(`/api/groups/${encodeURIComponent(gid)}/messages`, { text }) }
export function giveKudos(gid, msgId) { return post(`/api/groups/${encodeURIComponent(gid)}/kudos`, { msgId }) }
export function getMemberStats(gid)   { return get(`/api/groups/${encodeURIComponent(gid)}/members-stats`) }

export function getGroupMembersData(gid) { return get(`/api/groups/${encodeURIComponent(gid)}/members-data`) }
