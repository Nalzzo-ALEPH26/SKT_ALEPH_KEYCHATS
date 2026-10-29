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

describe('DM unread tab attention', () => {
  it('alternates a large red and black alert favicon while preserving the default icon until unread reaches zero', () => {
    const listener = source('../../src/components/browser-message-notifications.tsx')
    const attention = source('../../src/lib/notifications/tab-attention.ts')

    expect(listener).toContain('createTabAttentionController')
    expect(listener).toContain("client.rpc('get_unread_counts')")
    expect(listener).toContain("row.room_type === 'dm'")
    expect(listener).toContain('attention.setUnreadCount(dmUnreadCount)')
    expect(listener).toContain("table: 'read_states'")
    expect(listener).toContain("document.addEventListener('visibilitychange'")
    expect(listener).not.toContain('attention.alert()')
    expect(attention).toContain('document.title')
    expect(attention).toContain("const ALERT_ICON_SELECTOR = 'link[data-keychats-alert-icon=\"true\"]'")
    expect(attention).toContain("nextIcon.setAttribute('data-keychats-alert-icon', 'true')")
    expect(attention).toContain('document.head.appendChild(nextIcon)')
    expect(attention).toContain('<circle cx="32" cy="32" r="30" fill="#ff2d20"/>')
    expect(attention).toContain('<circle cx="32" cy="32" r="30" fill="#000000"/>')
    expect(attention).toContain('${unreadCount} 새 메시지 · KEYCHATS')
    expect(attention).not.toContain('🔴 ${unreadCount} 새 메시지 · KEYCHATS')
    expect(attention).toContain('showAlertState ? RED_ALERT_FAVICON : BLACK_ALERT_FAVICON')
    expect(attention).toContain('setInterval')
    expect(attention).toContain('const setUnreadCount = (count: number) =>')
    expect(attention).toContain('const clear = () =>')
    expect(attention).toContain('removeAlertIcon()')
  })
})
