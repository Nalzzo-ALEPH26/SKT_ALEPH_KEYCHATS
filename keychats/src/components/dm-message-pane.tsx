import { ConversationMessagePane } from '@/components/conversation-message-pane'
import { DmReadReceipt } from '@/components/dm-read-receipt'
import type { MessagePresentationProfile } from '@/lib/messages/presentation'
import type { RealtimeMessageRow } from '@/lib/messages/realtime'

type DmMessagePaneProps = {
  dmThreadId: string
  initialMessages: RealtimeMessageRow[]
  profiles: MessagePresentationProfile[]
  currentUserId: string
  isAdmin: boolean
}

export function DmMessagePane({ dmThreadId, currentUserId, ...props }: DmMessagePaneProps) {
  return (
    <>
      <DmReadReceipt dmThreadId={dmThreadId} currentUserId={currentUserId} />
      <ConversationMessagePane
        key={dmThreadId}
        target={{ kind: 'dm', id: dmThreadId }}
        currentUserId={currentUserId}
        {...props}
      />
    </>
  )
}
