// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Row = { room_type: 'channel' | 'dm'; room_id: string; unread_count: number }
type Payload = { new?: Record<string, unknown>; extension?: string; status?: string }
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  rows: [] as Row[],
  pending: [] as Array<() => void>,
  handlers: new Map<string, Array<{ type: string; table?: string; callback: (payload: Payload) => void }>>(),
  statuses: new Map<string, (status: string) => void>(),
  router: { refresh: vi.fn(), push: vi.fn() },
  pathname: '/settings',
}))

vi.mock('next/navigation', () => ({ useRouter: () => mocks.router, usePathname: () => mocks.pathname }))
vi.mock('@/app/(workspace)/admin/admin-actions', () => ({ getAdminPendingCountAction: vi.fn() }))
vi.mock('@/components/sidebar', () => ({
  Sidebar: ({ channels, directMessages }: { channels: Array<{ id: string; unreadCount: number }>; directMessages: Array<{ id: string; unreadCount: number }> }) => (
    <output data-testid="counts">{JSON.stringify({ channels, directMessages })}</output>
  ),
}))
vi.mock('@/lib/supabase/client', () => {
  const client = {
    rpc: mocks.rpc,
    auth: {
      getSession: async () => ({ data: { session: { access_token: 'token', user: { id: 'viewer', app_metadata: {} } } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    realtime: { setAuth: async () => undefined },
    from: () => {
      const query = { select: () => query, eq: async () => ({ data: [], error: null }) }
      return query
    },
    channel: (name: string) => {
      const handlers: Array<{ type: string; table?: string; callback: (payload: Payload) => void }> = []
      mocks.handlers.set(name, handlers)
      const channel = {
        on: (type: string, filter: { table?: string } | string, callback: (payload: Payload) => void) => {
          handlers.push({ type, table: typeof filter === 'string' ? undefined : filter.table, callback })
          return channel
        },
        subscribe: (callback?: (status: string) => void) => {
          if (callback) mocks.statuses.set(name, callback)
          return channel
        },
      }
      return channel
    },
    removeChannel: vi.fn(),
  }
  return { createClient: () => client }
})

import { AppShell } from '@/components/app-shell'
import { BrowserMessageNotifications } from '@/components/browser-message-notifications'

const channels = [{ id: 'channel', name: 'Channel', unreadCount: 0 }]
const directMessages = [{ id: 'dm', displayName: 'Sender', unreadCount: 0 }]
const communities: [] = []

function emit(name: string, table: string, payload: Payload) {
  mocks.handlers.get(name)?.filter((handler) => handler.table === table).forEach((handler) => handler.callback(payload))
}
async function release() {
  await act(async () => {
    const pending = mocks.pending.splice(0)
    pending.forEach((resolve) => resolve())
  })
}
function unreadCalls() { return mocks.rpc.mock.calls.filter(([name]) => name === 'get_unread_counts').length }
async function mount() {
  render(<><AppShell profile={{ displayName: 'Viewer', avatarPath: null }} currentUserId="viewer" channels={channels} directMessages={directMessages} communities={communities} /><BrowserMessageNotifications /></>)
  await act(async () => undefined)
  await act(async () => {
    mocks.handlers.get('sidebar-unread:viewer')?.filter((handler) => handler.type === 'system').forEach((handler) => handler.callback({ extension: 'postgres_changes', status: 'ok' }))
  })
  await release()
  await release()
  mocks.rpc.mockClear()
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.handlers.clear()
  mocks.statuses.clear()
  mocks.pending.length = 0
  mocks.pathname = '/settings'
  window.history.replaceState(null, '', '/settings')
  mocks.rows = [{ room_type: 'dm', room_id: 'dm', unread_count: 1 }]
  mocks.rpc.mockImplementation((name: string) => {
    if (name !== 'get_unread_counts') return Promise.resolve({ data: [], error: null })
    const data = mocks.rows.map((row) => ({ ...row }))
    return new Promise((resolve) => mocks.pending.push(() => resolve({ data, error: null })))
  })
  document.head.innerHTML = '<title>Keychats</title><link rel="icon" href="/chats/keychats-tab-icon.svg">'
})
afterEach(async () => { cleanup(); await release(); vi.restoreAllMocks() })

describe('unread RPC synchronization', () => {
  it('shares one unread RPC across both consumers for simultaneous focus and visibilitychange', async () => {
    await mount()
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(unreadCalls()).toBe(1)
    await release()
    expect(document.title).toBe('1 새 메시지 · KEYCHATS')
    expect(screen.getAllByTestId('counts')[0].textContent).toContain('"unreadCount":1')
  })

  it('does not recompute DM unread for a channel-only read-state update', async () => {
    await mount()
    await act(async () => emit('browser-notifications:viewer', 'read_states', { new: { user_id: 'viewer', channel_id: 'channel', dm_thread_id: null } }))
    expect(unreadCalls()).toBe(0)
  })

  it('rechecks a DM read that arrives during a query and gives both consumers the fresh zero count', async () => {
    await mount()
    await act(async () => window.dispatchEvent(new Event('focus')))
    mocks.rows = []
    await act(async () => emit('browser-notifications:viewer', 'read_states', { new: { user_id: 'viewer', dm_thread_id: 'dm', channel_id: null } }))
    await release()
    await release()
    expect(unreadCalls()).toBe(2)
    expect(document.title).toBe('Keychats')
    expect(screen.getAllByTestId('counts')[0].textContent).not.toContain('"unreadCount":1')
  })

  it('keeps realtime sidebar increments local, excludes self messages, and recovers after reconnect', async () => {
    await mount()
    const incoming = { id: 10, channel_id: 'channel', dm_thread_id: null, sender_id: 'other', deleted_at: null }
    await act(async () => {
      emit('sidebar-unread:viewer', 'messages', { new: incoming })
      emit('sidebar-unread:viewer', 'messages', { new: { ...incoming, id: 11, sender_id: 'viewer' } })
    })
    expect(unreadCalls()).toBe(0)
    expect(screen.getAllByTestId('counts')[0].textContent).toContain('"id":"channel","name":"Channel","unreadCount":1')
    mocks.rows = [{ room_type: 'dm', room_id: 'dm', unread_count: 2 }]
    await act(async () => mocks.statuses.get('browser-notifications:viewer')?.('SUBSCRIBED'))
    await release()
    expect(document.title).toBe('2 새 메시지 · KEYCHATS')
  })

  it('rechecks an incoming DM during focus synchronization without overwriting its unread count', async () => {
    await mount()
    await act(async () => window.dispatchEvent(new Event('focus')))
    mocks.rows = [{ room_type: 'dm', room_id: 'dm', unread_count: 2 }]
    const incoming = { id: 12, channel_id: null, dm_thread_id: 'dm', sender_id: 'other', deleted_at: null }
    await act(async () => {
      emit('sidebar-unread:viewer', 'messages', { new: incoming })
      emit('browser-notifications:viewer', 'messages', { new: incoming })
    })
    await release()
    await release()
    expect(unreadCalls()).toBe(2)
    expect(document.title).toBe('2 새 메시지 · KEYCHATS')
    expect(screen.getAllByTestId('counts')[0].textContent).toContain('"unreadCount":2')
  })

  it('refreshes a query started before a realtime reconnect', async () => {
    await mount()
    await act(async () => window.dispatchEvent(new Event('focus')))
    mocks.rows = [{ room_type: 'dm', room_id: 'dm', unread_count: 2 }]
    await act(async () => mocks.statuses.get('browser-notifications:viewer')?.('SUBSCRIBED'))
    await release()
    await release()
    expect(document.title).toBe('2 새 메시지 · KEYCHATS')
    expect(screen.getAllByTestId('counts')[0].textContent).toContain('"unreadCount":2')
  })

  it('excludes self messages and the visible focused DM from new-message synchronization', async () => {
    mocks.pathname = '/dm/dm'
    window.history.replaceState(null, '', '/dm/dm')
    vi.spyOn(document, 'hasFocus').mockReturnValue(true)
    await mount()
    const incoming = { id: 13, channel_id: null, dm_thread_id: 'dm', sender_id: 'other', deleted_at: null }
    await act(async () => {
      for (const message of [incoming, { ...incoming, id: 14, sender_id: 'viewer' }]) {
        emit('sidebar-unread:viewer', 'messages', { new: message })
        emit('browser-notifications:viewer', 'messages', { new: message })
      }
    })
    expect(unreadCalls()).toBe(0)
    expect(screen.getAllByTestId('counts')[0].textContent).not.toContain('"unreadCount":1')
  })
})
