/** Browser-local sidebar favorites, scoped by the authenticated user's ID. */
export const FAVORITES_STORAGE_PREFIX = 'keychats:sidebar-favorites:v1:'

export type FavoriteRoomKind = 'channel' | 'dm'

export function sidebarFavoriteKey(kind: FavoriteRoomKind, id: string) {
  return `${kind}:${id}`
}

export function readSidebarFavoriteKeys(raw: string | null): string[] {
  if (!raw) return []
  try {
    const entries: unknown = JSON.parse(raw)
    if (!Array.isArray(entries)) return []
    const valid = entries.filter((key): key is string =>
      typeof key === 'string' && /^(channel|dm):[\w-]{1,128}$/.test(key),
    )
    return [...new Set(valid)].slice(0, 100)
  } catch {
    return []
  }
}

export function toggleSidebarFavoriteKey(keys: string[], key: string) {
  if (keys.includes(key)) return keys.filter((item) => item !== key)
  return [...keys, key]
}

export function moveSidebarFavoriteKey(keys: string[], source: string, target: string) {
  const from = keys.indexOf(source)
  const to = keys.indexOf(target)
  if (from < 0 || to < 0 || from === to) return keys
  const next = [...keys]
  next.splice(from, 1)
  next.splice(to, 0, source)
  return next
}

export function shiftSidebarFavoriteKey(keys: string[], source: string, direction: -1 | 1) {
  const from = keys.indexOf(source)
  const to = from + direction
  if (from < 0 || to < 0 || to >= keys.length) return keys
  return moveSidebarFavoriteKey(keys, source, keys[to])
}
