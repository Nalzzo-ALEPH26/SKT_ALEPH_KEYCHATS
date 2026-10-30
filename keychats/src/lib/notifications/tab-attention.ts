export type TabAttentionController = {
  alert: () => void
  clear: () => void
  setUnreadCount: (count: number) => void
  dispose: () => void
}

const RED_ALERT_FAVICON = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="30" fill="#ff2d20"/>
</svg>`)}`

const BLACK_ALERT_FAVICON = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="30" fill="#000000"/>
</svg>`)}`

export function createTabAttentionController(document: Document): TabAttentionController {
  let unreadCount = 0
  let intervalId: ReturnType<typeof setInterval> | null = null
  let showAlertState = true
  const originalTitle = document.title
  const originalIcon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
  const originalIconHref =
    originalIcon?.getAttribute('href') || originalIcon?.href || '/chats/keychats-tab-icon.svg'
  const originalIconType = originalIcon?.type || 'image/svg+xml'

  const replaceFavicon = (href: string, type: string, isAlert: boolean) => {
    document
      .querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')
      .forEach((icon) => icon.remove())

    const nextIcon = document.createElement('link')
    nextIcon.rel = 'icon'
    nextIcon.type = type
    nextIcon.href = href
    if (isAlert) nextIcon.setAttribute('data-keychats-alert-icon', 'true')
    document.head.appendChild(nextIcon)
  }

  const restoreDefaultFavicon = () => {
    replaceFavicon(originalIconHref, originalIconType, false)
  }

  const render = () => {
    if (unreadCount <= 0) {
      document.title = originalTitle
      restoreDefaultFavicon()
      return
    }

    document.title = `${unreadCount} 새 메시지 · KEYCHATS`
    replaceFavicon(
      showAlertState ? RED_ALERT_FAVICON : BLACK_ALERT_FAVICON,
      'image/svg+xml',
      true,
    )
  }

  const clear = () => {
    unreadCount = 0
    showAlertState = true
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    document.title = originalTitle
    restoreDefaultFavicon()
  }

  const setUnreadCount = (count: number) => {
    const nextCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
    if (nextCount <= 0) {
      clear()
      return
    }

    unreadCount = nextCount
    showAlertState = true
    render()
    if (!intervalId) {
      intervalId = setInterval(() => {
        showAlertState = !showAlertState
        render()
      }, 900)
    }
  }

  const alert = () => {
    setUnreadCount(unreadCount + 1)
  }

  return {
    alert,
    clear,
    setUnreadCount,
    dispose: clear,
  }
}
