import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

describe('nickname length limit', () => {
  it('enforces 15 characters across settings, signup, invite, and database', () => {
    expect(source('../../src/app/(workspace)/settings/actions.ts')).toContain('displayName.length > 15')
    expect(source('../../src/app/(workspace)/settings/page.tsx')).toContain('maxLength={15}')
    expect(source('../../src/lib/auth/signup-requests.ts')).toContain('displayName.length > 15')
    expect(source('../../src/lib/auth/invites.ts')).toContain('displayName.length > 15')
    expect(source('../../src/components/signup-request-form.tsx')).toContain('maxLength={15}')
    expect(source('../../src/app/invite/[token]/invite-form.tsx')).toContain('maxLength={15}')
    const migration = source('../../supabase/migrations/20261029013144_nickname_reply_community_unread.sql')
    expect(migration).toContain('left(btrim(display_name), 15)')
    expect(migration).toContain('profiles_display_name_length')
  })
})

describe('reply navigation', () => {
  it('makes reply previews jump to their original message', () => {
    const item = source('../../src/components/message-item.tsx')
    const list = source('../../src/components/message-list.tsx')
    const pane = source('../../src/components/conversation-message-pane.tsx')
    expect(item).toContain('onJumpToMessage')
    expect(item).toContain('data-jump-to-message')
    expect(list).toContain('onJumpToMessage')
    expect(pane).toContain('handleJumpToMessage')
    expect(pane).toContain('scrollIntoView')
  })
})

describe('community unread sidebar badges', () => {
  it('tracks unread community posts without browser notifications', () => {
    const layout = source('../../src/app/(workspace)/layout.tsx')
    const shell = source('../../src/components/app-shell.tsx')
    const sidebar = source('../../src/components/sidebar.tsx')
    const migration = source('../../supabase/migrations/20261029013144_nickname_reply_community_unread.sql')
    expect(layout).toContain('loadCommunityUnreadCounts')
    expect(shell).toContain("table: 'community_posts'")
    expect(shell).toContain("get_community_unread_counts")
    expect(sidebar).toContain('community.unreadCount')
    expect(migration).toContain('community_read_states')
    expect(migration).toContain('get_community_unread_counts')
    expect(migration).toContain('alter publication supabase_realtime add table public.community_posts')
  })
})
