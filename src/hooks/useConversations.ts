import { useEffect, useState } from 'react'
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  getDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Conversation, User } from '../types'

// Cache user docs in memory to avoid redundant Firestore reads
const userCache = new Map<string, User>()

async function fetchUsers(uids: string[]): Promise<Record<string, User>> {
  const unique = [...new Set(uids)].filter((uid) => !userCache.has(uid))
  if (unique.length > 0) {
    const fetched = await Promise.all(
      unique.map((uid) => getDoc(doc(db, 'users', uid)))
    )
    fetched.forEach((snap) => {
      if (snap.exists()) userCache.set(snap.id, snap.data() as User)
    })
  }
  return Object.fromEntries(
    uids.filter((uid) => userCache.has(uid)).map((uid) => [uid, userCache.get(uid)!])
  )
}

export function useConversations(uid: string | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>([])

  useEffect(() => {
    if (!uid) return

    const q = query(
      collection(db, 'conversations'),
      where('members', 'array-contains', uid),
      orderBy('createdAt', 'desc')
    )

    return onSnapshot(q, async (snap) => {
      const allMemberUids = snap.docs.flatMap((d) => d.data().members as string[])
      const memberMap = await fetchUsers(allMemberUids)

      const convos: Conversation[] = snap.docs.map((d) => {
        const data = d.data() as Omit<Conversation, 'id'>
        const memberDetails: Record<string, User> = {}
        for (const memberId of data.members) {
          if (memberMap[memberId]) memberDetails[memberId] = memberMap[memberId]
        }
        return { id: d.id, ...data, memberDetails }
      })

      setConversations(convos)
    })
  }, [uid])

  return conversations
}
