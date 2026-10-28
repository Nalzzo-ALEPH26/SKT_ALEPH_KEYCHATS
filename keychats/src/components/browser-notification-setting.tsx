'use client'

import { useEffect, useState } from 'react'

type PermissionState = NotificationPermission | 'unsupported'

export function BrowserNotificationSetting() {
  const [permission, setPermission] = useState<PermissionState>('default')

  useEffect(() => {
    setPermission(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)
  }, [])

  const requestPermission = async () => {
    if (typeof Notification === 'undefined') {
      setPermission('unsupported')
      return
    }
    const next = await Notification.requestPermission()
    setPermission(next)
  }

  const label = permission === 'granted'
    ? '알림 허용됨'
    : permission === 'denied'
      ? '브라우저에서 알림이 차단되어 있습니다.'
      : permission === 'unsupported'
        ? '이 브라우저는 데스크톱 알림을 지원하지 않습니다.'
        : '다른 탭을 보고 있을 때 Keychats 탭이 강조됩니다. Windows 알림도 함께 받으려면 브라우저 알림을 허용하세요.'

  return (
    <div>
      <p className="text-sm opacity-55">{label}</p>
      {permission === 'default' ? (
        <button type="button" onClick={requestPermission} className="mt-4 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-black">
          Windows 알림도 허용
        </button>
      ) : null}
      {permission === 'denied' ? (
        <p className="mt-3 text-xs opacity-50">주소창의 사이트 설정에서 알림 권한을 허용한 뒤 새로고침하세요.</p>
      ) : null}
    </div>
  )
}
