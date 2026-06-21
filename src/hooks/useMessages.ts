import { useEffect, useState, useRef } from 'react'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  writeBatch,
  getDocs,
  where,
  limit,
  startAfter,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Message, Attachment, AudioClip } from '../types'

const PAGE_SIZE = 50

export function useMessages(conversationId: string | null, currentUid: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const oldestDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null)

  useEffect(() => {
    if (!conversationId) { setMessages([]); setHasMore(false); return }

    oldestDocRef.current = null

    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('timestamp', 'desc'),
      limit(PAGE_SIZE)
    )

    return onSnapshot(q, (snap) => {
      if (snap.empty) { setMessages([]); setHasMore(false); return }
      oldestDocRef.current = snap.docs[snap.docs.length - 1]
      setHasMore(snap.docs.length === PAGE_SIZE)
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)).reverse()
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
        if (!d.data().readBy?.includes(currentUid)) {
          batch.update(d.ref, { readBy: arrayUnion(currentUid) })
        }
      })
      await batch.commit()
    }
    markRead()
  }, [conversationId, currentUid])

  const loadMore = async () => {
    if (!conversationId || !oldestDocRef.current || loadingMore) return
    setLoadingMore(true)
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('timestamp', 'desc'),
      startAfter(oldestDocRef.current),
      limit(PAGE_SIZE)
    )
    const snap = await getDocs(q)
    if (!snap.empty) {
      oldestDocRef.current = snap.docs[snap.docs.length - 1]
      const older = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)).reverse()
      setMessages((prev) => [...older, ...prev])
      setHasMore(snap.docs.length === PAGE_SIZE)
    } else {
      setHasMore(false)
    }
    setLoadingMore(false)
  }

  const sendMessage = async (text: string, senderId: string) => {
    if (!conversationId) return
    const msg = {
      kind: 'text',
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

  const sendAttachment = async (attachment: Attachment, senderId: string) => {
    if (!conversationId) return
    const preview = attachment.type === 'image' ? '📷 Photo' : '📄 PDF'
    await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
      kind: 'attachment',
      attachment,
      senderId,
      timestamp: serverTimestamp(),
      readBy: [senderId],
    })
    await updateDoc(doc(db, 'conversations', conversationId), {
      lastMessage: { text: preview, senderId, timestamp: serverTimestamp() },
    })
  }

  const sendAudio = async (audio: AudioClip, senderId: string) => {
    if (!conversationId) return
    const mm = Math.floor(audio.duration / 60)
    const ss = String(Math.floor(audio.duration % 60)).padStart(2, '0')
    const preview = `🎤 Voice message (${mm}:${ss})`
    await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
      kind: 'audio',
      audio,
      senderId,
      timestamp: serverTimestamp(),
      readBy: [senderId],
    })
    await updateDoc(doc(db, 'conversations', conversationId), {
      lastMessage: { text: preview, senderId, timestamp: serverTimestamp() },
    })
  }

  const deleteMessage = async (messageId: string) => {
    if (!conversationId) return
    await deleteDoc(doc(db, 'conversations', conversationId, 'messages', messageId))
  }

  return { messages, sendMessage, sendAttachment, sendAudio, deleteMessage, hasMore, loadMore, loadingMore }
}
