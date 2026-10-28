import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

export type AdminNotificationKind = 'signup_request' | 'password_reset'

export async function recordAdminNotificationEvent(
  admin: SupabaseClient,
  kind: AdminNotificationKind,
  entityId: string,
) {
  const { error } = await admin.from('admin_notification_events').insert({
    kind,
    entity_id: entityId,
  })

  if (error) {
    console.error('Failed to record admin notification event', { kind, entityId, error })
  }
}
