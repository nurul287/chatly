import type { Conversation } from '../../types'
import { Avatar } from '../UI/Avatar'
import { IoPeopleOutline } from 'react-icons/io5'

interface Props {
  convo: Conversation
  currentUid: string
  active: boolean
  onClick: () => void
}

function formatTime(ts: unknown) {
  if (!ts) return ''
  // Firestore Timestamp objects have a toDate() method
  const d = (ts as { toDate?: () => Date }).toDate
    ? (ts as { toDate: () => Date }).toDate()
    : new Date(ts as number)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function ConversationItem({ convo, currentUid, active, onClick }: Props) {
  const other =
    convo.type === 'direct'
      ? Object.values(convo.memberDetails ?? {}).find((u) => u.uid !== currentUid)
      : null

  const name = convo.type === 'group' ? convo.name : other?.displayName ?? 'Unknown'
  const photo = convo.type === 'direct' ? other?.photoURL : undefined
  const online = convo.type === 'direct' ? other?.online : undefined

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-left ${
        active ? 'bg-indigo-500/20' : 'hover:bg-[#2a2a3e]'
      }`}
    >
      {convo.type === 'group' ? (
        <div className="w-10 h-10 rounded-full bg-indigo-500/30 flex items-center justify-center flex-shrink-0">
          <IoPeopleOutline className="text-indigo-300 text-lg" />
        </div>
      ) : (
        <Avatar src={photo} name={name} size={40} online={online} />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white truncate">{name}</span>
          <span className="text-[10px] text-[#94a3b8] flex-shrink-0 ml-2">
            {formatTime(convo.lastMessage?.timestamp)}
          </span>
        </div>
        <p className="text-xs text-[#94a3b8] truncate mt-0.5">
          {convo.lastMessage?.text ?? 'No messages yet'}
        </p>
      </div>
    </button>
  )
}
