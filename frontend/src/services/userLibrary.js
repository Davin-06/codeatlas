const FAVORITES_KEY = 'codeatlas.favorites.v1'
const RECENT_KEY = 'codeatlas.recent.v1'
const MAX_RECENT = 12

function readList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(value) ? value.map(String) : []
  } catch {
    return []
  }
}

function writeList(key, items) {
  localStorage.setItem(key, JSON.stringify(items))
  window.dispatchEvent(new CustomEvent('codeatlas:library-changed', {
    detail: { key, items }
  }))
}

export function getFavoriteIds() {
  return readList(FAVORITES_KEY)
}

export function isFavorite(id) {
  return getFavoriteIds().includes(String(id))
}

export function toggleFavorite(id) {
  const value = String(id)
  const current = getFavoriteIds()
  const next = current.includes(value)
    ? current.filter((item) => item !== value)
    : [value, ...current]
  writeList(FAVORITES_KEY, next)
  return next.includes(value)
}

export function removeFavorite(id) {
  const value = String(id)
  const next = getFavoriteIds().filter((item) => item !== value)
  writeList(FAVORITES_KEY, next)
  return next
}

export function clearFavorites() {
  writeList(FAVORITES_KEY, [])
  return []
}

export function getRecentIds() {
  return readList(RECENT_KEY)
}

export function recordRecent(id) {
  const value = String(id)
  const next = [value, ...getRecentIds().filter((item) => item !== value)].slice(0, MAX_RECENT)
  writeList(RECENT_KEY, next)
  return next
}

export function resolveIds(ids, items) {
  const byId = new Map(items.map((item) => [String(item.id), item]))
  return ids.map((id) => byId.get(String(id))).filter(Boolean)
}

export function resolveFavorites(items) {
  return resolveIds(getFavoriteIds(), items)
}
