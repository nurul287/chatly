import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { arrayRemove, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../../lib/firebase'
import { postSystemMessage } from '../../lib/systemMessage'
import type { Conversation } from '../../types'
import type { User as FirebaseUser } from 'firebase/auth'
import { Avatar } from '../UI/Avatar'
import { ConversationItem } from './ConversationItem'
import { Modal } from '../UI/Modal'
import { SearchUsers } from './SearchUsers'
import { NewGroupModal } from './NewGroupModal'
import { IoCreateOutline, IoPeopleOutline, IoLogOutOutline, IoChevronBack } from 'react-icons/io5'
import { IoChatbubblesOutline } from 'react-icons/io5'

interface Props {
  user: FirebaseUser
  conversations: Conversation[]
  activeId: string | null
  onSelect: (id: string) => void
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({ user, conversations, activeId, onSelect, mobileOpen, onMobileClose }: Props) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [groupOpen, setGroupOpen] = useState(false)

  const handleSelect = (id: string) => {
    onSelect(id)
    onMobileClose()
  }

  const handleLeave = async (convo: Conversation) => {
    const ref = doc(db, 'conversations', convo.id)
    // A group admin deletes the whole group; everyone else just removes themselves.
    if (convo.type === 'group' && convo.createdBy === user.uid) {
      await deleteDoc(ref)
    } else {
      if (convo.type === 'group') {
        // Log the departure while still a member (rules forbid posting after leaving).
        await postSystemMessage(convo.id, `${user.displayName ?? 'Someone'} left`, user.uid)
      }
      await updateDoc(ref, {
        members: arrayRemove(user.uid),
        moderators: arrayRemove(user.uid),
      })
    }
  }

  return (
    <>
      <aside
        className={`
          flex flex-col h-full bg-[#1e1e2e] border-r border-[#3f3f5a] flex-shrink-0
          w-full md:w-72
          md:relative md:translate-x-0
          fixed top-0 left-0 z-30 transition-transform duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#3f3f5a]">
          <div className="flex items-center gap-2">
            <IoChatbubblesOutline className="text-indigo-400 text-xl" />
            <span className="text-white font-semibold text-base">Chatly</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              title="New direct message"
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-lg hover:bg-[#2a2a3e] text-[#94a3b8] hover:text-white transition-colors"
            >
              <IoCreateOutline className="text-lg" />
            </button>
            <button
              title="New group"
              onClick={() => setGroupOpen(true)}
              className="p-2 rounded-lg hover:bg-[#2a2a3e] text-[#94a3b8] hover:text-white transition-colors"
            >
              <IoPeopleOutline className="text-lg" />
            </button>
            <button
              title="Mobile close"
              onClick={onMobileClose}
              className="p-2 rounded-lg hover:bg-[#2a2a3e] text-[#94a3b8] hover:text-white transition-colors md:hidden"
            >
              <IoChevronBack className="text-lg" />
            </button>
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
              <IoChatbubblesOutline className="text-[#3f3f5a] text-4xl" />
              <p className="text-[#94a3b8] text-sm">
                No conversations yet. Search for a user to start chatting.
              </p>
            </div>
          ) : (
            conversations.map((c) => (
              <ConversationItem
                key={c.id}
                convo={c}
                currentUid={user.uid}
                active={c.id === activeId}
                onClick={() => handleSelect(c.id)}
                onDelete={() => handleLeave(c)}
              />
            ))
          )}
        </div>

        {/* Footer / user info */}
        <div className="flex items-center gap-3 px-4 py-4 border-t border-[#3f3f5a] min-h-[64px] flex-shrink-0">
          <Avatar src={user.photoURL} name={user.displayName} size={36} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.displayName}</p>
          </div>
          <button
            title="Sign out"
            onClick={() => signOut(auth)}
            className="p-1.5 rounded-lg hover:bg-[#2a2a3e] text-[#94a3b8] hover:text-red-400 transition-colors"
          >
            <IoLogOutOutline className="text-lg" />
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Search modal */}
      <Modal open={searchOpen} onClose={() => setSearchOpen(false)} title="New Message">
        <SearchUsers
          currentUid={user.uid}
          existingConvos={conversations}
          onSelect={handleSelect}
          onClose={() => setSearchOpen(false)}
        />
      </Modal>

      {/* New group modal */}
      <NewGroupModal
        open={groupOpen}
        currentUid={user.uid}
        onClose={() => setGroupOpen(false)}
        onCreated={handleSelect}
      />
    </>
  )
}
