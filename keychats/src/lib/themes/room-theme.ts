export const roomThemes = [
  { id: 'default', name: '기본' }, { id: 'cream', name: '크림' },
  { id: 'lavender', name: '라벤더' }, { id: 'mint', name: '민트' },
  { id: 'sunset', name: '노을' }, { id: 'midnight', name: '미드나잇' },
] as const
export type RoomThemeId = typeof roomThemes[number]['id']
export type ThemeTarget = { kind: 'channel' | 'dm'; id: string }
export type RoomThemeSnapshot = { theme_id: RoomThemeId; revision: number; updated_by: string | null; updated_by_name: string; updated_at: string | null }
export const defaultRoomTheme: RoomThemeSnapshot = { theme_id: 'default', revision: 0, updated_by: null, updated_by_name: '', updated_at: null }
export function isRoomTheme(value: unknown): value is RoomThemeId { return roomThemes.some(t => t.id === value) }
export function roomThemeKey(target: ThemeTarget) { return `${target.kind}:${target.id}` }
export function normalizeRoomTheme(value: unknown): RoomThemeSnapshot {
  const row = value as Partial<RoomThemeSnapshot> | null
  if (!row || !isRoomTheme(row.theme_id) || typeof row.revision !== 'number') return defaultRoomTheme
  return { theme_id: row.theme_id, revision: row.revision, updated_by: row.updated_by ?? null, updated_by_name: row.updated_by_name ?? '사용자', updated_at: row.updated_at ?? null }
}
export function newerRoomTheme(current: RoomThemeSnapshot, incoming: RoomThemeSnapshot) {
  return incoming.revision >= current.revision ? incoming : current
}
