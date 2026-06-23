import { useState } from 'react'
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { Conversation, User } from '../../types'
import { groupRole } from '../../types'
import { Avatar } from '../UI/Avatar'
import { Modal } from '../UI/Modal'
import {
  IoSearchOutline,
  IoPersonAddOutline,
  IoShieldCheckmarkOutline,
  IoShieldOutline,
  IoRemoveCircleOutline,
  IoExitOutline,
  IoTrashOutline,
  IoArrowBack,
} from 'react-icons/io5'

interface Props {
  open: boolean
  onClose: () => void
  conversation: Conversation
  currentUid: string
  onLeftOrDeleted: () => void
}

const roleStyle: Record<string, string> = {
  admin: 'bg-amber-500/20 text-amber-300',
  moderator: 'bg-indigo-500/20 text-indigo-300',
}

export function GroupInfoModal({ open, onClose, conversation, currentUid, onLeftOrDeleted }: Props) {
  const [addMode, setAddMode] = useState(false)
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<User[]>([])
  const [busy, setBusy] = useState(false)

  const myRole = groupRole(conversation, currentUid)
  const isAdmin = myRole === 'admin'
  const canAdd = isAdmin || myRole === 'moderator'
  const hasAdmin = !!conversation.createdBy
  const convoRef = doc(db, 'conversations', conversation.id)

  const claimAdmin = async () => {
    await updateDoc(convoRef, { createdBy: currentUid, moderators: conversation.moderators ?? [] })
  }

  // Sort members: admin → moderators → members, each alphabetical
  const order = { admin: 0, moderator: 1, member: 2 }
  const sortedMembers = [...conversation.members].sort((a, b) => {
    const ra = order[groupRole(conversation, a)]
    const rb = order[groupRole(conversation, b)]
    if (ra !== rb) return ra - rb
    const na = conversation.memberDetails?.[a]?.displayName ?? ''
    const nb = conversation.memberDetails?.[b]?.displayName ?? ''
    return na.localeCompare(nb)
  })

  const search = async (value: string) => {
    setTerm(value)
    if (value.trim().length < 2) { setResults([]); return }
    const lower = value.toLowerCase()
    const q = query(
      collection(db, 'users'),
      where('displayNameLower', '>=', lower),
      where('displayNameLower', '<=', lower + ''),
      orderBy('displayNameLower'),
      limit(10)
    )
    const snap = await getDocs(q)
    setResults(
      snap.docs
        .map((d) => d.data() as User)
        .filter((u) => !conversation.members.includes(u.uid))
    )
  }

  const addMember = async (u: User) => {
    setBusy(true)
    await updateDoc(convoRef, { members: arrayUnion(u.uid) })
    setBusy(false)
    setResults((r) => r.filter((x) => x.uid !== u.uid))
    setTerm('')
  }

  const removeMember = async (uid: string) => {
    if (!window.confirm('Remove this member from the group?')) return
    await updateDoc(convoRef, { members: arrayRemove(uid), moderators: arrayRemove(uid) })
  }

  const toggleModerator = async (uid: string, isMod: boolean) => {
    await updateDoc(convoRef, {
      moderators: isMod ? arrayRemove(uid) : arrayUnion(uid),
    })
  }

  const leaveGroup = async () => {
    if (!window.confirm('Leave this group?')) return
    await updateDoc(convoRef, { members: arrayRemove(currentUid), moderators: arrayRemove(currentUid) })
    onLeftOrDeleted()
    onClose()
  }

  const deleteGroup = async () => {
    if (!window.confirm('Delete this group for everyone? This cannot be undone.')) return
    await deleteDoc(convoRef)
    onLeftOrDeleted()
    onClose()
  }

  const title = addMode ? 'Add members' : conversation.name ?? 'Group'

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {addMode ? (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => { setAddMode(false); setTerm(''); setResults([]) }}
            className="flex items-center gap-1.5 text-xs text-[#94a3b8] hover:text-white transition-colors self-start"
          >
            <IoArrowBack /> Back to members
          </button>
          <div className="flex items-center gap-2 bg-[#1e1e2e] rounded-xl px-3 py-2">
            <IoSearchOutline className="text-[#94a3b8] text-lg flex-shrink-0" />
            <input
              autoFocus
              value={term}
              onChange={(e) => search(e.target.value)}
              placeholder="Search users by name..."
              className="bg-transparent text-sm text-white placeholder-[#94a3b8] outline-none flex-1"
            />
          </div>
          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
            {results.length === 0 && term.length >= 2 && (
              <p className="text-[#94a3b8] text-sm text-center py-4">No users found</p>
            )}
            {results.map((u) => (
              <button
                key={u.uid}
                disabled={busy}
                onClick={() => addMember(u)}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#3f3f5a]/40 disabled:opacity-50 transition-colors text-left"
              >
                <Avatar src={u.photoURL} name={u.displayName} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{u.displayName}</p>
                  <p className="text-xs text-[#94a3b8] truncate">{u.email}</p>
                </div>
                <IoPersonAddOutline className="text-indigo-400 text-lg flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-[#94a3b8]">{conversation.members.length} members</p>

          {!hasAdmin && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-300">This group has no admin</p>
                <p className="text-xs text-amber-200/70">Become admin to manage members and roles.</p>
              </div>
              <button
                onClick={claimAdmin}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium transition-colors"
              >
                Become admin
              </button>
            </div>
          )}

          {canAdd && (
            <button
              onClick={() => setAddMode(true)}
              className="flex items-center gap-3 p-2 -mx-1 rounded-xl hover:bg-[#3f3f5a]/40 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                <IoPersonAddOutline className="text-indigo-300 text-lg" />
              </div>
              <span className="text-sm font-medium text-indigo-300">Add members</span>
            </button>
          )}

          <div className="flex flex-col gap-1 max-h-72 overflow-y-auto -mx-1">
            {sortedMembers.map((uid) => {
              const u = conversation.memberDetails?.[uid]
              const role = groupRole(conversation, uid)
              const isMe = uid === currentUid
              const isMod = role === 'moderator'
              return (
                <div key={uid} className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#3f3f5a]/20">
                  <Avatar src={u?.photoURL} name={u?.displayName ?? '?'} size={36} online={u?.online} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">
                      {u?.displayName ?? 'Unknown'} {isMe && <span className="text-[#94a3b8]">(You)</span>}
                    </p>
                    {u?.email && <p className="text-xs text-[#94a3b8] truncate">{u.email}</p>}
                  </div>

                  {role !== 'member' && (
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${roleStyle[role]}`}>
                      {role === 'admin' ? 'Admin' : 'Moderator'}
                    </span>
                  )}

                  {/* Admin controls — not on self, not on the admin row */}
                  {isAdmin && !isMe && role !== 'admin' && (
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => toggleModerator(uid, isMod)}
                        title={isMod ? 'Remove moderator' : 'Make moderator'}
                        className="p-1.5 rounded-lg text-[#94a3b8] hover:text-indigo-300 hover:bg-indigo-400/10 transition-colors"
                      >
                        {isMod ? <IoShieldOutline className="text-base" /> : <IoShieldCheckmarkOutline className="text-base" />}
                      </button>
                      <button
                        onClick={() => removeMember(uid)}
                        title="Remove from group"
                        className="p-1.5 rounded-lg text-[#94a3b8] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      >
                        <IoRemoveCircleOutline className="text-base" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Footer actions */}
          <div className="pt-2 border-t border-[#3f3f5a] flex flex-col gap-1">
            {isAdmin ? (
              <button
                onClick={deleteGroup}
                className="flex items-center gap-3 p-2 -mx-1 rounded-xl hover:bg-red-500/10 transition-colors text-red-400"
              >
                <IoTrashOutline className="text-lg" />
                <span className="text-sm font-medium">Delete group</span>
              </button>
            ) : (
              <button
                onClick={leaveGroup}
                className="flex items-center gap-3 p-2 -mx-1 rounded-xl hover:bg-red-500/10 transition-colors text-red-400"
              >
                <IoExitOutline className="text-lg" />
                <span className="text-sm font-medium">Leave group</span>
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
