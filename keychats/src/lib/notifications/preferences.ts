export type NotificationRoomType = 'channel' | 'dm'

export type BrowserNotificationPreferenceRow = {
  room_type: NotificationRoomType
  room_id: string
  enabled: boolean
}

export type BrowserNotificationPreferenceMap = Record<string, boolean>

export const NOTIFICATION_PREFERENCE_CHANGED_EVENT = 'keychats:notification-preference-changed'
export const ADMIN_PENDING_CHANGED_EVENT = 'keychats:admin-pending-changed'

export function notificationPreferenceKey(roomType: NotificationRoomType, roomId: string) {
  return `${roomType}:${roomId}`
}

export function defaultRoomNotificationEnabled(roomType: NotificationRoomType) {
  return roomType === 'dm'
}

export function toBrowserNotificationPreferenceMap(rows: BrowserNotificationPreferenceRow[]) {
  return Object.fromEntries(
    rows.map((row) => [notificationPreferenceKey(row.room_type, row.room_id), Boolean(row.enabled)]),
  ) as BrowserNotificationPreferenceMap
}

export function isRoomBrowserNotificationEnabled(
  roomType: NotificationRoomType,
  roomId: string,
  preferences: BrowserNotificationPreferenceMap,
) {
  const key = notificationPreferenceKey(roomType, roomId)
  return Object.prototype.hasOwnProperty.call(preferences, key)
    ? preferences[key]
    : defaultRoomNotificationEnabled(roomType)
}
