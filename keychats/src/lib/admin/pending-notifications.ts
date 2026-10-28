import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

export async function loadAdminPendingCount(admin: SupabaseClient) {
  const now = new Date().toISOString()
  const [signupResult, passwordResult] = await Promise.all([
    admin
      .from('signup_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    admin
      .from('password_reset_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .gt('expires_at', now),
  ])

  if (signupResult.error) throw signupResult.error
  if (passwordResult.error) throw passwordResult.error
  return (signupResult.count ?? 0) + (passwordResult.count ?? 0)
}
