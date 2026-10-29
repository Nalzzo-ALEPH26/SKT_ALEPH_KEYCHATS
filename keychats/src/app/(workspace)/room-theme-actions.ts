'use server'
import { requireActiveUser } from '@/lib/auth/guards'
import { createAuthGuardAccess } from '@/lib/auth/server-access'
import { createClient } from '@/lib/supabase/server'
import { isRoomTheme, normalizeRoomTheme, type ThemeTarget, type RoomThemeSnapshot } from '@/lib/themes/room-theme'
export async function setRoomThemeAction(target: ThemeTarget, themeId: string): Promise<{ snapshot?: RoomThemeSnapshot; error?: string }> {
  if (!['channel','dm'].includes(target.kind) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target.id) || !isRoomTheme(themeId)) return { error: '대화방 또는 테마 정보가 올바르지 않습니다.' }
  const client = await createClient()
  await requireActiveUser(createAuthGuardAccess(client))
  // The database RPC checks membership and channel management privileges again.
  const { data, error } = await client.rpc('set_conversation_theme', { target_kind: target.kind, target_id: target.id, selected_theme: themeId })
  if (error) return { error: error.code === '42501' ? '이 대화방의 테마를 변경할 권한이 없습니다.' : '테마를 저장하지 못했습니다. DB 설정과 연결 상태를 확인해주세요.' }
  return { snapshot: normalizeRoomTheme(data) }
}
