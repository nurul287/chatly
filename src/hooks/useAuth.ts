import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import type { User as FirebaseUser } from 'firebase/auth'
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import type { User } from '../types'

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [profile, setProfile] = useState<User | null>(null)
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

  // Subscribe to the user's own profile doc so edits reflect live everywhere.
  useEffect(() => {
    if (!user) { setProfile(null); return }
    return onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) setProfile(snap.data() as User)
    })
  }, [user])

  return { user, profile, loading }
}
