import { useEffect, useState } from 'react'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  arrayUnion,
  writeBatch,
  getDocs,
  where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Message } from '../types'

export function useMessages(conversationId: string | null, currentUid: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([])

  useEffect(() => {
    if (!conversationId) { setMessages([]); return }

    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('timestamp', 'asc')
    )

    return onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message))
      setMessages(msgs)
    })
  }, [conversationId])

  // Mark messages as read when conversation opens
  useEffect(() => {
    if (!conversationId || !currentUid) return

    const markRead = async () => {
      const q = query(
        collection(db, 'conversations', conversationId, 'messages'),
        where('senderId', '!=', currentUid)
      )
      const snap = await getDocs(q)
      const batch = writeBatch(db)
      snap.docs.forEach((d) => {
        const data = d.data()
        if (!data.readBy?.includes(currentUid)) {
          batch.update(d.ref, { readBy: arrayUnion(currentUid) })
        }
      })
      await batch.commit()
    }

    markRead()
  }, [conversationId, currentUid])

  const sendMessage = async (text: string, senderId: string) => {
    if (!conversationId) return
    const msg = {
      text: text.trim(),
      senderId,
      timestamp: serverTimestamp(),
      readBy: [senderId],
    }
    await addDoc(collection(db, 'conversations', conversationId, 'messages'), msg)
    await updateDoc(doc(db, 'conversations', conversationId), {
      lastMessage: { text: text.trim(), senderId, timestamp: serverTimestamp() },
    })
  }

  return { messages, sendMessage }
}
