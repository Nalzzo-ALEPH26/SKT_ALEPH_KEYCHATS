import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const exists = (path: string) => existsSync(new URL(path, import.meta.url))

describe('compact admin navigation and login-ID based role delegation', () => {
  it('keeps account administration off the primary admin page', () => {
    const page = read('../../src/app/(workspace)/admin/page.tsx')
    expect(page).toContain('ModeratorDelegationForm')
    expect(page).toContain('SignupRequestsPanel')
    expect(page).toContain('href="/admin/users"')
    expect(page).not.toContain('AdminPanel')
    expect(page).not.toContain("from('invites')")
    expect(page).not.toContain('eligible.map')
    const users = read('../../src/app/(workspace)/admin/users/page.tsx')
    expect(users).toContain('requireAdmin')
    expect(users).toContain('UserManagementPanel')
  })

  it('looks up the exact normalized login ID on the server and rechecks the target before granting', () => {
    const actions = read('../../src/app/(workspace)/admin/moderator-actions.ts')
    expect(actions).toContain('normalizeLoginId(rawLoginId)')
    expect(actions).toContain(".eq('username', loginId)")
    expect(actions).toContain('admin.auth.admin.getUserById(userId)')
    expect(actions).toContain('lookupModeratorCandidateAction')
    expect(actions).toContain('setModeratorRoleAction')
    expect(actions).toContain('MODERATOR_ALREADY_ASSIGNED')
    expect(actions).not.toContain("formData.get('userId')")
  })

  it('removes both admin invitation actions and direct-link registration routes', () => {
    for (const path of [
      '../../src/app/(workspace)/admin/invite-actions.ts',
      '../../src/app/invite/[token]/page.tsx',
      '../../src/app/invite/[token]/actions.ts',
      '../../src/lib/auth/invite-supabase.ts',
    ]) {
      expect(exists(path)).toBe(false)
    }
  })

  it('restores slate-white sidebar wordmark color with Squeeze-like condensed display', () => {
    const sidebar = read('../../src/components/sidebar.tsx')
    const css = read('../../src/app/globals.css')
    expect(sidebar).toContain('data-keychats-wordmark')
    expect(sidebar).toContain('data-sidebar-logout')
    expect(css).toContain('[data-sidebar-root] [data-keychats-wordmark]')
    expect(css).toContain('color: #f8fafc !important')
    expect(css).toContain('transform: scaleX(0.82)')
  })
})
