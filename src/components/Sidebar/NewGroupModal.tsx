import { useState } from 'react'
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  orderBy,
  limit,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { User } from '../../types'
import { Avatar } from '../UI/Avatar'
import { Modal } from '../UI/Modal'
import { IoSearchOutline, IoCloseCircle } from 'react-icons/io5'

interface Props {
  open: boolean
  currentUid: string
  onClose: () => void
  onCreated: (convoId: string) => void
}

export function NewGroupModal({ open, currentUid, onClose, onCreated }: Props) {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<User[]>([])
  const [selected, setSelected] = useState<User[]>([])
  const [groupName, setGroupName] = useState('')
  const [creating, setCreating] = useState(false)

  const search = async (value: string) => {
    setTerm(value)
    if (value.trim().length < 2) { setResults([]); return }
    const q = query(
      collection(db, 'users'),
      where('displayName', '>=', value),
      where('displayName', '<=', value + ''),
      orderBy('displayName'),
      limit(10)
    )
    const snap = await getDocs(q)
    setResults(
      snap.docs
        .map((d) => d.data() as User)
        .filter((u) => u.uid !== currentUid && !selected.find((s) => s.uid === u.uid))
    )
  }

  const toggle = (u: User) => {
    setSelected((prev) =>
      prev.find((s) => s.uid === u.uid) ? prev.filter((s) => s.uid !== u.uid) : [...prev, u]
    )
    setResults([])
    setTerm('')
  }

  const create = async () => {
    if (selected.length < 1 || !groupName.trim()) return
    setCreating(true)
    const ref = await addDoc(collection(db, 'conversations'), {
      type: 'group',
      name: groupName.trim(),
      members: [currentUid, ...selected.map((u) => u.uid)],
      createdAt: serverTimestamp(),
    })
    setCreating(false)
    setSelected([])
    setGroupName('')
    onCreated(ref.id)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="New Group">
      <div className="flex flex-col gap-4">
        <input
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Group name..."
          className="bg-[#1e1e2e] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#94a3b8] outline-none border border-[#3f3f5a] focus:border-indigo-500 transition-colors"
        />

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selected.map((u) => (
              <button
                key={u.uid}
                onClick={() => toggle(u)}
                className="flex items-center gap-1.5 bg-indigo-500/20 text-indigo-300 text-xs px-3 py-1 rounded-full"
              >
                {u.displayName}
                <IoCloseCircle className="text-sm" />
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 bg-[#1e1e2e] rounded-xl px-3 py-2">
          <IoSearchOutline className="text-[#94a3b8] text-lg flex-shrink-0" />
          <input
            value={term}
            onChange={(e) => search(e.target.value)}
            placeholder="Add members..."
            className="bg-transparent text-sm text-white placeholder-[#94a3b8] outline-none flex-1"
          />
        </div>

        <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
          {results.map((u) => (
            <button
              key={u.uid}
              onClick={() => toggle(u)}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#3f3f5a]/40 transition-colors text-left"
            >
              <Avatar src={u.photoURL} name={u.displayName} size={32} />
              <p className="text-sm text-white">{u.displayName}</p>
            </button>
          ))}
        </div>

        <button
          onClick={create}
          disabled={creating || selected.length < 1 || !groupName.trim()}
          className="w-full py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white text-sm font-medium transition-colors"
        >
          {creating ? 'Creating...' : 'Create Group'}
        </button>
      </div>
    </Modal>
  )
}
