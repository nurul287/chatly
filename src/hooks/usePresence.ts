import { useEffect } from 'react'
import { ref, set, onDisconnect, serverTimestamp } from 'firebase/database'
import { doc, updateDoc } from 'firebase/firestore'
import { rtdb, db } from '../lib/firebase'

export function usePresence(uid: string | undefined) {
  useEffect(() => {
    if (!uid || !rtdb) return

    const presenceRef = ref(rtdb, `presence/${uid}`)

    set(presenceRef, { online: true, lastSeen: serverTimestamp() })
    onDisconnect(presenceRef).set({ online: false, lastSeen: serverTimestamp() })

    const firestoreRef = doc(db, 'users', uid)
    updateDoc(firestoreRef, { online: true }).catch(() => {})

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        set(presenceRef, { online: false, lastSeen: serverTimestamp() })
        updateDoc(firestoreRef, { online: false }).catch(() => {})
      } else {
        set(presenceRef, { online: true, lastSeen: serverTimestamp() })
        updateDoc(firestoreRef, { online: true }).catch(() => {})
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      set(presenceRef, { online: false, lastSeen: serverTimestamp() })
    }
  }, [uid])
}
