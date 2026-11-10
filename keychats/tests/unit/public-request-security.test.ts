import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ headers: vi.fn() }))
vi.mock('@/lib/admin/notifications', () => ({ recordAdminNotificationEvent: vi.fn(async () => undefined) }))

import { headers } from 'next/headers'
import { consumePublicRequestQuota, getPublicClientAddress } from '@/lib/security/public-request-quotas'
import { hashPasswordResetToken } from '@/lib/password-reset/crypto'
import { requestPasswordReset } from '@/lib/password-reset/service'
import { recordAdminNotificationEvent } from '@/lib/admin/notifications'

beforeEach(() => {
  vi.stubEnv('SUPABASE_SECRET_KEY', 'testing-secret-for-quota')
  vi.mocked(headers).mockResolvedValue(new Headers({ 'x-vercel-forwarded-for': '203.0.113.40' }) as never)
})
afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
})

describe('public request quotas', () => {
  it('takes the client address from the platform forwarding header', async () => {
    expect(await getPublicClientAddress()).toBe('203.0.113.40')
  })

  it('does not send plaintext IPs or login IDs to the database', async () => {
    const rpc = vi.fn(async () => ({ data: true, error: null }))
    expect(await consumePublicRequestQuota({ rpc } as never, 'signup_ip', '203.0.113.40', 5, 3600)).toBe(true)
    const args = rpc.mock.calls[0]?.[1] as Record<string, unknown>
    expect(args.p_subject_hash).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(args)).not.toContain('203.0.113.40')
    expect(args.p_max_attempts).toBe(5)
  })

  it('fails closed when the quota RPC fails or denies the request', async () => {
    const denied = { rpc: vi.fn(async () => ({ data: false, error: null })) }
    expect(await consumePublicRequestQuota(denied as never, 'signup_ip', 'ip', 5, 3600)).toBe(false)
    const errored = { rpc: vi.fn(async () => ({ data: null, error: { message: 'unavailable' } })) }
    await expect(consumePublicRequestQuota(errored as never, 'signup_ip', 'ip', 5, 3600))
      .rejects.toThrow('PUBLIC_REQUEST_QUOTA_FAILED')
  })
})

function resetAdmin(pending: { request_token_hash: string } | null) {
  const calls: string[] = []
  const query = (table: string) => {
    const chain = {
      select: (_columns: string) => chain,
      eq: (_column: string, _value: unknown) => chain,
      is: (_column: string, _value: unknown) => chain,
      gt: (_column: string, _value: unknown) => chain,
      order: (_column: string, _options: unknown) => chain,
      limit: (_count: number) => chain,
      maybeSingle: async () => ({
        data: table === 'profiles' ? { user_id: 'user-1' } : pending,
        error: null,
      }),
      insert: (_row: unknown) => { calls.push('insert'); return chain },
      single: async () => ({ data: { id: 'reset-1' }, error: null }),
    }
    return chain
  }
  return {
    client: { from: (table: string) => { calls.push(table); return query(table) }, rpc: vi.fn(async () => ({ data: true, error: null })) },
    calls,
  }
}

describe('password reset integrity', () => {
  it('preserves an existing pending request and the original browser token', async () => {
    const originalToken = 'original-browser-token'
    const admin = resetAdmin({ request_token_hash: hashPasswordResetToken(originalToken) })
    const result = await requestPasswordReset(admin.client as never, 'validuser', '203.0.113.40', originalToken)
    expect(result.token).toBe(originalToken)
    expect(admin.calls).not.toContain('insert')
    expect(vi.mocked(recordAdminNotificationEvent)).not.toHaveBeenCalled()
  })

  it('does not cancel another browser\'s existing pending request', async () => {
    const admin = resetAdmin({ request_token_hash: hashPasswordResetToken('other-browser-token') })
    const result = await requestPasswordReset(admin.client as never, 'validuser', '203.0.113.40')
    expect(result.token).toBeTruthy()
    expect(admin.calls).not.toContain('insert')
    expect(vi.mocked(recordAdminNotificationEvent)).not.toHaveBeenCalled()
  })
})
