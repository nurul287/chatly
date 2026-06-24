import { useEffect } from 'react'
import type { Conversation } from '../types'
import { isUnread } from '../types'

/** Reflects the number of conversations with unread messages in the tab title. */
export function useUnreadTitle(conversations: Conversation[], uid: string) {
  useEffect(() => {
    const count = conversations.filter((c) => isUnread(c, uid)).length
    document.title = count > 0 ? `(${count}) Chatly` : 'Chatly'
    return () => { document.title = 'Chatly' }
  }, [conversations, uid])
}
