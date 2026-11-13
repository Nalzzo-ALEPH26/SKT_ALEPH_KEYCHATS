import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

export type AccountRole = 'admin' | 'moderator' | 'member'

export function normalizeAccountRole(value: unknown): AccountRole {
  return value === 'admin' || value === 'moderator' ? value : 'member'
}

export function canModerateContent(role: AccountRole) {
  return role === 'admin' || role === 'moderator'
}

export async function getCurrentAccountRole(admin: SupabaseClient, userId: string): Promise<AccountRole> {
  const { data, error } = await admin.auth.admin.getUserById(userId)
  if (error || !data?.user) throw new Error('ACCOUNT_ROLE_LOOKUP_FAILED')
  return normalizeAccountRole(data.user.app_metadata?.role)
}
