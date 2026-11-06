'use client'

import { useId, useRef, useState, type MouseEvent } from 'react'

type MessageImageLightboxProps = {
  href: string
  originalName: string
}

/** Preview an existing authenticated message attachment without navigating away. */
export function MessageImageLightbox({ href, originalName }: MessageImageLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const [previewOpen, setPreviewOpen] = useState(false)

  const openPreview = () => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    setPreviewOpen(true)
    dialog.showModal()
  }

  const closePreview = () => dialogRef.current?.close()

  const handleOutsideClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target !== event.currentTarget) return
    const rect = event.currentTarget.getBoundingClientRect()
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      closePreview()
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openPreview}
        aria-label={`${originalName} 이미지 확대`}
        className="block w-fit max-w-full cursor-zoom-in rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
      >
        <img
          src={href}
          alt={originalName}
          loading="lazy"
          className="max-h-80 max-w-full rounded-xl border border-black/10 object-contain dark:border-white/10"
        />
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClick={handleOutsideClick}
        onClose={() => {
          setPreviewOpen(false)
          triggerRef.current?.focus({ preventScroll: true })
        }}
        className="fixed inset-0 m-auto w-[min(96vw,72rem)] max-h-[94dvh] max-w-none overflow-hidden rounded-2xl border border-white/20 bg-zinc-950 p-3 text-white shadow-2xl backdrop:bg-black/80 sm:p-5"
      >
        <div className="flex min-h-0 flex-col gap-3">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <h2 id={titleId} className="min-w-0 truncate text-sm font-medium" title={originalName}>{originalName}</h2>
            <div className="flex shrink-0 items-center gap-2">
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg px-2 py-1 text-xs text-zinc-200 underline underline-offset-2 hover:text-white"
              >
                원본 보기
              </a>
              <button
                type="button"
                autoFocus
                onClick={closePreview}
                aria-label="이미지 확대 닫기"
                className="rounded-lg border border-white/30 px-3 py-1.5 text-sm hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
              >
                닫기
              </button>
            </div>
          </div>
          <div className="flex min-h-0 items-center justify-center overflow-auto">
            {previewOpen ? (
              <img
                src={href}
                alt={originalName}
                className="block max-h-[calc(94dvh-8rem)] max-w-full object-contain"
              />
            ) : null}
          </div>
        </div>
      </dialog>
    </>
  )
}
