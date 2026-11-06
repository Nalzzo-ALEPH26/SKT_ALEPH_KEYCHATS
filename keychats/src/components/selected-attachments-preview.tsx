'use client'

import { useEffect, useRef, useState, type MouseEvent } from 'react'

type Props = {
  files: File[]
  disabled: boolean
  onRemove: (index: number) => void
  onClear: () => void
}

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function SelectedFileTile({
  file,
  index,
  disabled,
  onRemove,
}: {
  file: File
  index: number
  disabled: boolean
  onRemove: (index: number) => void
}) {
  const image = file.type.startsWith('image/')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const previewButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!image) return
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file, image])

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target !== event.currentTarget) return
    const bounds = event.currentTarget.getBoundingClientRect()
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
      dialogRef.current?.close()
    }
  }

  return (
    <div data-selected-attachment={index} className="relative min-w-0 rounded-lg border border-zinc-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-800">
      {image ? (
        <button
          ref={previewButtonRef}
          type="button"
          aria-label={`${file.name} 미리보기`}
          disabled={!previewUrl}
          onClick={() => dialogRef.current?.showModal()}
          className="flex aspect-[4/3] w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-md bg-zinc-100 text-xs text-zinc-500 dark:bg-zinc-700 dark:text-zinc-300"
        >
          {previewUrl ? <img src={previewUrl} alt={file.name} className="h-full w-full object-contain" /> : '이미지 준비 중'}
        </button>
      ) : (
        <div aria-hidden="true" className="flex aspect-[4/3] w-full items-center justify-center rounded-md bg-zinc-100 text-sm font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200">
          {file.name.includes('.') ? file.name.split('.').at(-1)?.toUpperCase() : '파일'}
        </div>
      )}
      <div className="mt-1 min-w-0 pr-6">
        <p className="truncate text-xs font-medium" title={file.name}>{file.name}</p>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{fileSize(file.size)}</p>
      </div>
      <button
        type="button"
        data-remove-selected-attachment={index}
        aria-label={`${file.name} 첨부 취소`}
        disabled={disabled}
        onClick={() => onRemove(index)}
        className="absolute right-1.5 top-1.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-950/80 text-lg text-white shadow-sm hover:bg-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-40"
      >
        ×
      </button>
      {image ? (
        <dialog
          ref={dialogRef}
          onClick={handleBackdropClick}
          onClose={() => previewButtonRef.current?.focus({ preventScroll: true })}
          className="fixed inset-0 m-auto w-[min(96vw,70rem)] max-h-[94dvh] max-w-none overflow-hidden rounded-2xl border border-white/20 bg-zinc-950 p-3 text-white shadow-2xl backdrop:bg-black/80"
          aria-label={`${file.name} 전송 전 이미지 미리보기`}
        >
          <div className="flex min-h-0 flex-col gap-3">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <span className="min-w-0 truncate text-sm" title={file.name}>{file.name}</span>
              <button type="button" onClick={() => dialogRef.current?.close()} className="shrink-0 rounded-lg border border-white/30 px-3 py-2 text-sm hover:bg-white/15">닫기</button>
            </div>
            {previewUrl ? <img src={previewUrl} alt={file.name} className="mx-auto block max-h-[calc(94dvh-7rem)] max-w-full object-contain" /> : null}
          </div>
        </dialog>
      ) : null}
    </div>
  )
}

/** Local previews only: images are never uploaded until the user presses Send. */
export function SelectedAttachmentsPreview({ files, disabled, onRemove, onClear }: Props) {
  if (files.length === 0) return null

  return (
    <div data-selected-attachments className="mb-2 max-h-60 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold">첨부파일 {files.length}개 선택됨</p>
        <button type="button" data-clear-selected-attachments disabled={disabled} onClick={onClear} className="shrink-0 rounded-md px-2 py-1 text-xs font-medium underline underline-offset-2 hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10">
          모두 취소
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {files.map((file, index) => (
          <SelectedFileTile key={`${file.name}-${file.size}-${file.lastModified}-${index}`} file={file} index={index} disabled={disabled} onRemove={onRemove} />
        ))}
      </div>
    </div>
  )
}
