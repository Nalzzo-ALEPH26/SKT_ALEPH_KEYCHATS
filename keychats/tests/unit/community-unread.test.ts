import { describe, expect, it } from 'vitest'

import { markCommunityRead } from '@/lib/community/unread'

describe('community read persistence', () => {
  it('upserts the latest visible post timestamp for the signed-in user', async () => {
    const calls: Array<{ table: string; payload: unknown; options: unknown }> = []
    const client = {
      from(table: string) {
        return {
          async upsert(payload: unknown, options: unknown) {
            calls.push({ table, payload, options })
            return { error: null }
          },
        }
      },
    }

    await markCommunityRead(client as never, {
      userId: '11111111-1111-1111-1111-111111111111',
      communityId: '22222222-2222-2222-2222-222222222222',
      lastReadAt: '2026-10-29T02:03:20.646471Z',
      updatedAt: '2026-10-29T02:30:00.000Z',
    })

    expect(calls).toEqual([
      {
        table: 'community_read_states',
        payload: {
          user_id: '11111111-1111-1111-1111-111111111111',
          community_id: '22222222-2222-2222-2222-222222222222',
          last_read_at: '2026-10-29T02:03:20.646471Z',
          updated_at: '2026-10-29T02:30:00.000Z',
        },
        options: { onConflict: 'user_id,community_id' },
      },
    ])
  })

  it('surfaces database write failures instead of treating the read as saved', async () => {
    const error = new Error('write failed')
    const client = {
      from() {
        return {
          async upsert() {
            return { error }
          },
        }
      },
    }

    await expect(markCommunityRead(client as never, {
      userId: '11111111-1111-1111-1111-111111111111',
      communityId: '22222222-2222-2222-2222-222222222222',
      lastReadAt: '2026-10-29T02:03:20.646471Z',
    })).rejects.toBe(error)
  })
})
