import type { SupabaseClient } from '@supabase/supabase-js'

type UnreadResult = Awaited<ReturnType<SupabaseClient['rpc']>>
type PendingRead = { promise: Promise<UnreadResult>; invalidate: () => void }
const pendingReads = new WeakMap<SupabaseClient, Map<string, PendingRead>>()

export function fetchUnreadCounts(client: SupabaseClient, userId: string, changed = false): Promise<UnreadResult> {
  let byUser = pendingReads.get(client)
  if (!byUser) {
    byUser = new Map()
    pendingReads.set(client, byUser)
  }
  const pending = byUser.get(userId)
  if (pending) {
    if (changed) pending.invalidate()
    return pending.promise
  }

  let invalidated = false
  const promise = Promise.resolve().then(async () => {
    let result: UnreadResult
    do {
      invalidated = false
      result = await client.rpc('get_unread_counts')
    } while (invalidated)
    return result
  }).finally(() => byUser.delete(userId))
  byUser.set(userId, { promise, invalidate: () => { invalidated = true } })
  return promise
}
