'use server'
import { requireActiveUser } from '@/lib/auth/guards'
import { createAuthGuardAccess } from '@/lib/auth/server-access'
import { createClient } from '@/lib/supabase/server'
import { parseVisitResult, type VisitResult } from '@/lib/community/visit-counts'
export async function recordShowcaseVisitAction(siteId: string): Promise<VisitResult> {
  const unavailable = { count: null, counted: false }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(siteId)) return unavailable
  try {
    const client = await createClient()
    await requireActiveUser(createAuthGuardAccess(client))
    // Identity, ownership exclusion, deduplication and atomic increment are enforced by the DB.
    const { data, error } = await client.rpc('record_showcase_visit', { target_site_id: siteId })
    return error ? unavailable : parseVisitResult(data)
  } catch {
    // Counting must never block the outbound link, including before SQL is installed.
    return unavailable
  }
}
