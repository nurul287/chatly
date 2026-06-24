import { useEffect, useRef, useState } from 'react'
import type { Conversation, ReplyRef } from '../../types'
import { useMessages } from '../../hooks/useMessages'
import { useTyping, useTypingUsers } from '../../hooks/useTyping'
import { useAttachmentUpload } from '../../hooks/useAttachmentUpload'
import { ChatHeader } from './ChatHeader'
import { MessageBubble, previewText } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { IoChatbubblesOutline, IoMenuOutline } from 'react-icons/io5'

interface Props {
  conversation: Conversation | null
  currentUid: string
  onMenuOpen: () => void
  onConversationClosed: () => void
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

export function ChatPanel({ conversation, currentUid, onMenuOpen, onConversationClosed }: Props) {
  const { messages, sendMessage, sendAttachment, sendAudio, deleteMessage, toggleReaction, hasMore, loadMore, loadingMore } = useMessages(
    conversation?.id ?? null,
    currentUid
  )
  const [replyTarget, setReplyTarget] = useState<ReplyRef | null>(null)

  const startReply = (msg: { id: string; senderId: string }) => {
    const full = messages.find((m) => m.id === msg.id)
    if (!full) return
    const senderName = msg.senderId === currentUid
      ? 'You'
      : conversation?.memberDetails?.[msg.senderId]?.displayName ?? 'Unknown'
    setReplyTarget({ id: full.id, text: previewText(full).slice(0, 120), senderName })
  }
  const {
    error: uploadError,
    clearError,
    audioError,
    clearAudioError,
    uploadAttachments,
    uploadAudio,
  } = useAttachmentUpload(conversation?.id ?? null)
  const { onKeyPress, stopTyping } = useTyping(conversation?.id ?? null, currentUid)

  const handleAttach = async (files: File[]) => {
    await uploadAttachments(files, (attachment) => sendAttachment(attachment, currentUid))
  }

  const handleVoice = async (blob: Blob, duration: number) => {
    const clip = await uploadAudio(blob, duration)
    if (clip) await sendAudio(clip, currentUid)
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

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col h-full bg-[#16162a]">
        {/* Mobile top bar — gives users a way back to the sidebar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#3f3f5a] bg-[#1e1e2e] md:hidden">
          <button
            onClick={onMenuOpen}
            className="p-2 rounded-lg hover:bg-[#2a2a3e] text-[#94a3b8] transition-colors"
          >
            <IoMenuOutline className="text-xl" />
          </button>
          <div className="flex items-center gap-2">
            <IoChatbubblesOutline className="text-indigo-400 text-lg" />
            <span className="text-white font-semibold text-sm">Chatly</span>
          </div>
        </div>

        {/* Empty state — visible on both desktop and mobile */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
            <IoChatbubblesOutline className="text-indigo-400/50 text-3xl" />
          </div>
          <div>
            <p className="text-white font-medium text-sm mb-1">No conversation open</p>
            <p className="text-[#94a3b8] text-xs leading-relaxed">
              Select a conversation from the sidebar or search for someone to message.
            </p>
          </div>
          <button
            onClick={onMenuOpen}
            className="md:hidden mt-1 px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium transition-colors"
          >
            Open conversations
          </button>
        </div>
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
        onConversationClosed={onConversationClosed}
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
              {msg.kind === 'system' ? (
                <div className="flex justify-center px-4 my-1">
                  <span className="text-[11px] text-[#94a3b8] bg-[#2a2a3e]/60 rounded-full px-3 py-1 text-center max-w-[85%]">
                    {msg.text}
                  </span>
                </div>
              ) : (
                <MessageBubble
                  message={msg}
                  isOwn={isOwn}
                  members={conversation.members}
                  currentUid={currentUid}
                  senderName={sender?.displayName}
                  senderPhoto={sender?.photoURL}
                  showSender={showSender}
                  onDelete={isOwn ? () => deleteMessage(msg.id) : undefined}
                  onReact={(emoji) => toggleReaction(msg.id, emoji, currentUid)}
                  onReply={() => startReply(msg)}
                />
              )}
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
        onSend={(text) => { sendMessage(text, currentUid, replyTarget ?? undefined); setReplyTarget(null); stopTyping() }}
        replyTo={replyTarget}
        onCancelReply={() => setReplyTarget(null)}
        onAttach={handleAttach}
        onVoice={handleVoice}
        uploadError={uploadError}
        onClearError={clearError}
        audioError={audioError}
        onClearAudioError={clearAudioError}
        onKeyPress={onKeyPress}
        onBlur={stopTyping}
      />
    </div>
  )
}
