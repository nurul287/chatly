import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import type { User as FirebaseUser } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await setDoc(
          doc(db, 'users', firebaseUser.uid),
          {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName,
            displayNameLower: firebaseUser.displayName?.toLowerCase() ?? '',
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            lastSeen: serverTimestamp(),
          },
          { merge: true }
        )
      }
      setUser(firebaseUser)
      setLoading(false)
    })
  }, [])

  return { user, loading }
}
