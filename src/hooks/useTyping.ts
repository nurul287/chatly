import { useEffect, useRef, useState } from 'react'
import { doc, updateDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'

export function useTyping(conversationId: string | null, uid: string | undefined) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setTyping = (isTyping: boolean) => {
    if (!conversationId || !uid) return
    updateDoc(doc(db, 'conversations', conversationId), {
      [`typing.${uid}`]: isTyping,
    }).catch(() => {})
  }

  const onKeyPress = () => {
    setTyping(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setTyping(false), 2000)
  }

  const stopTyping = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setTyping(false)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setTyping(false)
    }
  }, [conversationId])

  return { onKeyPress, stopTyping }
}

export function useTypingUsers(
  conversationId: string | null,
  currentUid: string | undefined,
  memberDetails: Record<string, { displayName: string }> | undefined
) {
  const [typingNames, setTypingNames] = useState<string[]>([])

  useEffect(() => {
    if (!conversationId || !currentUid) return
    return onSnapshot(doc(db, 'conversations', conversationId), (snap) => {
      const typing = snap.data()?.typing as Record<string, boolean> | undefined
      const names = Object.entries(typing ?? {})
        .filter(([uid, active]) => uid !== currentUid && active)
        .map(([uid]) => memberDetails?.[uid]?.displayName ?? 'Someone')
      setTypingNames(names)
    })
  }, [conversationId, currentUid, memberDetails])

  return typingNames
}
