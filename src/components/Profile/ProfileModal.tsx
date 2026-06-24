import { useRef, useState } from 'react'
import { updateProfile } from 'firebase/auth'
import type { User as FirebaseUser } from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import imageCompression from 'browser-image-compression'
import { auth, db } from '../../lib/firebase'
import { uploadToCloudinary } from '../../lib/cloudinary'
import { validateFile } from '../../lib/fileValidation'
import type { User } from '../../types'
import { Avatar } from '../UI/Avatar'
import { Modal } from '../UI/Modal'
import { IoCameraOutline } from 'react-icons/io5'

interface Props {
  open: boolean
  onClose: () => void
  user: FirebaseUser
  profile: User | null
}

const MAX_ABOUT = 160

export function ProfileModal({ open, onClose, user, profile }: Props) {
  const [name, setName] = useState(profile?.displayName ?? user.displayName ?? '')
  const [about, setAbout] = useState(profile?.about ?? '')
  const [photoURL, setPhotoURL] = useState(profile?.photoURL ?? user.photoURL ?? '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const onAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    setError(null)
    const v = await validateFile(file)
    if (!v.ok || v.kind !== 'image') { setError('Please choose an image (JPG, PNG, GIF, WEBP).'); return }
    setUploading(true)
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 0.3, maxWidthOrHeight: 512, useWebWorker: true })
      const res = await uploadToCloudinary(compressed, 'chatly/avatars')
      setPhotoURL(res.secure_url)
    } catch {
      setError('Upload failed. Try again.')
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    const trimmed = name.trim()
    if (!trimmed) { setError('Name cannot be empty.'); return }
    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: trimmed,
        displayNameLower: trimmed.toLowerCase(),
        photoURL,
        about: about.trim(),
      })
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: trimmed, photoURL })
      }
      onClose()
    } catch {
      setError('Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit profile">
      <div className="flex flex-col gap-4">
        {/* Avatar */}
        <div className="flex justify-center">
          <div className="relative">
            <Avatar src={photoURL} name={name} size={88} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              title="Change photo"
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 flex items-center justify-center text-white border-2 border-[#2a2a3e]"
            >
              <IoCameraOutline className="text-base" />
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden onChange={onAvatar} />
          </div>
        </div>
        {uploading && <p className="text-center text-xs text-indigo-300">Uploading photo…</p>}

        <div>
          <label className="text-xs text-[#94a3b8]">Display name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            className="mt-1 w-full bg-[#1e1e2e] rounded-xl px-4 py-2.5 text-sm text-white outline-none border border-[#3f3f5a] focus:border-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label className="text-xs text-[#94a3b8]">About</label>
          <textarea
            value={about}
            onChange={(e) => setAbout(e.target.value.slice(0, MAX_ABOUT))}
            rows={2}
            placeholder="Hey there! I'm using Chatly."
            className="mt-1 w-full bg-[#1e1e2e] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#94a3b8] outline-none border border-[#3f3f5a] focus:border-indigo-500 transition-colors resize-none"
          />
          <p className="text-[10px] text-[#94a3b8] text-right mt-0.5">{MAX_ABOUT - about.length}</p>
        </div>

        <p className="text-xs text-[#94a3b8]">{profile?.email ?? user.email}</p>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          onClick={save}
          disabled={saving || uploading}
          className="w-full py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white text-sm font-medium transition-colors"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Modal>
  )
}
