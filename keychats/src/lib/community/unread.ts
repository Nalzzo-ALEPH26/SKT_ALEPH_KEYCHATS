import type { SupabaseClient } from '@supabase/supabase-js'

export type CommunityUnreadCountRow = {
  community_id: string
  unread_count: number | string
}

type MarkCommunityReadInput = {
  userId: string
  communityId: string
  lastReadAt: string
  updatedAt?: string
}

export function mapCommunityUnreadRows(rows: CommunityUnreadCountRow[]) {
  const counts: Record<string, number> = {}
  for (const row of rows) {
    const count = Number(row.unread_count)
    if (Number.isFinite(count) && count > 0) counts[row.community_id] = count
  }
  return counts
}

export async function markCommunityRead(client: SupabaseClient, input: MarkCommunityReadInput) {
  const { error } = await client.from('community_read_states').upsert(
    {
      user_id: input.userId,
      community_id: input.communityId,
      last_read_at: input.lastReadAt,
      updated_at: input.updatedAt ?? new Date().toISOString(),
    },
    { onConflict: 'user_id,community_id' },
  )
  if (error) throw error
}

export async function loadCommunityUnreadCounts(client: SupabaseClient) {
  const { data, error } = await client.rpc('get_community_unread_counts')
  if (error) throw error
  return mapCommunityUnreadRows((data ?? []) as CommunityUnreadCountRow[])
}
