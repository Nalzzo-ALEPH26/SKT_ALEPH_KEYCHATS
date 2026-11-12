import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/supabase/proxy', () => ({ updateSession: vi.fn() }))

import { updateSession } from '@/lib/supabase/proxy'
import { proxy } from '../../proxy'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(updateSession).mockImplementation(async () => NextResponse.next())
})

describe('public health path bypass', () => {
  it.each(['/api/health', '/chats/api/health'])(
    'does not refresh auth for %s',
    async (path) => {
      const response = await proxy(new NextRequest(`https://keychats.vercel.app${path}`))
      expect(updateSession).not.toHaveBeenCalled()
      expect(response.headers.get('location')).toBeNull()
      expect(response.headers.get('x-middleware-next')).toBe('1')
    },
  )

  it('retains existing session refresh on other routes', async () => {
    const request = new NextRequest('https://keychats.vercel.app/chats/channel/123')
    await proxy(request)
    expect(updateSession).toHaveBeenCalledTimes(1)
    expect(updateSession).toHaveBeenCalledWith(request)
  })
})
