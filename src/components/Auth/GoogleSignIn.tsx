import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '../../lib/firebase'
import { FcGoogle } from 'react-icons/fc'
import {
  IoChatbubblesOutline,
  IoSearchOutline,
  IoPeopleOutline,
  IoCheckmarkDoneOutline,
  IoEllipseOutline,
  IoImageOutline,
  IoMicOutline,
  IoTrashOutline,
} from 'react-icons/io5'
import { motion } from 'framer-motion'

const features = [
  {
    icon: IoSearchOutline,
    title: 'Find anyone',
    desc: 'Search users by name and start a direct message instantly.',
  },
  {
    icon: IoPeopleOutline,
    title: 'Group chats',
    desc: 'Create groups, name them, and add multiple members.',
  },
  {
    icon: IoImageOutline,
    title: 'Share files',
    desc: 'Send images and PDFs — multiple files at once, compressed automatically.',
  },
  {
    icon: IoMicOutline,
    title: 'Voice notes',
    desc: 'Record and send audio clips up to 2 minutes long.',
  },
  {
    icon: IoCheckmarkDoneOutline,
    title: 'Read receipts',
    desc: 'Blue double-check means your message has been seen.',
  },
  {
    icon: IoEllipseOutline,
    title: 'Online status',
    desc: 'Green dot shows who is currently active.',
  },
  {
    icon: IoTrashOutline,
    title: 'Delete messages',
    desc: 'Remove your own messages — disappears for everyone instantly.',
  },
]

export function GoogleSignIn() {
  const signIn = () => signInWithPopup(auth, new GoogleAuthProvider())

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#1e1e2e] px-4 py-10">
      <motion.div
        className="flex flex-col items-center gap-6 w-full max-w-sm"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Brand */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
            <IoChatbubblesOutline className="text-indigo-400 text-3xl" />
          </div>
          <h1 className="text-2xl font-bold text-white">Chatly</h1>
          <p className="text-[#94a3b8] text-sm text-center">
            Minimal chat — fast, clean, real-time.
          </p>
        </div>

        {/* Sign in */}
        <button
          onClick={signIn}
          className="flex items-center gap-3 w-full justify-center px-5 py-3 rounded-xl bg-white text-gray-800 font-medium text-sm hover:bg-gray-100 transition-colors shadow-lg"
        >
          <FcGoogle className="text-xl" />
          Continue with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px bg-[#3f3f5a]" />
          <span className="text-[#94a3b8] text-xs">How it works</span>
          <div className="flex-1 h-px bg-[#3f3f5a]" />
        </div>

        {/* Feature guide */}
        <div className="w-full bg-[#2a2a3e] rounded-2xl p-4 flex flex-col gap-3">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="text-indigo-400 text-base" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">{title}</p>
                <p className="text-[#94a3b8] text-xs leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick start note */}
        <p className="text-[#94a3b8] text-xs text-center leading-relaxed">
          Sign in with Google to get started. Anyone who signs in automatically
          becomes searchable by other users.
        </p>
      </motion.div>
    </div>
  )
}
