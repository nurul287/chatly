# Chatly — Build Guide

A step-by-step walkthrough of how this project was built. Follow it top-to-bottom to rebuild from scratch, or jump to a step to understand a specific piece.

---

## 1. Scaffold & install

```bash
pnpm create vite chat-app --template react-ts
cd chat-app
pnpm add firebase tailwindcss @tailwindcss/vite framer-motion react-icons
pnpm add -D firebase-tools
```

Tailwind v4 wires up via the `@tailwindcss/vite` plugin in `vite.config.ts` — no `tailwind.config.js` is needed.

---

## 2. Firebase project setup (one-time)

1. Firebase Console → Create project (`do-chit-chat`)
2. Enable **Authentication → Google provider**
3. Enable **Firestore** (production mode)
4. Enable **Realtime Database** (used only for presence)
5. Copy the web app config into `.env.local` with `VITE_FIREBASE_*` prefix
6. `pnpm exec firebase init` → choose Hosting + Firestore

---

## 3. Firebase init in code — `src/lib/firebase.ts`

Exports `auth`, `db`, `rtdb`.

**Gotcha:** Guard `rtdb` so it returns `null` when `VITE_FIREBASE_DATABASE_URL` is missing. Otherwise `getDatabase()` throws at module import and the whole app crashes silently (blank screen, no console error). All presence code does `if (!rtdb) return`.

---

## 4. Type model — `src/types/index.ts`

Defines `User`, `Conversation`, `Message`. Shapes match Firestore documents exactly.

---

## 5. Auth layer — `src/hooks/useAuth.ts`

- Wraps Firebase `onAuthStateChanged`
- On first sign-in writes `users/{uid}` doc, including `displayNameLower` for case-insensitive search
- `App.tsx` uses this as the auth gate: signed-out → `<GoogleSignIn />`, signed-in → `<ChatPage />`

**Gotcha:** `User` from `firebase/auth` is a type-only export in Firebase SDK v12+. Use `import type { User } from 'firebase/auth'` — a regular import causes a silent module crash.

---

## 6. Presence — `src/hooks/usePresence.ts`

- Writes `online: true` to Realtime Database
- Registers `.onDisconnect().set(false)` so the server marks the user offline if the browser crashes or loses network
- Listens to `visibilitychange` for explicit tab away/return

---

## 7. Conversation list — `src/hooks/useConversations.ts`

- `onSnapshot` on `conversations where members array-contains uid`
- For each conversation, fetches member user docs and merges them into `memberDetails`
- Uses an in-memory `Map` cache + `Promise.all` to avoid the N+1 read problem (a fresh fetch per conversation per render)

---

## 8. Messages — `src/hooks/useMessages.ts`

- `onSnapshot` on `conversations/{id}/messages` ordered desc with `limit(50)` — pagination
- `loadMore()` uses `startAfter(oldestDoc)` to fetch older pages
- On open, batch-updates the `readBy` array on every unread message → drives read receipts

---

## 9. Send + typing — `useMessages.sendMessage` + `src/hooks/useTyping.ts`

- Send: writes the message doc + updates the parent `lastMessage` field on the conversation
- Typing: writes `typing.{uid}: true` on the conversation doc, auto-clears after 2s of no keystrokes
- `useTypingUsers` listens to the same field and reports who is currently typing (excluding self)

---

## 10. UI layout — `src/pages/ChatPage.tsx`

Two-pane layout:

- `<Sidebar />` — conversation list, user search, new-group modal
- `<ChatPanel />` — chat header, message list, message input

**Mobile:** sidebar is a fixed full-width overlay (`-translate-x-full` when closed). Opens by default so users see conversations first; closes when one is selected.

---

## 11. Security — `firestore.rules`

- `users/{uid}` — anyone authenticated can read; only the owner can write
- `conversations/{id}` and its `messages` subcollection — only listed members can read/write

Composite index in `firestore.indexes.json` covers `members array-contains` + `createdAt desc`.

---

## 12. Build, deploy, push

```bash
pnpm build
pnpm exec firebase deploy --project do-chit-chat
git push
```

---

## Mental model

```
Firebase Auth ──> useAuth ──> App.tsx (gate)
                                  │
                                  ▼
                              ChatPage
                              /      \
              useConversations      useMessages + useTyping
                    │                       │
              Firestore               Firestore subcollection
              (real-time onSnapshot everywhere)
```

Every UI update is driven by an `onSnapshot` listener — there is no manual refresh anywhere in the app. That is what makes it feel real-time.

---

## Firestore data model

```
users/{uid}
  uid, displayName, displayNameLower, email, photoURL, lastSeen

conversations/{id}
  type: "direct" | "group"
  name (groups only)
  members: uid[]
  lastMessage: { text, senderId, timestamp }
  typing: { [uid]: boolean }
  createdAt

conversations/{id}/messages/{messageId}
  text, senderId, timestamp, readBy: uid[]
```

`readBy` is the basis for read receipts: a message is "seen by all" when every member except the sender appears in the array.

---

## Common follow-ups

- **Add a feature** → start by deciding which hook owns the data, then surface it through a component.
- **Change security rules** → edit `firestore.rules` and deploy with `pnpm exec firebase deploy --only firestore:rules --project do-chit-chat`.
- **Inspect Firestore** → Firebase Console → Firestore Database.
- **Inspect presence** → Firebase Console → Realtime Database → `/status/{uid}`.
