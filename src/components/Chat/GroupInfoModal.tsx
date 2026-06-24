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
import imageCompression from 'browser-image-compression'
import { db } from '../../lib/firebase'
import { uploadToCloudinary } from '../../lib/cloudinary'
import { validateFile } from '../../lib/fileValidation'
import { postSystemMessage } from '../../lib/systemMessage'
import type { Conversation, User } from '../../types'
import { groupRole } from '../../types'
import { Avatar } from '../UI/Avatar'
import { Modal } from '../UI/Modal'
import { useConfirm } from '../UI/ConfirmDialog'
import {
  IoSearchOutline,
  IoPersonAddOutline,
  IoShieldCheckmarkOutline,
  IoShieldOutline,
  IoRemoveCircleOutline,
  IoExitOutline,
  IoTrashOutline,
  IoArrowBack,
  IoCloseCircle,
  IoCameraOutline,
  IoPencilOutline,
  IoPeopleOutline,
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
  const [editMode, setEditMode] = useState(false)
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<User[]>([])
  const [staged, setStaged] = useState<User[]>([])
  const [busy, setBusy] = useState(false)
  const [gName, setGName] = useState(conversation.name ?? '')
  const [gDesc, setGDesc] = useState(conversation.description ?? '')
  const [gPhoto, setGPhoto] = useState(conversation.photoURL ?? '')
  const [photoUploading, setPhotoUploading] = useState(false)
  const confirm = useConfirm()

  const myRole = groupRole(conversation, currentUid)
  const isAdmin = myRole === 'admin'
  const canAdd = isAdmin || myRole === 'moderator'
  const hasAdmin = !!conversation.createdBy
  const convoRef = doc(db, 'conversations', conversation.id)
  const myName = conversation.memberDetails?.[currentUid]?.displayName ?? 'Someone'
  const nameOf = (uid: string) => conversation.memberDetails?.[uid]?.displayName ?? 'a member'
  const log = (text: string) => postSystemMessage(conversation.id, text, currentUid)

  const claimAdmin = async () => {
    await updateDoc(convoRef, { createdBy: currentUid, moderators: conversation.moderators ?? [] })
    await log(`${myName} is now the group admin`)
  }

  const openEdit = () => {
    setGName(conversation.name ?? '')
    setGDesc(conversation.description ?? '')
    setGPhoto(conversation.photoURL ?? '')
    setEditMode(true)
  }

  const onGroupPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const v = await validateFile(file)
    if (!v.ok || v.kind !== 'image') return
    setPhotoUploading(true)
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 0.3, maxWidthOrHeight: 512, useWebWorker: true })
      const res = await uploadToCloudinary(compressed, 'chatly/groups')
      setGPhoto(res.secure_url)
    } catch { /* ignore */ } finally {
      setPhotoUploading(false)
    }
  }

  const saveGroupInfo = async () => {
    const name = gName.trim()
    if (!name) return
    setBusy(true)
    const renamed = name !== (conversation.name ?? '')
    await updateDoc(convoRef, { name, description: gDesc.trim(), photoURL: gPhoto })
    if (renamed) await log(`${myName} renamed the group to "${name}"`)
    setBusy(false)
    setEditMode(false)
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
        .filter((u) => !conversation.members.includes(u.uid) && !staged.some((s) => s.uid === u.uid))
    )
  }

  const stageMember = (u: User) => {
    setStaged((prev) => [...prev, u])
    setResults((r) => r.filter((x) => x.uid !== u.uid))
    setTerm('')
  }

  const unstageMember = (uid: string) => {
    setStaged((prev) => prev.filter((u) => u.uid !== uid))
  }

  const exitAddMode = () => {
    setAddMode(false)
    setTerm('')
    setResults([])
    setStaged([])
  }

  const saveMembers = async () => {
    if (staged.length === 0) return
    setBusy(true)
    await updateDoc(convoRef, { members: arrayUnion(...staged.map((u) => u.uid)) })
    const names = staged.map((u) => u.displayName).join(', ')
    await log(`${myName} added ${names}`)
    setBusy(false)
    exitAddMode()
  }

  const removeMember = async (uid: string) => {
    const ok = await confirm({
      title: 'Remove member',
      message: 'Remove this member from the group?',
      confirmText: 'Remove',
    })
    if (!ok) return
    await log(`${myName} removed ${nameOf(uid)}`)
    await updateDoc(convoRef, { members: arrayRemove(uid), moderators: arrayRemove(uid) })
  }

  const toggleModerator = async (uid: string, isMod: boolean) => {
    await updateDoc(convoRef, {
      moderators: isMod ? arrayRemove(uid) : arrayUnion(uid),
    })
    await log(
      isMod
        ? `${myName} removed ${nameOf(uid)} as moderator`
        : `${myName} made ${nameOf(uid)} a moderator`
    )
  }

  const leaveGroup = async () => {
    const ok = await confirm({
      title: 'Leave group',
      message: 'Leave this group? You will need to be re-added to rejoin.',
      confirmText: 'Leave',
    })
    if (!ok) return
    // Post the log while still a member — rules forbid posting after leaving.
    await log(`${myName} left`)
    await updateDoc(convoRef, { members: arrayRemove(currentUid), moderators: arrayRemove(currentUid) })
    onLeftOrDeleted()
    onClose()
  }

  const deleteGroup = async () => {
    const ok = await confirm({
      title: 'Delete group',
      message: 'Delete this group for everyone? This cannot be undone.',
      confirmText: 'Delete',
    })
    if (!ok) return
    await deleteDoc(convoRef)
    onLeftOrDeleted()
    onClose()
  }

  const title = addMode ? 'Add members' : editMode ? 'Edit group' : conversation.name ?? 'Group'

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {editMode ? (
        <div className="flex flex-col gap-4">
          <button
            onClick={() => setEditMode(false)}
            className="flex items-center gap-1.5 text-xs text-[#94a3b8] hover:text-white transition-colors self-start"
          >
            <IoArrowBack /> Back
          </button>

          <div className="flex justify-center">
            <div className="relative">
              <Avatar src={gPhoto} name={gName} size={88} />
              <label
                title="Change group photo"
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-indigo-500 hover:bg-indigo-600 flex items-center justify-center text-white border-2 border-[#2a2a3e] cursor-pointer"
              >
                <IoCameraOutline className="text-base" />
                <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden onChange={onGroupPhoto} />
              </label>
            </div>
          </div>
          {photoUploading && <p className="text-center text-xs text-indigo-300">Uploading photo…</p>}

          <div>
            <label className="text-xs text-[#94a3b8]">Group name</label>
            <input
              value={gName}
              onChange={(e) => setGName(e.target.value)}
              maxLength={50}
              className="mt-1 w-full bg-[#1e1e2e] rounded-xl px-4 py-2.5 text-sm text-white outline-none border border-[#3f3f5a] focus:border-indigo-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-[#94a3b8]">Description</label>
            <textarea
              value={gDesc}
              onChange={(e) => setGDesc(e.target.value.slice(0, 200))}
              rows={2}
              placeholder="What's this group about?"
              className="mt-1 w-full bg-[#1e1e2e] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#94a3b8] outline-none border border-[#3f3f5a] focus:border-indigo-500 transition-colors resize-none"
            />
          </div>
          <button
            onClick={saveGroupInfo}
            disabled={busy || photoUploading || !gName.trim()}
            className="w-full py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white text-sm font-medium transition-colors"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      ) : addMode ? (
        <div className="flex flex-col gap-3">
          <button
            onClick={exitAddMode}
            className="flex items-center gap-1.5 text-xs text-[#94a3b8] hover:text-white transition-colors self-start"
          >
            <IoArrowBack /> Back to members
          </button>

          {/* Staged selections as pills */}
          {staged.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {staged.map((u) => (
                <button
                  key={u.uid}
                  onClick={() => unstageMember(u.uid)}
                  className="flex items-center gap-1.5 bg-indigo-500/20 text-indigo-300 text-xs pl-2 pr-2.5 py-1 rounded-full hover:bg-indigo-500/30 transition-colors"
                >
                  <Avatar src={u.photoURL} name={u.displayName} size={18} />
                  <span className="max-w-[120px] truncate">{u.displayName}</span>
                  <IoCloseCircle className="text-sm flex-shrink-0" />
                </button>
              ))}
            </div>
          )}

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
          <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
            {results.length === 0 && term.length >= 2 && (
              <p className="text-[#94a3b8] text-sm text-center py-4">No users found</p>
            )}
            {results.map((u) => (
              <button
                key={u.uid}
                onClick={() => stageMember(u)}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#3f3f5a]/40 transition-colors text-left"
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

          <button
            onClick={saveMembers}
            disabled={busy || staged.length === 0}
            className="w-full py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white text-sm font-medium transition-colors"
          >
            {busy
              ? 'Adding...'
              : staged.length === 0
                ? 'Select members to add'
                : `Add ${staged.length} member${staged.length > 1 ? 's' : ''}`}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Group header */}
          <div className="flex flex-col items-center text-center gap-2">
            {conversation.photoURL ? (
              <Avatar src={conversation.photoURL} name={conversation.name} size={72} />
            ) : (
              <div className="w-[72px] h-[72px] rounded-full bg-indigo-500/30 flex items-center justify-center">
                <IoPeopleOutline className="text-indigo-300 text-3xl" />
              </div>
            )}
            <div>
              <p className="text-base font-semibold text-white">{conversation.name}</p>
              <p className="text-xs text-[#94a3b8]">{conversation.members.length} members</p>
            </div>
            {conversation.description && (
              <p className="text-xs text-[#cbd5e1] max-w-xs">{conversation.description}</p>
            )}
            {isAdmin && (
              <button
                onClick={openEdit}
                className="flex items-center gap-1.5 text-xs text-indigo-300 hover:text-indigo-200 transition-colors mt-1"
              >
                <IoPencilOutline /> Edit group info
              </button>
            )}
          </div>

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
