'use client'

import { useEffect, useState, type ReactNode } from 'react'

// This is a visual deterrent only; browsers cannot reliably detect undocked DevTools.
export function isLikelyDevtoolsDocked(size: {
  outerWidth: number; innerWidth: number; outerHeight: number; innerHeight: number
}) {
  return size.outerWidth - size.innerWidth > 190 || size.outerHeight - size.innerHeight > 260
}

export function DevtoolsGate({ exempt, children }: { exempt: boolean; children: ReactNode }) {
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    if (exempt) return
    // Screen width stays stable when a docked DevTools pane shrinks the viewport.
    // Checking the *inner* width here misses DevTools opened on a 768px+ desktop.
    const desktop = window.screen.width >= 768 && (typeof window.matchMedia !== 'function' || window.matchMedia('(hover: hover) and (pointer: fine)').matches)
    const check = () => setBlocked(desktop && isLikelyDevtoolsDocked(window))
    const onShortcut = (event: KeyboardEvent) => {
      if (!desktop) return
      const inspector = event.key === 'F12' || (event.ctrlKey && event.shiftKey && ['i', 'j', 'c'].includes(event.key.toLowerCase())) || (event.metaKey && event.altKey && ['i', 'j', 'c'].includes(event.key.toLowerCase()))
      if (inspector) {
        event.preventDefault()
        event.stopImmediatePropagation()
        check()
      }
    }
    check()
    window.addEventListener('keydown', onShortcut, true)
    window.addEventListener('resize', check)
    window.addEventListener('focus', check)
    const timer = window.setInterval(check, 650)
    return () => {
      window.removeEventListener('keydown', onShortcut, true)
      window.removeEventListener('resize', check)
      window.removeEventListener('focus', check)
      window.clearInterval(timer)
    }
  }, [exempt])

  if (!exempt && blocked) {
    return (
      <div data-devtools-warning role="alert" className="flex min-h-dvh items-center justify-center bg-[#111111] px-6 text-center text-white">
        <div>
          <h1 className="text-lg font-semibold">개발자 도구를 닫고 이용해 주세요.</h1>
          <p className="mt-3 text-sm text-white/65">개발자 도구를 닫으면 KEYCHATS 화면이 다시 나타납니다.</p>
        </div>
      </div>
    )
  }
  return <>{children}</>
}
