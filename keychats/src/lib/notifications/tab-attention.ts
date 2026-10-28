export type TabAttentionController = {
  alert: () => void
  clear: () => void
  dispose: () => void
}

const ALERT_FAVICON = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#243b8f"/>
  <circle cx="47" cy="17" r="12" fill="#ff3b30"/>
</svg>`)}`

export function createTabAttentionController(document: Document): TabAttentionController {
  let unreadCount = 0
  let intervalId: ReturnType<typeof setInterval> | null = null
  let showAlertState = true
  const originalTitle = document.title
  let icon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
  const createdIcon = !icon
  if (!icon) {
    icon = document.createElement('link')
    icon.rel = 'icon'
    document.head.appendChild(icon)
  }
  const originalIconHref = icon.href

  const render = () => {
    if (createdIcon && !icon?.isConnected) document.head.appendChild(icon!)
    if (unreadCount <= 0) {
      document.title = originalTitle
      icon!.href = originalIconHref
      return
    }

    document.title = showAlertState
      ? `(${unreadCount}) 새 메시지 · KEYCHATS`
      : originalTitle
    icon!.href = showAlertState ? ALERT_FAVICON : originalIconHref
  }

  const clear = () => {
    unreadCount = 0
    showAlertState = true
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    document.title = originalTitle
    if (createdIcon) icon?.remove()
    else if (icon) icon.href = originalIconHref
  }

  const alert = () => {
    unreadCount += 1
    showAlertState = true
    render()
    if (!intervalId) {
      intervalId = setInterval(() => {
        showAlertState = !showAlertState
        render()
      }, 900)
    }
  }

  return {
    alert,
    clear,
    dispose: clear,
  }
}
