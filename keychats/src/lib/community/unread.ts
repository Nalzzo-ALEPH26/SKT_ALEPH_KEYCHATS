import type { SupabaseClient } from '@supabase/supabase-js'

export type CommunityUnreadCountRow = {
  community_id: string
  unread_count: number | string
}

export function mapCommunityUnreadRows(rows: CommunityUnreadCountRow[]) {
  const counts: Record<string, number> = {}
  for (const row of rows) {
    const count = Number(row.unread_count)
    if (Number.isFinite(count) && count > 0) counts[row.community_id] = count
  }
  return counts
}

export async function loadCommunityUnreadCounts(client: SupabaseClient) {
  const { data, error } = await client.rpc('get_community_unread_counts')
  if (error) throw error
  return mapCommunityUnreadRows((data ?? []) as CommunityUnreadCountRow[])
}
