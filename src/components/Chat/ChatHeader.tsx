import { useState } from 'react'
import type { Conversation } from '../../types'
import { Avatar } from '../UI/Avatar'
import { GroupInfoModal } from './GroupInfoModal'
import { IoPeopleOutline, IoMenuOutline, IoChevronForward } from 'react-icons/io5'

interface Props {
  conversation: Conversation
  currentUid: string
  onMenuOpen: () => void
  onConversationClosed: () => void
}

export function ChatHeader({ conversation, currentUid, onMenuOpen, onConversationClosed }: Props) {
  const [infoOpen, setInfoOpen] = useState(false)

  const other =
    conversation.type === 'direct'
      ? Object.values(conversation.memberDetails ?? {}).find((u) => u.uid !== currentUid)
      : null

  const name = conversation.type === 'group' ? conversation.name : other?.displayName ?? 'Unknown'
  const online = conversation.type === 'direct' ? other?.online : undefined
  const memberCount = conversation.members.length
  const isGroup = conversation.type === 'group'

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[#3f3f5a] bg-[#1e1e2e]">
      <button
        onClick={onMenuOpen}
        className="p-2 rounded-lg hover:bg-[#2a2a3e] text-[#94a3b8] transition-colors md:hidden"
      >
        <IoMenuOutline className="text-xl" />
      </button>

      <button
        onClick={() => isGroup && setInfoOpen(true)}
        disabled={!isGroup}
        className={`flex items-center gap-3 flex-1 min-w-0 text-left rounded-lg -mx-1 px-1 py-0.5 ${
          isGroup ? 'hover:bg-[#2a2a3e] transition-colors' : 'cursor-default'
        }`}
      >
        {isGroup ? (
          conversation.photoURL ? (
            <Avatar src={conversation.photoURL} name={name} size={36} />
          ) : (
            <div className="w-9 h-9 rounded-full bg-indigo-500/30 flex items-center justify-center flex-shrink-0">
              <IoPeopleOutline className="text-indigo-300" />
            </div>
          )
        ) : (
          <Avatar src={other?.photoURL} name={name} size={36} online={online} />
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{name}</p>
          {isGroup ? (
            <p className="text-xs text-[#94a3b8]">{memberCount} members · tap for info</p>
          ) : (
            <p className="text-xs text-[#94a3b8]">{online ? 'Online' : 'Offline'}</p>
          )}
        </div>

        {isGroup && <IoChevronForward className="text-[#94a3b8] flex-shrink-0" />}
      </button>

      {isGroup && (
        <GroupInfoModal
          open={infoOpen}
          onClose={() => setInfoOpen(false)}
          conversation={conversation}
          currentUid={currentUid}
          onLeftOrDeleted={onConversationClosed}
        />
      )}
    </div>
  )
}
