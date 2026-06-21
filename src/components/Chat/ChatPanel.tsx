import { useEffect, useRef } from 'react'
import { arrayRemove, doc, updateDoc } from 'firebase/firestore'
import type { Conversation } from '../../types'
import { useMessages } from '../../hooks/useMessages'
import { useTyping, useTypingUsers } from '../../hooks/useTyping'
import { useAttachmentUpload } from '../../hooks/useAttachmentUpload'
import { db } from '../../lib/firebase'
import { ChatHeader } from './ChatHeader'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { IoChatbubblesOutline } from 'react-icons/io5'

interface Props {
  conversation: Conversation | null
  currentUid: string
  onMenuOpen: () => void
}

function isSameDay(a: unknown, b: unknown) {
  const toDate = (ts: unknown) => {
    if (!ts) return null
    return (ts as { toDate?: () => Date }).toDate
      ? (ts as { toDate: () => Date }).toDate()
      : new Date(ts as number)
  }
  const da = toDate(a)
  const db2 = toDate(b)
  if (!da || !db2) return true
  return da.toDateString() === db2.toDateString()
}

function formatDate(ts: unknown) {
  if (!ts) return ''
  const d = (ts as { toDate?: () => Date }).toDate
    ? (ts as { toDate: () => Date }).toDate()
    : new Date(ts as number)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === now.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

export function ChatPanel({ conversation, currentUid, onMenuOpen }: Props) {
  const { messages, sendMessage, sendAttachment, hasMore, loadMore, loadingMore } = useMessages(
    conversation?.id ?? null,
    currentUid
  )
  const { status: uploadStatus, progress: uploadProgress, error: uploadError, uploadAttachment, reset: resetUpload } =
    useAttachmentUpload(conversation?.id ?? null)
  const { onKeyPress, stopTyping } = useTyping(conversation?.id ?? null, currentUid)

  const handleAttach = async (file: File) => {
    const attachment = await uploadAttachment(file)
    if (attachment) await sendAttachment(attachment, currentUid)
  }
  const typingNames = useTypingUsers(
    conversation?.id ?? null,
    currentUid,
    conversation?.memberDetails
  )
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevLenRef = useRef(0)

  // Only auto-scroll when new messages arrive (not when loading older ones)
  useEffect(() => {
    if (messages.length > prevLenRef.current) {
      const diff = messages.length - prevLenRef.current
      if (diff <= 3) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevLenRef.current = messages.length
  }, [messages])

  const leaveConversation = async () => {
    if (!conversation) return
    if (!window.confirm('Leave this conversation?')) return
    await updateDoc(doc(db, 'conversations', conversation.id), {
      members: arrayRemove(currentUid),
    })
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex-col items-center justify-center gap-4 bg-[#16162a] hidden md:flex">
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
        onLeave={leaveConversation}
      />

      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-2 bg-[#16162a]">
        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center py-2">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors px-4 py-1.5 rounded-full border border-indigo-500/30 hover:border-indigo-500/60"
            >
              {loadingMore ? 'Loading...' : 'Load older messages'}
            </button>
          </div>
        )}

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
          const showDate = i === 0 || !isSameDay(prevMsg?.timestamp, msg.timestamp)

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex items-center gap-3 px-4 my-3">
                  <div className="flex-1 h-px bg-[#3f3f5a]" />
                  <span className="text-[10px] text-[#94a3b8] font-medium">
                    {formatDate(msg.timestamp)}
                  </span>
                  <div className="flex-1 h-px bg-[#3f3f5a]" />
                </div>
              )}
              <MessageBubble
                message={msg}
                isOwn={isOwn}
                members={conversation.members}
                senderName={sender?.displayName}
                senderPhoto={sender?.photoURL}
                showSender={showSender}
              />
            </div>
          )
        })}

        {/* Typing indicator */}
        {typingNames.length > 0 && (
          <div className="flex items-center gap-2 px-4 mt-1">
            <div className="flex gap-1 items-center bg-[#2a2a3e] px-3 py-2 rounded-2xl rounded-bl-sm">
              <span className="text-xs text-[#94a3b8]">
                {typingNames.join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing
              </span>
              <span className="flex gap-0.5 ml-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1 h-1 rounded-full bg-[#94a3b8] animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <MessageInput
        onSend={(text) => { sendMessage(text, currentUid); stopTyping() }}
        onAttach={handleAttach}
        uploadStatus={uploadStatus}
        uploadProgress={uploadProgress}
        uploadError={uploadError}
        onClearError={resetUpload}
        onKeyPress={onKeyPress}
        onBlur={stopTyping}
      />
    </div>
  )
}
