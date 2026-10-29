import 'server-only'
import type { createClient } from '@/lib/supabase/server'
import { normalizeRoomTheme, roomThemeKey, type ThemeTarget } from './room-theme'
export async function loadRoomTheme(client: Awaited<ReturnType<typeof createClient>>, target: ThemeTarget) {
  const { data, error } = await client.from('conversation_themes').select('theme_id,revision,updated_by,updated_by_name,updated_at').eq('room_key', roomThemeKey(target)).maybeSingle()
  // Older deployments can continue chatting before the additive migration is installed.
  return { initial: normalizeRoomTheme(data), unavailable: Boolean(error) }
}
