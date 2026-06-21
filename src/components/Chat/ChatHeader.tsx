import type { Conversation } from '../../types'
import { Avatar } from '../UI/Avatar'
import { IoPeopleOutline, IoMenuOutline } from 'react-icons/io5'

interface Props {
  conversation: Conversation
  currentUid: string
  onMenuOpen: () => void
}

export function ChatHeader({ conversation, currentUid, onMenuOpen }: Props) {
  const other =
    conversation.type === 'direct'
      ? Object.values(conversation.memberDetails ?? {}).find((u) => u.uid !== currentUid)
      : null

  const name = conversation.type === 'group' ? conversation.name : other?.displayName ?? 'Unknown'
  const online = conversation.type === 'direct' ? other?.online : undefined
  const memberCount = conversation.members.length

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[#3f3f5a] bg-[#1e1e2e]">
      <button
        onClick={onMenuOpen}
        className="p-2 rounded-lg hover:bg-[#2a2a3e] text-[#94a3b8] transition-colors md:hidden"
      >
        <IoMenuOutline className="text-xl" />
      </button>

      {conversation.type === 'group' ? (
        <div className="w-9 h-9 rounded-full bg-indigo-500/30 flex items-center justify-center flex-shrink-0">
          <IoPeopleOutline className="text-indigo-300" />
        </div>
      ) : (
        <Avatar src={other?.photoURL} name={name} size={36} online={online} />
      )}

      <div className="flex-1">
        <p className="text-sm font-semibold text-white">{name}</p>
        {conversation.type === 'group' ? (
          <p className="text-xs text-[#94a3b8]">{memberCount} members</p>
        ) : (
          <p className="text-xs text-[#94a3b8]">{online ? 'Online' : 'Offline'}</p>
        )}
      </div>
    </div>
  )
}
