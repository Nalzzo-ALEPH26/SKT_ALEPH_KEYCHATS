'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

type RenameResult = { ok: true; name: string } | { ok: false; error: string }

type Props = {
  channelId: string
  channelName: string
  action: (formData: FormData) => Promise<RenameResult>
}

const ERROR_MESSAGES: Record<string, string> = {
  CHANNEL_NAME_INVALID: '채널 이름은 1~80자로 입력해 주세요.',
  CHANNEL_NAME_RESERVED: 'general은 기본 채널 이름으로 예약되어 있습니다.',
  CHANNEL_NAME_TAKEN: '이미 사용 중인 채널 이름입니다.',
  CHANNEL_MANAGE_FORBIDDEN: '채널 이름을 변경할 권한이 없습니다.',
  DEFAULT_CHANNEL_RENAME_FORBIDDEN: '기본 채널 이름은 변경할 수 없습니다.',
  CHANNEL_NOT_FOUND: '채널을 찾을 수 없습니다.',
}

export function ChannelRenameControl({ channelId, channelName, action }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(channelName)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function cancel() {
    if (busy) return
    setName(channelName)
    setError('')
    setEditing(false)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const formData = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      const result = await action(formData)
      if (!result.ok) {
        setError(ERROR_MESSAGES[result.error] ?? '채널 이름을 변경하지 못했습니다.')
        return
      }
      setEditing(false)
      router.refresh()
    } catch {
      setError('채널 이름을 변경하지 못했습니다. 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        aria-label="채널 이름 변경"
        onClick={() => { setName(channelName); setError(''); setEditing(true) }}
        className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-medium hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-zinc-700 dark:hover:bg-white/5"
      >
        이름 변경
      </button>
    )
  }

  return (
    <form onSubmit={submit} data-channel-rename-form className="flex w-full max-w-md flex-wrap items-center gap-2">
      <input type="hidden" name="channelId" value={channelId} />
      <label className="min-w-0 flex-1 text-sm">
        <span className="sr-only">새 채널 이름</span>
        <input
          name="name"
          aria-label="새 채널 이름"
          autoFocus
          required
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); cancel() } }}
          disabled={busy}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-offset-2 focus-visible:outline-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
        />
      </label>
      <button type="submit" disabled={busy || !name.trim()} className="rounded-lg bg-zinc-950 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-zinc-950">
        {busy ? '저장 중…' : '변경 저장'}
      </button>
      <button type="button" disabled={busy} onClick={cancel} className="rounded-lg border border-zinc-300 px-3 py-2 text-xs dark:border-zinc-700">
        취소
      </button>
      {error ? <p role="alert" className="w-full text-xs text-red-600 dark:text-red-400">{error}</p> : null}
    </form>
  )
}
