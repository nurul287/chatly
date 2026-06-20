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
import type { User, Conversation } from '../../types'
import { Avatar } from '../UI/Avatar'
import { IoSearchOutline } from 'react-icons/io5'

interface Props {
  currentUid: string
  existingConvos: Conversation[]
  onSelect: (convoId: string) => void
  onClose: () => void
}

export function SearchUsers({ currentUid, existingConvos, onSelect, onClose }: Props) {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<User[]>([])

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
        .filter((u) => u.uid !== currentUid)
    )
  }

  const openDirect = async (other: User) => {
    const existing = existingConvos.find(
      (c) => c.type === 'direct' && c.members.includes(other.uid)
    )
    if (existing) { onSelect(existing.id); onClose(); return }

    const ref = await addDoc(collection(db, 'conversations'), {
      type: 'direct',
      members: [currentUid, other.uid],
      createdAt: serverTimestamp(),
    })
    onSelect(ref.id)
    onClose()
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 bg-[#1e1e2e] rounded-xl px-3 py-2">
        <IoSearchOutline className="text-[#94a3b8] text-lg flex-shrink-0" />
        <input
          autoFocus
          value={term}
          onChange={(e) => search(e.target.value)}
          placeholder="Search by name (case-insensitive)..."
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
            onClick={() => openDirect(u)}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#3f3f5a]/40 transition-colors text-left"
          >
            <Avatar src={u.photoURL} name={u.displayName} size={36} online={u.online} />
            <div>
              <p className="text-sm font-medium text-white">{u.displayName}</p>
              <p className="text-xs text-[#94a3b8]">{u.email}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
