import { motion } from 'framer-motion'
import { useState, useRef } from 'react'
import type { Message } from '../../types'
import {
  IoCheckmarkDone,
  IoCheckmark,
  IoTrashOutline,
  IoArrowUndoOutline,
  IoHappyOutline,
} from 'react-icons/io5'
import { AttachmentBubble } from './AttachmentBubble'
import { AudioPlayer } from './AudioPlayer'
import { useConfirm } from '../UI/ConfirmDialog'

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

interface Props {
  message: Message
  isOwn: boolean
  members: string[]
  currentUid: string
  senderName?: string
  senderPhoto?: string | null
  showSender: boolean
  onDelete?: () => void
  onReact: (emoji: string) => void
  onReply: () => void
}

function formatTime(ts: unknown) {
  if (ts == null) return ''
  const d = (ts as { toDate?: () => Date }).toDate
    ? (ts as { toDate: () => Date }).toDate()
    : new Date(ts as number)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function previewText(m: Message) {
  if (m.kind === 'attachment') return m.attachment?.type === 'image' ? '📷 Photo' : '📄 PDF'
  if (m.kind === 'audio') return '🎤 Voice message'
  return m.text ?? ''
}

export function MessageBubble({
  message, isOwn, members, currentUid, senderName, showSender, onDelete, onReact, onReply,
}: Props) {
  const allRead = members.filter((m) => m !== message.senderId).every((m) => message.readBy.includes(m))
  const someRead = message.readBy.some((r) => r !== message.senderId)
  const [active, setActive] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const confirm = useConfirm()

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => setActive(true), 450)
  }
  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }

  const close = () => { setActive(false); setShowEmoji(false) }

  const handleDelete = async () => {
    close()
    const ok = await confirm({
      title: 'Delete message',
      message: 'Delete this message? This cannot be undone.',
      confirmText: 'Delete',
    })
    if (ok) onDelete?.()
  }

  const react = (emoji: string) => { onReact(emoji); close() }

  // Reaction chips: emoji → count, dropping empties
  const reactionEntries = Object.entries(message.reactions ?? {})
    .map(([emoji, uids]) => [emoji, uids ?? []] as const)
    .filter(([, uids]) => uids.length > 0)

  return (
    <motion.div
      className={`flex w-full min-w-0 ${isOwn ? 'justify-end' : 'justify-start'} px-4`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={close}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
    >
      <div className={`max-w-[85%] sm:max-w-[70%] min-w-0 flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        {showSender && !isOwn && (
          <span className="text-[10px] text-[#94a3b8] mb-1 px-1">{senderName}</span>
        )}

        <div className={`flex items-center gap-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
          <div className="flex flex-col min-w-0">
            {/* Reply quote */}
            {message.replyTo && (
              <div
                className={`text-[11px] px-3 py-1.5 rounded-t-2xl border-l-2 truncate max-w-full ${
                  isOwn
                    ? 'bg-indigo-400/20 border-indigo-200 text-indigo-100'
                    : 'bg-[#23233a] border-indigo-400 text-[#94a3b8]'
                }`}
              >
                <span className="font-medium">{message.replyTo.senderName}</span>
                <span className="opacity-80"> · {message.replyTo.text}</span>
              </div>
            )}

            {message.kind === 'attachment' && message.attachment ? (
              <AttachmentBubble attachment={message.attachment} isOwn={isOwn} />
            ) : message.kind === 'audio' && message.audio ? (
              <AudioPlayer src={message.audio.url} isOwn={isOwn} />
            ) : (
              <div
                className={`px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  message.replyTo ? 'rounded-b-2xl' : 'rounded-2xl'
                } ${
                  isOwn
                    ? `bg-indigo-500 text-white ${message.replyTo ? '' : 'rounded-br-sm'}`
                    : `bg-[#2a2a3e] text-[#e2e8f0] ${message.replyTo ? '' : 'rounded-bl-sm'}`
                }`}
                style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
              >
                {message.text}
              </div>
            )}

            {/* Reaction chips */}
            {reactionEntries.length > 0 && (
              <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                {reactionEntries.map(([emoji, uids]) => {
                  const mine = uids.includes(currentUid)
                  return (
                    <button
                      key={emoji}
                      onClick={() => onReact(emoji)}
                      className={`flex items-center gap-1 text-[11px] leading-none px-1.5 py-1 rounded-full border transition-colors ${
                        mine
                          ? 'bg-indigo-500/25 border-indigo-400/50 text-white'
                          : 'bg-[#2a2a3e] border-[#3f3f5a] text-[#cbd5e1] hover:bg-[#3f3f5a]'
                      }`}
                    >
                      <span>{emoji}</span>
                      <span>{uids.length}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Action bar */}
          {active && (
            <div className="relative flex items-center gap-0.5 flex-shrink-0">
              <button
                onClick={() => setShowEmoji((v) => !v)}
                title="React"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#94a3b8] hover:text-amber-300 hover:bg-amber-300/10 transition-colors"
              >
                <IoHappyOutline className="text-base" />
              </button>
              <button
                onClick={() => { onReply(); close() }}
                title="Reply"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#94a3b8] hover:text-indigo-300 hover:bg-indigo-300/10 transition-colors"
              >
                <IoArrowUndoOutline className="text-base" />
              </button>
              {onDelete && (
                <button
                  onClick={handleDelete}
                  title="Delete message"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[#94a3b8] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                >
                  <IoTrashOutline className="text-base" />
                </button>
              )}

              {/* Emoji popover */}
              {showEmoji && (
                <div className={`absolute bottom-full mb-1 ${isOwn ? 'right-0' : 'left-0'} flex gap-1 bg-[#1e1e2e] border border-[#3f3f5a] rounded-full px-2 py-1 shadow-xl z-10`}>
                  {QUICK_EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => react(e)}
                      className="text-lg hover:scale-125 transition-transform"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 mt-0.5 px-1">
          <span className="text-[10px] text-[#94a3b8]">{formatTime(message.timestamp)}</span>
          {isOwn && (
            allRead ? (
              <IoCheckmarkDone className="text-indigo-400 text-xs" />
            ) : someRead ? (
              <IoCheckmarkDone className="text-[#94a3b8] text-xs" />
            ) : (
              <IoCheckmark className="text-[#94a3b8] text-xs" />
            )
          )}
        </div>
      </div>
    </motion.div>
  )
}

export { previewText }
