# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server on port 5174
pnpm build        # TypeScript check + Vite production build
pnpm lint         # ESLint
pnpm preview      # Serve production build locally

# Firebase deploy (always pass --project do-chit-chat)
pnpm exec firebase deploy --only firestore:rules --project do-chit-chat
pnpm exec firebase deploy --only firestore:indexes --project do-chit-chat
pnpm exec firebase deploy --only hosting --project do-chit-chat
```

## Architecture

**Auth gate** — `App.tsx` checks `useAuth` (wraps Firebase `onAuthStateChanged`). Unauthenticated users see `GoogleSignIn`; authenticated users go straight to `ChatPage`.

**Data flow** — Three custom hooks drive all data:
- `useConversations(uid)` — `onSnapshot` on conversations where user is a member; enriches each with member user docs fetched individually
- `useMessages(convoId, uid)` — `onSnapshot` on the messages subcollection; also batch-updates `readBy` on open
- `usePresence(uid)` — writes online status to Firebase Realtime Database with `.onDisconnect()` fallback; also listens to `visibilitychange`

**Firebase services** — `src/lib/firebase.ts` exports `auth`, `db` (Firestore), and `rtdb` (Realtime Database). `rtdb` is conditionally initialized — it will be `null` if `VITE_FIREBASE_DATABASE_URL` is not set, so all presence code guards with `if (!rtdb)`.

**Firestore data model:**
```
users/{uid}               — displayName, photoURL, email, online, lastSeen
conversations/{id}        — type, name (groups), members[], lastMessage, createdAt
conversations/{id}/messages/{id} — text, senderId, timestamp, readBy[]
```

**Read receipts** — `readBy` is an array of UIDs on each message. A message is "seen by all" when every member except the sender is in `readBy`. `useMessages` batch-updates unread messages when a conversation is opened.

**Mobile layout** — Sidebar is `fixed` and off-screen by default on mobile (`-translate-x-full`), toggled via `mobileOpen` state in `ChatPage`. The hamburger button in `ChatHeader` opens it; tapping the backdrop or selecting a conversation closes it.

## Environment

All Firebase config goes in `.env.local` with `VITE_` prefix. See `.env.example` for required keys. The Firebase project ID is `do-chit-chat`.

## Deployment

Hosted at **https://do-chit-chat.web.app** via Firebase Hosting. `firebase.json` points to `dist/`. Always `pnpm build` before deploying hosting.

After deploying to a new domain, add it to **Firebase Console → Authentication → Settings → Authorized domains**.

## Key gotcha

`User` from `firebase/auth` is a type-only export in Firebase SDK v12+. Always import it as `import type { User } from 'firebase/auth'` — a regular import causes a silent module crash (root div stays empty, no console error).
