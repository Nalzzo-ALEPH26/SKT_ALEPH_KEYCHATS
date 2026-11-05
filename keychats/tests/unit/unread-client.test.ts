import { describe, expect, it, vi } from 'vitest'

import { fetchUnreadCounts } from '@/lib/messages/unread-client'

describe('shared in-flight unread reads', () => {
  it('returns the unchanged RPC response and does not cache completed reads', async () => {
    const result = { data: [{ room_type: 'channel', room_id: 'channel', unread_count: 3 }, { room_type: 'dm', room_id: 'dm', unread_count: '2' }], error: null }
    const rpc = vi.fn(async () => result)
    const client = { rpc }
    const first = fetchUnreadCounts(client as never, 'user')
    const second = fetchUnreadCounts(client as never, 'user')
    expect(second).toBe(first)
    expect(await first).toBe(result)
    expect(rpc).toHaveBeenCalledExactlyOnceWith('get_unread_counts')
    expect(await fetchUnreadCounts(client as never, 'user')).toBe(result)
    expect(rpc).toHaveBeenCalledTimes(2)
  })

  it('never shares requests between users or clients', async () => {
    const rpc = vi.fn(async () => ({ data: [], error: null }))
    const firstClient = { rpc }
    const secondClient = { rpc }
    const first = fetchUnreadCounts(firstClient as never, 'first')
    const otherUser = fetchUnreadCounts(firstClient as never, 'second')
    const otherClient = fetchUnreadCounts(secondClient as never, 'first')
    expect(first).not.toBe(otherUser)
    expect(first).not.toBe(otherClient)
    await Promise.all([first, otherUser, otherClient])
    expect(rpc).toHaveBeenCalledTimes(3)
  })

  it('allows retry after a rejected RPC rather than retaining a rejected promise', async () => {
    const rpc = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ data: [], error: null })
    const client = { rpc }
    await expect(fetchUnreadCounts(client as never, 'user')).rejects.toThrow('offline')
    await expect(fetchUnreadCounts(client as never, 'user')).resolves.toEqual({ data: [], error: null })
    expect(rpc).toHaveBeenCalledTimes(2)
  })
})
