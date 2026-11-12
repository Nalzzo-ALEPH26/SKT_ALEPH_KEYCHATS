import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }))

import { createClient } from '@supabase/supabase-js'
import { GET } from '@/app/api/health/route'

type RpcResult = { data: boolean | null; error: unknown }

function mockRpc(result: Promise<RpcResult>) {
  const abortSignal = vi.fn((_signal: AbortSignal) => result)
  const rpc = vi.fn((_name: string) => ({ abortSignal }))
  vi.mocked(createClient).mockReturnValue({ rpc } as unknown as ReturnType<typeof createClient>)
  return { rpc, abortSignal }
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'publishable-test-key')
  vi.stubEnv('SUPABASE_SECRET_KEY', 'must-never-be-used')
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
  vi.unstubAllEnvs()
})

describe('GET /chats/api/health', () => {
  it('returns exactly status ok, uses one anon RPC, and disables caching', async () => {
    const { rpc, abortSignal } = mockRpc(Promise.resolve({ data: true, error: null }))
    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('keychats_health_check')
    expect(abortSignal).toHaveBeenCalledOnce()
    expect(vi.mocked(createClient)).toHaveBeenCalledWith(
      'https://project.supabase.co',
      'publishable-test-key',
      { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
    )
  })

  it('returns 503 on a database error without disclosing its details', async () => {
    mockRpc(Promise.resolve({ data: null, error: { message: 'private db hostname and channel data' } }))
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toEqual({ status: 'error' })
    expect(Object.keys(body)).toEqual(['status'])
    expect(JSON.stringify(body)).not.toMatch(/hostname|channel|message|secret|version|user/i)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('returns 503 and aborts the query when the database does not respond in 3 seconds', async () => {
    vi.useFakeTimers()
    const { abortSignal } = mockRpc(new Promise<RpcResult>(() => undefined))
    const pending = GET()
    await vi.advanceTimersByTimeAsync(3000)
    const response = await pending

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ status: 'error' })
    expect(abortSignal).toHaveBeenCalledOnce()
    const signal = abortSignal.mock.calls[0]?.[0]
    expect(signal?.aborted).toBe(true)
  })

  it('returns 503 without sensitive fields when the database throws', async () => {
    mockRpc(Promise.reject(new Error('secret database address 10.0.0.1')))
    const response = await GET()

    expect(response.status).toBe(503)
    expect(await response.text()).toBe('{"status":"error"}')
  })

  it('fails closed if publishable configuration is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '')
    const response = await GET()

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ status: 'error' })
    expect(createClient).not.toHaveBeenCalled()
  })
})
