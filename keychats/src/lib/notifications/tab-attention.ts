export type TabAttentionController = {
  alert: () => void
  clear: () => void
  setUnreadCount: (count: number) => void
  dispose: () => void
}

const ALERT_ICON_SELECTOR = 'link[data-keychats-alert-icon="true"]'

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
  let alertIcon: HTMLLinkElement | null = null
  const originalTitle = document.title

  document.querySelector<HTMLLinkElement>(ALERT_ICON_SELECTOR)?.remove()

  const removeAlertIcon = () => {
    alertIcon?.remove()
    alertIcon = null
  }

  const replaceAlertIcon = (href: string) => {
    removeAlertIcon()

    const nextIcon = document.createElement('link')
    nextIcon.rel = 'icon'
    nextIcon.type = 'image/svg+xml'
    nextIcon.href = href
    nextIcon.setAttribute('data-keychats-alert-icon', 'true')
    document.head.appendChild(nextIcon)
    alertIcon = nextIcon
  }

  const render = () => {
    if (unreadCount <= 0) {
      document.title = originalTitle
      removeAlertIcon()
      return
    }

    document.title = `${unreadCount} 새 메시지 · KEYCHATS`
    replaceAlertIcon(showAlertState ? RED_ALERT_FAVICON : BLACK_ALERT_FAVICON)
  }

  const clear = () => {
    unreadCount = 0
    showAlertState = true
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    document.title = originalTitle
    removeAlertIcon()
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
