import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

describe('password reset, DM read receipts and browser notifications', () => {
  it('adds an admin-mediated temporary password flow without plaintext storage', () => {
    const migration = source('../../supabase/migrations/20261028120000_password_reset_requests.sql')
    const crypto = source('../../src/lib/password-reset/crypto.ts')
    const service = source('../../src/lib/password-reset/service.ts')
    const login = source('../../src/components/login-form.tsx')
    expect(migration).toContain('encrypted_password text')
    expect(migration).not.toContain('temporary_password text')
    expect(crypto).toContain("createCipheriv('aes-256-gcm'")
    expect(service).toContain('issuePasswordReset')
    expect(login).toContain('/forgot-password')
  })

  it('keeps legacy background DM auto-read disabled and uses a visible-only receipt controller', () => {
    const actions = source('../../src/app/(workspace)/message-state-actions.ts')
    const receipt = source('../../src/components/dm-read-receipt.tsx')
    expect(actions).toContain('if (input.dmThreadId) return')
    expect(actions).toContain('markDmConversationReadVisibleAction')
    expect(receipt).toContain("document.visibilityState !== 'visible' || !document.hasFocus()")
    expect(receipt).toContain("table: 'read_states'")
    expect(receipt).toContain("marker.textContent = '1'")
  })

  it('offers browser notification permission and emits background message notifications', () => {
    const setting = source('../../src/components/browser-notification-setting.tsx')
    const listener = source('../../src/components/browser-message-notifications.tsx')
    const layout = source('../../src/app/layout.tsx')
    expect(setting).toContain('Notification.requestPermission()')
    expect(listener).toContain('new Notification(')
    expect(listener).toContain("document.visibilityState === 'visible' && document.hasFocus()")
    expect(layout).toContain('<BrowserMessageNotifications />')
  })
})
