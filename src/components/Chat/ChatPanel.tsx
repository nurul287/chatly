import { useEffect, useRef } from 'react'
import type { Conversation } from '../../types'
import { useMessages } from '../../hooks/useMessages'
import { ChatHeader } from './ChatHeader'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { IoChatbubblesOutline } from 'react-icons/io5'

interface Props {
  conversation: Conversation | null
  currentUid: string
  onMenuOpen: () => void
}

export function ChatPanel({ conversation, currentUid, onMenuOpen }: Props) {
  const { messages, sendMessage } = useMessages(conversation?.id ?? null, currentUid)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-[#16162a]">
        <IoChatbubblesOutline className="text-[#3f3f5a] text-6xl" />
        <p className="text-[#94a3b8] text-sm">Select a conversation to start chatting</p>
      </div>
    )
  }

  const isGroup = conversation.type === 'group'

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <ChatHeader
        conversation={conversation}
        currentUid={currentUid}
        onMenuOpen={onMenuOpen}
      />

      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-2 bg-[#16162a]">
        {messages.length === 0 && (
          <p className="text-center text-[#94a3b8] text-xs mt-8">
            No messages yet. Say hello!
          </p>
        )}
        {messages.map((msg, i) => {
          const isOwn = msg.senderId === currentUid
          const sender = conversation.memberDetails?.[msg.senderId]
          const prevMsg = messages[i - 1]
          const showSender = isGroup && !isOwn && prevMsg?.senderId !== msg.senderId

          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={isOwn}
              members={conversation.members}
              senderName={sender?.displayName}
              senderPhoto={sender?.photoURL}
              showSender={showSender}
            />
          )
        })}
        <div ref={bottomRef} />
      </div>

      <MessageInput onSend={(text) => sendMessage(text, currentUid)} />
    </div>
  )
}
