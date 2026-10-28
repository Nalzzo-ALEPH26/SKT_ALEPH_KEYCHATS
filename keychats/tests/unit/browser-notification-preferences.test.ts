import { describe, expect, it } from 'vitest'

import {
  defaultRoomNotificationEnabled,
  isRoomBrowserNotificationEnabled,
  notificationPreferenceKey,
  toBrowserNotificationPreferenceMap,
} from '../../src/lib/notifications/preferences'

describe('browser notification room preferences', () => {
  it('defaults channels off and direct messages on', () => {
    expect(defaultRoomNotificationEnabled('channel')).toBe(false)
    expect(defaultRoomNotificationEnabled('dm')).toBe(true)
  })

  it('uses an explicit room override before the room-type default', () => {
    const preferences = toBrowserNotificationPreferenceMap([
      { room_type: 'channel', room_id: 'channel-1', enabled: true },
      { room_type: 'dm', room_id: 'dm-1', enabled: false },
    ])

    expect(isRoomBrowserNotificationEnabled('channel', 'channel-1', preferences)).toBe(true)
    expect(isRoomBrowserNotificationEnabled('channel', 'channel-2', preferences)).toBe(false)
    expect(isRoomBrowserNotificationEnabled('dm', 'dm-1', preferences)).toBe(false)
    expect(isRoomBrowserNotificationEnabled('dm', 'dm-2', preferences)).toBe(true)
    expect(notificationPreferenceKey('dm', 'dm-1')).toBe('dm:dm-1')
  })
})
