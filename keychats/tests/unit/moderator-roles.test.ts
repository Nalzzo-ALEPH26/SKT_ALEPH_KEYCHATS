import { describe, expect, it } from 'vitest'
import { normalizeAccountRole, canModerateContent } from '@/lib/auth/roles'

describe('delegated content moderation', () => {
  it('recognizes only server-owned administrator and moderator roles', () => {
    expect(normalizeAccountRole('admin')).toBe('admin')
    expect(normalizeAccountRole('moderator')).toBe('moderator')
    expect(normalizeAccountRole('member')).toBe('member')
    expect(normalizeAccountRole('fake_admin')).toBe('member')
    expect(normalizeAccountRole(null)).toBe('member')
  })
  it('does not grant moderation to members', () => {
    expect(canModerateContent('admin')).toBe(true)
    expect(canModerateContent('moderator')).toBe(true)
    expect(canModerateContent('member')).toBe(false)
  })
})
