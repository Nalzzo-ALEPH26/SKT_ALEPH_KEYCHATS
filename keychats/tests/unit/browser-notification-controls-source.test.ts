import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

describe('per-room browser notifications and admin alerts', () => {
  it('uses per-room persisted preferences with channel off and DM on defaults', () => {
    const listener = source('../../src/components/browser-message-notifications.tsx')
    const sidebar = source('../../src/components/sidebar.tsx')

    expect(listener).toContain("from('browser_notification_preferences')")
    expect(listener).toContain('isRoomBrowserNotificationEnabled')
    expect(sidebar).toContain('RoomNotificationToggle')
    expect(sidebar).toContain("roomType=\"channel\"")
    expect(sidebar).toContain("roomType=\"dm\"")
  })

  it('subscribes admins to minimal realtime request events and refreshes the authoritative badge', () => {
    const listener = source('../../src/components/browser-message-notifications.tsx')
    const shell = source('../../src/components/app-shell.tsx')
    const sidebar = source('../../src/components/sidebar.tsx')
    const layout = source('../../src/app/(workspace)/layout.tsx')

    expect(listener).toContain("table: 'admin_notification_events'")
    expect(listener).toContain('ADMIN_PENDING_CHANGED_EVENT')
    expect(shell).toContain('getAdminPendingCountAction')
    expect(sidebar).toContain('adminPendingCount')
    expect(layout).toContain('loadAdminPendingCount')
  })

  it('records request events only after real signup and password-reset requests are persisted', () => {
    const signup = source('../../src/app/signup/actions.ts')
    const reset = source('../../src/lib/password-reset/service.ts')

    expect(signup).toContain("recordAdminNotificationEvent(admin, 'signup_request'")
    expect(reset).toContain("recordAdminNotificationEvent(admin, 'password_reset'")
  })
})

describe('background tab attention', () => {
  it('keeps a large red favicon dot visible while the title blinks, then clears when Keychats becomes visible again', () => {
    const listener = source('../../src/components/browser-message-notifications.tsx')
    const attention = source('../../src/lib/notifications/tab-attention.ts')

    expect(listener).toContain('createTabAttentionController')
    expect(listener).toContain('attention.alert()')
    expect(listener).toContain("document.addEventListener('visibilitychange'")
    expect(attention).toContain('document.title')
    expect(attention).toContain("querySelector<HTMLLinkElement>('link[rel~=\"icon\"]')")
    expect(attention).toContain('<circle cx="32" cy="32" r="30" fill="#ff2d20"/>')
    expect(attention).toContain('🔴 ${unreadCount} 새 메시지 · KEYCHATS')
    expect(attention).toContain('icon!.href = ALERT_FAVICON')
    expect(attention).toContain('setInterval')
    expect(attention).toContain('const clear = () =>')
  })
})
