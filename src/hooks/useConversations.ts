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
      const convos: Conversation[] = []
      for (const d of snap.docs) {
        const data = d.data() as Omit<Conversation, 'id'>
        const memberDetails: Record<string, User> = {}
        for (const memberId of data.members) {
          const userSnap = await getDoc(doc(db, 'users', memberId))
          if (userSnap.exists()) {
            memberDetails[memberId] = userSnap.data() as User
          }
        }
        convos.push({ id: d.id, ...data, memberDetails })
      }
      setConversations(convos)
    })
  }, [uid])

  return conversations
}
