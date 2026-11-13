'use client'

import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Fragment } from 'react'
import { usePathname } from 'next/navigation'

import {
  createChannelAction,
  joinChannelByCodeAction,
  manageChannelsAction,
} from '@/app/(workspace)/channel/channel-actions'
import {
  createCommunityAction,
  deleteCommunitiesAction,
} from '@/app/(workspace)/community/community-actions'
import {
  manageDirectMessagesAction,
  startDirectMessageAction,
} from '@/app/(workspace)/dm/dm-actions'
import { Avatar } from '@/components/avatar'
import { ChannelDialog } from '@/components/channel-dialog'
import {
  isRoomBrowserNotificationEnabled,
  NOTIFICATION_PREFERENCE_CHANGED_EVENT,
  notificationPreferenceKey,
  toBrowserNotificationPreferenceMap,
  type BrowserNotificationPreferenceMap,
  type BrowserNotificationPreferenceRow,
  type NotificationRoomType,
} from '@/lib/notifications/preferences'
import { isSidebarHrefActive, sortSidebarCommunities, type SidebarCommunity } from '@/lib/sidebar/presentation'
import {
  FAVORITES_STORAGE_PREFIX,
  moveSidebarFavoriteKey,
  readSidebarFavoriteKeys,
  shiftSidebarFavoriteKey,
  sidebarFavoriteKey,
  toggleSidebarFavoriteKey,
  type FavoriteRoomKind,
} from '@/lib/sidebar/favorites'
import type { KeychatsTheme } from '@/lib/settings/theme'
import { createClient } from '@/lib/supabase/client'
import { logoutAction } from '@/app/(workspace)/logout-action'

type ChannelItem = {
  id: string
  name: string
  unreadCount: number
  canLeave?: boolean
  canDelete?: boolean
}

type DirectItem = {
  id: string
  displayName: string
  unreadCount: number
}

type DirectCandidate = {
  userId: string
  displayName: string
}

type ChannelProfile = {
  userId: string
  displayName: string
  username: string
}

type CommunityItem = SidebarCommunity

type FavoriteRoomEntry =
  | { key: string; kind: 'channel'; channel: ChannelItem }
  | { key: string; kind: 'dm'; direct: DirectItem }

type SidebarProps = {
  profile: {
    displayName: string
    avatarPath: string | null
  }
  currentUserId?: string
  channelProfiles?: ChannelProfile[]
  channels: ChannelItem[]
  directMessages: DirectItem[]
  directCandidates?: DirectCandidate[]
  communities?: CommunityItem[]
  theme?: KeychatsTheme
  isAdmin?: boolean
  isModerator?: boolean
  adminPendingCount?: number
  unreadRealtimeStatus?: string
}

type ViewportPopoverProps = {
  label: ReactNode
  marker: string
  width?: number
  children: ReactNode
  ariaLabel?: string
  triggerClassName?: string
}

function ViewportPopover({
  label,
  marker,
  width = 256,
  children,
  ariaLabel,
  triggerClassName = '',
}: ViewportPopoverProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ left: 8, top: 8 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!open) return

    const updatePosition = () => {
      const trigger = triggerRef.current
      if (!trigger) return

      const rect = trigger.getBoundingClientRect()
      const edge = 8
      const gap = 8
      const maxWidth = Math.min(width, window.innerWidth - edge * 2)
      let left = rect.right + gap

      if (left + maxWidth > window.innerWidth - edge) left = rect.left - maxWidth - gap
      if (left < edge) {
        left = Math.min(
          Math.max(edge, rect.left),
          Math.max(edge, window.innerWidth - maxWidth - edge),
        )
      }

      // Use the rendered panel height: community management can exceed 420px.
      const panelHeight = panelRef.current?.getBoundingClientRect().height ?? 0
      const top = Math.min(
        Math.max(edge, rect.top),
        Math.max(edge, window.innerHeight - panelHeight - edge),
      )
      setPosition({ left, top })
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, width])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-sidebar-popover-trigger={marker}
        data-popover-layout="viewport-safe"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={triggerClassName}
      >
        {label}
      </button>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={panelRef}
              data-sidebar-popover={marker}
              data-popover-layout="viewport-safe"
              className="fixed z-[90] max-h-[calc(100vh-16px)] overflow-y-auto rounded-xl border border-[#fff0c9]/20 bg-[#243b8f] p-3 text-left text-[#fff0c9] shadow-xl"
              style={{ left: position.left, top: position.top, width: Math.min(width, window.innerWidth - 16) }}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

type SelectionFormItem = {
  id: string
  label: string
}

type SelectionFormProps = {
  action: (formData: FormData) => void | Promise<void>
  items: SelectionFormItem[]
  fieldName: string
  title: string
  submitLabel: string
  operation?: 'leave' | 'delete' | 'pin' | 'unpin'
  destructive?: boolean
  rowKind?: 'dm' | 'channel' | 'community'
  className?: string
}

function SelectionForm({
  action,
  items,
  fieldName,
  title,
  submitLabel,
  operation,
  destructive = false,
  rowKind,
  className = '',
}: SelectionFormProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (selectedIds.size === 0) event.preventDefault()
  }

  const setSelected = (id: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  return (
    <form action={action} onSubmit={onSubmit} className={`space-y-2 ${className}`}>
      {operation ? <input type="hidden" name="operation" value={operation} /> : null}
      <p className="text-xs font-semibold tracking-normal">{title}</p>
      <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
        {items.map((entry) => {
          const selected = selectedIds.has(entry.id)
          return (
            <label
              key={entry.id}
              data-dm-management-row={rowKind === 'dm' ? 'true' : undefined}
              data-channel-management-row={rowKind === 'channel' ? 'true' : undefined}
              data-community-management-row={rowKind === 'community' ? 'true' : undefined}
              data-selected={selected ? 'true' : 'false'}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-2 text-xs font-normal tracking-normal transition ${
                selected
                  ? 'border-[#fff0c9]/50 bg-[#fff0c9] text-[#243b8f]'
                  : 'border-transparent text-[#fff0c9]/80 hover:bg-[#fff0c9]/10'
              }`}
            >
              <input
                type="checkbox"
                name={fieldName}
                value={entry.id}
                checked={selected}
                onChange={(event) => setSelected(entry.id, event.target.checked)}
              />
              <span className="min-w-0 truncate">{entry.label}</span>
            </label>
          )
        })}
      </div>
      <button
        type="submit"
        disabled={selectedIds.size === 0}
        className={`w-full rounded-lg border px-2 py-1.5 text-xs font-semibold tracking-normal disabled:cursor-not-allowed disabled:opacity-40 ${
          destructive
            ? 'border-red-300/50 text-red-200 hover:bg-red-500/10'
            : 'border-[#fff0c9]/25 text-[#fff0c9] hover:bg-[#fff0c9]/10'
        }`}
      >
        {submitLabel}
      </button>
    </form>
  )
}

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span
      data-unread-badge
      className="min-w-5 rounded-full bg-[#fff0c9] px-1.5 py-0.5 text-center text-xs font-semibold text-[#243b8f]"
    >
      {count}
    </span>
  )
}

function RoomNotificationToggle({
  roomType,
  roomId,
  enabled,
  onToggle,
}: {
  roomType: NotificationRoomType
  roomId: string
  enabled: boolean
  onToggle: (roomType: NotificationRoomType, roomId: string) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const label = enabled ? '브라우저 알림 끄기' : '브라우저 알림 켜기'

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-room-notification={enabled ? 'on' : 'off'}
      disabled={busy}
      onClick={() => {
        setBusy(true)
        void onToggle(roomType, roomId).finally(() => setBusy(false))
      }}
      className="shrink-0 rounded-md p-1.5 text-[#fff0c9]/55 transition hover:bg-[#fff0c9]/10 hover:text-[#fff0c9] disabled:opacity-40"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
        <path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 5 2 5.5 2 5.5h-15s2-.5 2-5.5Z" />
        <path d="M10 18h4" />
        {!enabled ? <path d="m4 4 16 16" /> : null}
      </svg>
    </button>
  )
}

export function Sidebar({
  profile,
  currentUserId = '',
  channelProfiles = [],
  channels,
  directMessages,
  directCandidates = [],
  communities = [],
  theme: _theme = 'light',
  isAdmin = false,
  isModerator = false,
  adminPendingCount = 0,
  unreadRealtimeStatus = 'connecting',
}: SidebarProps) {
  const pathname = usePathname()
  const [notificationPreferences, setNotificationPreferences] = useState<BrowserNotificationPreferenceMap>({})
  const [favoriteKeys, setFavoriteKeys] = useState<string[]>([])
  const [favoritesLoadedFor, setFavoritesLoadedFor] = useState<string | null>(null)
  const [draggingFavorite, setDraggingFavorite] = useState<string | null>(null)

  // localStorage is read after hydration. The user ID prevents sharing settings
  // between accounts on the same browser. Storage events sync open tabs.
  useEffect(() => {
    const storageKey = `${FAVORITES_STORAGE_PREFIX}${currentUserId}`
    if (!currentUserId) {
      setFavoriteKeys([])
      setFavoritesLoadedFor(null)
      return
    }
    try {
      setFavoriteKeys(readSidebarFavoriteKeys(window.localStorage.getItem(storageKey)))
    } catch {
      setFavoriteKeys([])
    }
    setFavoritesLoadedFor(currentUserId)

    const handleStorage = (event: StorageEvent) => {
      if (event.key === storageKey) setFavoriteKeys(readSidebarFavoriteKeys(event.newValue))
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [currentUserId])

  useEffect(() => {
    if (!currentUserId || favoritesLoadedFor !== currentUserId) return
    try {
      window.localStorage.setItem(`${FAVORITES_STORAGE_PREFIX}${currentUserId}`, JSON.stringify(favoriteKeys))
    } catch {
      // Full or unavailable browser storage should not break chat navigation.
    }
  }, [currentUserId, favoriteKeys, favoritesLoadedFor])

  const toggleFavorite = (kind: FavoriteRoomKind, id: string) => {
    setFavoriteKeys((keys) => toggleSidebarFavoriteKey(keys, sidebarFavoriteKey(kind, id)))
  }
  const favoriteSet = new Set(favoriteKeys)
  const favorites: FavoriteRoomEntry[] = favoriteKeys.flatMap<FavoriteRoomEntry>((key) => {
    if (key.startsWith('channel:')) {
      const channel = channels.find((item) => item.id === key.slice('channel:'.length))
      return channel ? [{ key, kind: 'channel' as const, channel }] : []
    }
    if (key.startsWith('dm:')) {
      const direct = directMessages.find((item) => item.id === key.slice('dm:'.length))
      return direct ? [{ key, kind: 'dm' as const, direct }] : []
    }
    return []
  })

  useEffect(() => {
    if (!currentUserId) return
    const client = createClient()
    let active = true
    void client
      .from('browser_notification_preferences')
      .select('room_type,room_id,enabled')
      .eq('user_id', currentUserId)
      .then(({ data }) => {
        if (!active) return
        setNotificationPreferences(
          toBrowserNotificationPreferenceMap((data ?? []) as BrowserNotificationPreferenceRow[]),
        )
      })
    return () => {
      active = false
    }
  }, [currentUserId])

  async function toggleRoomNotification(roomType: NotificationRoomType, roomId: string) {
    if (!currentUserId) return
    const key = notificationPreferenceKey(roomType, roomId)
    const current = isRoomBrowserNotificationEnabled(roomType, roomId, notificationPreferences)
    const enabled = !current
    setNotificationPreferences((preferences) => ({ ...preferences, [key]: enabled }))

    const client = createClient()
    const { error } = await client.from('browser_notification_preferences').upsert({
      user_id: currentUserId,
      room_type: roomType,
      room_id: roomId,
      enabled,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,room_type,room_id' })

    if (error) {
      setNotificationPreferences((preferences) => ({ ...preferences, [key]: current }))
      return
    }

    window.dispatchEvent(new CustomEvent(NOTIFICATION_PREFERENCE_CHANGED_EVENT, {
      detail: { roomType, roomId, enabled },
    }))
  }

  const muted = 'text-[#fff0c9]/50'
  const item = 'text-[#fff0c9]/80 hover:bg-[#fff0c9]/10 hover:text-[#fff0c9]'
  const activeItem = 'bg-[#1d327a] text-[#fff0c9] font-semibold shadow-sm'
  const smallControl = 'rounded-md px-1.5 py-1 text-[11px] tracking-normal text-[#fff0c9]/65 hover:bg-[#fff0c9]/10 hover:text-[#fff0c9]'
  const manageableLeaveChannels = channels.filter((channel) => channel.canLeave)
  const manageableDeleteChannels = channels.filter((channel) => channel.canDelete)
  const orderedCommunities = sortSidebarCommunities(communities)
  const pinnedCommunities = orderedCommunities.filter((community) => Boolean(community.pinnedAt))
  const linkClass = (href: string) =>
    `block rounded-lg px-2.5 py-2 text-sm transition ${isSidebarHrefActive(pathname, href) ? activeItem : item}`
  const rowLinkClass = (href: string) =>
    `flex min-w-0 flex-1 items-center justify-between rounded-lg px-2.5 py-2 text-sm transition ${isSidebarHrefActive(pathname, href) ? activeItem : item}`

  return (
    <aside
      data-sidebar-root
      data-unread-realtime-status={unreadRealtimeStatus}
      className="flex h-full w-full flex-col border-r border-[#fff0c9]/20 bg-[#243b8f] p-4 text-[#fff0c9] md:w-72"
    >
      <div className="flex items-center">
        <span data-keychats-wordmark className="min-w-0 flex-1 whitespace-nowrap text-[#f8fafc]">
          KEYCHATS
        </span>
        <form action={logoutAction} className="ml-auto shrink-0">
          <button type="submit" data-sidebar-logout aria-label="로그아웃" className="rounded-md border border-[#fff0c9]/25 px-2 py-1 text-[11px] font-semibold tracking-normal text-[#fff0c9] hover:bg-[#fff0c9]/15">로그아웃</button>
        </form>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto">
        {favorites.length > 0 ? (
          <section data-sidebar-favorites>
            <div className={`mb-2 flex items-center justify-between px-2 text-xs font-semibold tracking-[0.14em] ${muted}`}>
              <span>FAVORITES</span>
              <span className="text-[10px] font-normal tracking-normal">드래그로 정렬</span>
            </div>
            <div className="space-y-1">
              {favorites.map((room, index) => {
                const isChannel = room.kind === 'channel'
                const href = isChannel ? `/channel/${room.channel.id}` : `/dm/${room.direct.id}`
                const name = isChannel ? room.channel.name : room.direct.displayName
                const count = isChannel ? room.channel.unreadCount : room.direct.unreadCount
                const favoriteName = `${isChannel ? '채널' : 'DM'} ${name}`
                return (
                  <div
                    key={room.key}
                    data-sidebar-favorite={room.key}
                    draggable={favorites.length > 1}
                    onDragStart={(event) => {
                      setDraggingFavorite(room.key)
                      event.dataTransfer.effectAllowed = 'move'
                      event.dataTransfer.setData('text/plain', room.key)
                    }}
                    onDragOver={(event) => {
                      if (draggingFavorite) {
                        event.preventDefault()
                        event.dataTransfer.dropEffect = 'move'
                      }
                    }}
                    onDrop={(event) => {
                      if (!draggingFavorite) return
                      event.preventDefault()
                      setFavoriteKeys((keys) => moveSidebarFavoriteKey(keys, draggingFavorite, room.key))
                      setDraggingFavorite(null)
                    }}
                    onDragEnd={() => setDraggingFavorite(null)}
                    className={`flex min-w-0 items-center gap-0.5 rounded-lg ${draggingFavorite === room.key ? 'opacity-60' : ''}`}
                  >
                    <span aria-hidden="true" title="드래그해 순서 변경" className="shrink-0 cursor-grab select-none text-[11px] text-slate-400">⠿</span>
                    <Link href={href} data-sidebar-active={isSidebarHrefActive(pathname, href) ? 'true' : 'false'} className={rowLinkClass(href)}>
                      <span className="min-w-0 truncate">{isChannel ? '#' : '●'} {name}</span>
                      <UnreadBadge count={count} />
                    </Link>
                    <button type="button" aria-label={`${favoriteName} 즐겨찾기 해제`} onClick={() => toggleFavorite(room.kind, isChannel ? room.channel.id : room.direct.id)} className="shrink-0 rounded p-1 text-blue-400 hover:bg-slate-700" title="즐겨찾기 해제">★</button>
                    <button type="button" aria-label={`${favoriteName} 위로 이동`} disabled={index === 0} onClick={() => setFavoriteKeys((keys) => shiftSidebarFavoriteKey(keys, room.key, -1))} className="shrink-0 rounded p-0.5 text-xs text-slate-400 hover:bg-slate-700 disabled:opacity-30" title="위로 이동">↑</button>
                    <button type="button" aria-label={`${favoriteName} 아래로 이동`} disabled={index === favorites.length - 1} onClick={() => setFavoriteKeys((keys) => shiftSidebarFavoriteKey(keys, room.key, 1))} className="shrink-0 rounded p-0.5 text-xs text-slate-400 hover:bg-slate-700 disabled:opacity-30" title="아래로 이동">↓</button>
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}
        <section>
          <div className={`mb-2 flex items-center justify-between px-2 text-xs font-semibold tracking-[0.14em] ${muted}`}>
            <span>CHANNELS</span>
            <div className="flex items-center gap-1.5">
              {manageableLeaveChannels.length > 0 || manageableDeleteChannels.length > 0 ? (
                <ViewportPopover label="채널 관리" marker="channel-management" width={256} triggerClassName={smallControl}>
                  {manageableLeaveChannels.length > 0 ? (
                    <SelectionForm
                      action={manageChannelsAction}
                      items={manageableLeaveChannels.map((channel) => ({ id: channel.id, label: `#${channel.name}` }))}
                      fieldName="channelIds"
                      title="나갈 채널 선택"
                      submitLabel="선택한 채널 나가기"
                      operation="leave"
                      rowKind="channel"
                    />
                  ) : null}
                  {manageableDeleteChannels.length > 0 ? (
                    <SelectionForm
                      action={manageChannelsAction}
                      items={manageableDeleteChannels.map((channel) => ({ id: channel.id, label: `#${channel.name}` }))}
                      fieldName="channelIds"
                      title="삭제할 채널 선택"
                      submitLabel="선택한 채널 삭제"
                      operation="delete"
                      destructive
                      rowKind="channel"
                      className={manageableLeaveChannels.length > 0 ? 'mt-3 border-t border-[#fff0c9]/20 pt-3' : ''}
                    />
                  ) : null}
                </ViewportPopover>
              ) : null}
              <ChannelDialog variant="sidebar" profiles={channelProfiles} currentUserId={currentUserId} action={createChannelAction} />
            </div>
          </div>
          <div className="space-y-1">
            {channels.map((channel) => {
              const href = `/channel/${channel.id}`
              return (
                <div key={channel.id} className="flex items-center gap-1">
                  <Link href={href} data-sidebar-active={isSidebarHrefActive(pathname, href) ? 'true' : 'false'} className={rowLinkClass(href)}>
                    <span className="min-w-0 truncate">#{channel.name}</span>
                    <UnreadBadge count={channel.unreadCount} />
                  </Link>
                  <button
                    type="button"
                    data-favorite-toggle={`channel:${channel.id}`}
                    aria-pressed={favoriteSet.has(sidebarFavoriteKey('channel', channel.id))}
                    aria-label={`${channel.name} 채널 즐겨찾기 ${favoriteSet.has(sidebarFavoriteKey('channel', channel.id)) ? '해제' : '추가'}`}
                    title={favoriteSet.has(sidebarFavoriteKey('channel', channel.id)) ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                    onClick={() => toggleFavorite('channel', channel.id)}
                    className={`shrink-0 rounded p-1 text-sm transition hover:bg-slate-700 ${favoriteSet.has(sidebarFavoriteKey('channel', channel.id)) ? 'text-blue-400' : 'text-slate-400'}`}
                  >{favoriteSet.has(sidebarFavoriteKey('channel', channel.id)) ? '★' : '☆'}</button>
                  <RoomNotificationToggle
                    roomType="channel"
                    roomId={channel.id}
                    enabled={isRoomBrowserNotificationEnabled('channel', channel.id, notificationPreferences)}
                    onToggle={toggleRoomNotification}
                  />
                </div>
              )
            })}
          </div>
          <form action={joinChannelByCodeAction} className="mt-3 flex gap-1.5 px-2">
            <input
              name="joinCode"
              required
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="100000 · General"
              aria-label="채널 입장 코드"
              className="min-w-0 flex-1 rounded-lg border border-[#fff0c9]/25 bg-[#1d327a] px-2 py-1.5 text-xs text-[#fff0c9] outline-none placeholder:text-[#fff0c9]/35"
            />
            <button type="submit" className="rounded-lg border border-[#fff0c9]/25 px-2 py-1.5 text-xs font-semibold hover:bg-[#fff0c9]/10">
              입장
            </button>
          </form>
        </section>

        <section>
          <div className={`mb-2 flex items-center justify-between px-2 text-xs font-semibold tracking-[0.14em] ${muted}`}>
            <span>DIRECT</span>
            <div className="flex items-center gap-1.5">
              {directMessages.length > 0 ? (
                <ViewportPopover label="DM 관리" marker="dm-management" width={256} triggerClassName={smallControl}>
                  <SelectionForm
                    action={manageDirectMessagesAction}
                    items={directMessages.map((direct) => ({ id: direct.id, label: direct.displayName }))}
                    fieldName="dmThreadIds"
                    title="나갈 DM 선택"
                    submitLabel="선택한 DM 나가기"
                    rowKind="dm"
                  />
                </ViewportPopover>
              ) : null}
              {directCandidates.length > 0 ? (
                <ViewportPopover label="새 DM" marker="new-dm" width={224} triggerClassName={smallControl}>
                  <div className="max-h-72 overflow-y-auto">
                    {directCandidates.map((candidate) => (
                      <form key={candidate.userId} action={startDirectMessageAction}>
                        <input type="hidden" name="otherUserId" value={candidate.userId} />
                        <button type="submit" className={`w-full truncate rounded-lg px-2.5 py-2 text-left text-sm ${item}`}>
                          {candidate.displayName}
                        </button>
                      </form>
                    ))}
                  </div>
                </ViewportPopover>
              ) : null}
            </div>
          </div>
          <div className="space-y-1">
            {directMessages.map((direct) => {
              const href = `/dm/${direct.id}`
              return (
                <div key={direct.id} className="flex items-center gap-1">
                  <Link href={href} data-sidebar-active={isSidebarHrefActive(pathname, href) ? 'true' : 'false'} className={rowLinkClass(href)}>
                    <span className="min-w-0 truncate">{direct.displayName}</span>
                    <UnreadBadge count={direct.unreadCount} />
                  </Link>
                  <button
                    type="button"
                    data-favorite-toggle={`dm:${direct.id}`}
                    aria-pressed={favoriteSet.has(sidebarFavoriteKey('dm', direct.id))}
                    aria-label={`${direct.displayName} DM 즐겨찾기 ${favoriteSet.has(sidebarFavoriteKey('dm', direct.id)) ? '해제' : '추가'}`}
                    title={favoriteSet.has(sidebarFavoriteKey('dm', direct.id)) ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                    onClick={() => toggleFavorite('dm', direct.id)}
                    className={`shrink-0 rounded p-1 text-sm transition hover:bg-slate-700 ${favoriteSet.has(sidebarFavoriteKey('dm', direct.id)) ? 'text-blue-400' : 'text-slate-400'}`}
                  >{favoriteSet.has(sidebarFavoriteKey('dm', direct.id)) ? '★' : '☆'}</button>
                  <RoomNotificationToggle
                    roomType="dm"
                    roomId={direct.id}
                    enabled={isRoomBrowserNotificationEnabled('dm', direct.id, notificationPreferences)}
                    onToggle={toggleRoomNotification}
                  />
                </div>
              )
            })}
          </div>
        </section>

        <section>
          <div className={`mb-2 flex items-center justify-between px-2 text-xs font-semibold tracking-[0.14em] ${muted}`}>
            <span>COMMUNITY</span>
            <div className="flex items-center gap-1.5">
              {(isAdmin || isModerator) && orderedCommunities.length > 0 ? (
                <ViewportPopover label="커뮤니티 관리" marker="community-management" width={280} triggerClassName={smallControl}>
                  <SelectionForm
                    action={deleteCommunitiesAction}
                    items={orderedCommunities.map((community) => ({ id: community.id, label: community.name }))}
                    fieldName="communityIds"
                    title="상단 고정할 커뮤니티 선택"
                    submitLabel="선택한 커뮤니티 상단 고정"
                    operation="pin"
                    rowKind="community"
                  />
                  {pinnedCommunities.length > 0 ? (
                    <SelectionForm
                      action={deleteCommunitiesAction}
                      items={pinnedCommunities.map((community) => ({ id: community.id, label: community.name }))}
                      fieldName="communityIds"
                      title="고정 해제할 커뮤니티 선택"
                      submitLabel="선택한 커뮤니티 고정 해제"
                      operation="unpin"
                      rowKind="community"
                      className="mt-3 border-t border-[#fff0c9]/20 pt-3"
                    />
                  ) : null}
                  <SelectionForm
                    action={deleteCommunitiesAction}
                    items={orderedCommunities.map((community) => ({ id: community.id, label: community.name }))}
                    fieldName="communityIds"
                    title="삭제할 커뮤니티 선택"
                    submitLabel="선택한 커뮤니티 삭제"
                    operation="delete"
                    destructive
                    rowKind="community"
                    className="mt-3 border-t border-[#fff0c9]/20 pt-3"
                  />
                </ViewportPopover>
              ) : null}
              <ViewportPopover
                label="+"
                marker="new-community"
                width={256}
                ariaLabel="커뮤니티 추가"
                triggerClassName="rounded-md px-1.5 text-lg leading-none text-[#fff0c9]/65 hover:bg-[#fff0c9]/10 hover:text-[#fff0c9]"
              >
                <form action={createCommunityAction} className="space-y-3">
                  <label className="block space-y-1 text-xs font-semibold tracking-normal">
                    <span>새 커뮤니티 이름</span>
                    <input
                      name="communityName"
                      required
                      maxLength={40}
                      placeholder="예: 자유게시판"
                      className="w-full rounded-lg border border-[#fff0c9]/25 bg-[#1d327a] px-2.5 py-2 text-sm font-normal text-[#fff0c9] outline-none placeholder:text-[#fff0c9]/35"
                    />
                  </label>
                  <button type="submit" className="w-full rounded-lg border border-[#fff0c9]/25 px-2 py-1.5 text-xs font-semibold tracking-normal hover:bg-[#fff0c9]/10">
                    추가
                  </button>
                </form>
              </ViewportPopover>
            </div>
          </div>
          <div className="space-y-1">
            <Link href="/feedback" data-sidebar-active={isSidebarHrefActive(pathname, '/feedback') ? 'true' : 'false'} className={linkClass('/feedback')}>
              피드백
            </Link>
            {!orderedCommunities.some((community) => community.isNotice) ? <Link href="/showcase" data-sidebar-active={isSidebarHrefActive(pathname, '/showcase') ? 'true' : 'false'} className={linkClass('/showcase')}>만들었어요 🔨</Link> : null}
            {orderedCommunities.map((community) => {
              const href = `/community/${community.id}`
              const active = isSidebarHrefActive(pathname, href)
              return (
                <Fragment key={community.id}><Link href={href} data-sidebar-active={active ? 'true' : 'false'} className={linkClass(href)}>
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="min-w-0 truncate">{community.name}</span>
                      {community.pinnedAt ? (
                        <span data-community-pinned className={`shrink-0 text-[10px] ${active ? 'text-[#fff0c9]/80' : 'text-[#fff0c9]/55'}`}>
                          고정
                        </span>
                      ) : null}
                    </span>
                    <UnreadBadge count={community.unreadCount ?? 0} />
                  </span>
                </Link>
                {community.isNotice ? <Link href="/showcase" data-sidebar-active={isSidebarHrefActive(pathname, '/showcase') ? 'true' : 'false'} className={linkClass('/showcase')}>만들었어요 🔨</Link> : null}
                </Fragment>
              )
            })}
          </div>
        </section>

        {isAdmin ? (
          <section>
            <div className={`mb-2 px-2 text-xs font-semibold tracking-[0.14em] ${muted}`}>ADMIN</div>
            <Link href="/admin" data-sidebar-active={isSidebarHrefActive(pathname, '/admin') ? 'true' : 'false'} className={rowLinkClass('/admin')}>
              <span>관리자</span>
              <UnreadBadge count={adminPendingCount} />
            </Link>
          </section>
        ) : null}
      </nav>

      <Link
        href="/settings"
        data-sidebar-active={isSidebarHrefActive(pathname, '/settings') ? 'true' : 'false'}
        className={`mt-4 flex items-center gap-3 rounded-xl border p-3 transition ${
          isSidebarHrefActive(pathname, '/settings')
            ? 'border-[#fff0c9]/30 bg-[#1d327a] text-[#fff0c9]'
            : 'border-[#fff0c9]/20 bg-[#fff0c9]/10 text-[#fff0c9] hover:bg-[#fff0c9]/15'
        }`}
      >
        <Avatar displayName={profile.displayName} avatarPath={profile.avatarPath} size="sm" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{profile.displayName}</span>
      </Link>
    </aside>
  )
}
