# 01 — Initial Build

## Context

Build a minimal, real-time chat application (Messenger/WhatsApp style) as a standalone portfolio project. The goal was to showcase Firebase integration end-to-end — auth, realtime data, presence — and ship it at its own public URL. The portfolio site at `C:\Personal\my-portfolio` links to it.

Constraints:
- Standalone repo, not a sub-route of the portfolio
- Firebase as the only backend
- Clean, minimal UI (dark theme to match the portfolio aesthetic)
- Must work on mobile

## What changed

### Tech stack chosen
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 via `@tailwindcss/vite` plugin (no config file)
- **Backend**: Firebase — Firestore (messages), Realtime Database (presence only), Auth (Google provider)
- **Hosting**: Firebase Hosting at `https://do-chit-chat.web.app`
- **Package manager**: pnpm

### Firebase project
- Created project `do-chit-chat` after replacing an earlier, abandoned project
- All deploy commands require `--project do-chit-chat`
- Authorized domain added in Firebase Console for the hosting URL

### Firestore data model
```
users/{uid}
  uid, displayName, displayNameLower, email, photoURL, lastSeen

conversations/{id}
  type: "direct" | "group"
  name (groups only)
  members: uid[]
  lastMessage: { text, senderId, timestamp }
  createdAt

conversations/{id}/messages/{messageId}
  text, senderId, timestamp, readBy: uid[]
```

### Core hooks
- `useAuth` — wraps `onAuthStateChanged`; writes the user doc on first sign-in
- `useConversations` — `onSnapshot` on conversations where the user is a member
- `useMessages` — `onSnapshot` on the messages subcollection; batch-updates `readBy` on open
- `usePresence` — writes online status to RTDB, registers `.onDisconnect()` fallback

### UI
- Two-pane layout — `Sidebar` (conversation list + search + new-group) and `ChatPanel` (header + messages + input)
- Mobile: sidebar is a fixed full-width overlay
- Google sign-in screen with a feature guide

### Security
- Firestore rules: only conversation members can read/write conversations and their messages
- Users collection: anyone authenticated can read, only the owner can write

### Gotchas resolved
- `User` from `firebase/auth` is a **type-only** export in Firebase SDK v12+ — must use `import type`
- `getDatabase()` throws at module load if `VITE_FIREBASE_DATABASE_URL` is missing — `rtdb` is now conditionally initialized and every caller guards `if (!rtdb)`
- Firestore `Timestamp` is not a `Date` or `number`. `formatTime` must call `.toDate()` if available
- Firestore optimistically writes `timestamp: null` before the server resolves — `formatTime` guards `null`

## Verification

- Signed in with two Google accounts in separate browsers
- Searched the second user → started a direct message → confirmed realtime delivery
- Created a group → confirmed all members receive messages
- Confirmed online dot toggles on sign-in/sign-out
- Read receipts: grey double-check → blue when seen
- Mobile viewport: sidebar opens by default, closes on conversation select
- Deployed to `https://do-chit-chat.web.app`
- Pushed to GitHub at `nurul287/chatly` as a public repo with multiple micro commits
