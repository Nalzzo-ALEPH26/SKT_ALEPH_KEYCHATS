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
    const check = () => {
      const desktop = typeof window.matchMedia === 'function'
        ? window.matchMedia('(min-width: 768px)').matches
        : window.innerWidth >= 768
      setBlocked(desktop && isLikelyDevtoolsDocked(window))
    }
    check()
    window.addEventListener('resize', check)
    window.addEventListener('focus', check)
    const timer = window.setInterval(check, 650)
    return () => {
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
