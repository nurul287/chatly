import { motion } from 'framer-motion'
import type { Message } from '../../types'
import { IoCheckmarkDone, IoCheckmark } from 'react-icons/io5'
import { AttachmentBubble } from './AttachmentBubble'

interface Props {
  message: Message
  isOwn: boolean
  members: string[]
  senderName?: string
  senderPhoto?: string | null
  showSender: boolean
}

function formatTime(ts: unknown) {
  if (ts == null) return ''
  const d = (ts as { toDate?: () => Date }).toDate
    ? (ts as { toDate: () => Date }).toDate()
    : new Date(ts as number)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function MessageBubble({ message, isOwn, members, senderName, showSender }: Props) {
  const allRead = members.filter((m) => m !== message.senderId).every((m) => message.readBy.includes(m))
  const someRead = message.readBy.some((r) => r !== message.senderId)

  return (
    <motion.div
      className={`flex w-full min-w-0 ${isOwn ? 'justify-end' : 'justify-start'} px-4`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className={`max-w-[85%] sm:max-w-[70%] min-w-0 flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        {showSender && !isOwn && (
          <span className="text-[10px] text-[#94a3b8] mb-1 px-1">{senderName}</span>
        )}
        {message.kind === 'attachment' && message.attachment ? (
          <AttachmentBubble attachment={message.attachment} isOwn={isOwn} />
        ) : message.kind === 'audio' && message.audio ? (
          <audio controls src={message.audio.url} className="max-w-full" />
        ) : (
          <div
            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap w-full ${
              isOwn
                ? 'bg-indigo-500 text-white rounded-br-sm'
                : 'bg-[#2a2a3e] text-[#e2e8f0] rounded-bl-sm'
            }`}
            style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
          >
            {message.text}
          </div>
        )}
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
