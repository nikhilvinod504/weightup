// ─────────────────────────────────────────────────────────────────────────────
// storage.js  —  thin wrapper around localStorage
//
// Key namespacing:
//   private keys  → stored as-is            e.g.  "logs:arjun"
//   shared keys   → prefixed with "shared:" e.g.  "shared:group:g_123"
// ─────────────────────────────────────────────────────────────────────────────

const ns = (key, shared) => (shared ? `shared:${key}` : key)

export const stGet = (key, shared = false) => {
  try {
    const raw = localStorage.getItem(ns(key, shared))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const stSet = (key, value, shared = false) => {
  try {
    localStorage.setItem(ns(key, shared), JSON.stringify(value))
  } catch (e) {
    console.warn("storage write failed", e)
  }
}

export const stDel = (key, shared = false) => {
  try {
    localStorage.removeItem(ns(key, shared))
  } catch {}
}

/** Returns all localStorage keys that start with the given prefix (with ns applied) */
export const stList = (prefix, shared = false) => {
  const full = ns(prefix, shared)
  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(full)) keys.push(k.replace(/^shared:/, ""))
  }
  return keys
}
