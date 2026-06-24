# Chatly — Architecture

A step-by-step walkthrough of how this project was built, plus a living reference for the current system. Follow it top-to-bottom to rebuild from scratch, or jump to a section to understand a specific piece.

---

## 1. Scaffold & install

```bash
pnpm create vite chat-app --template react-ts
cd chat-app
pnpm add firebase tailwindcss @tailwindcss/vite framer-motion react-icons \
         browser-image-compression file-type
pnpm add -D firebase-tools
```

Tailwind v4 wires up via the `@tailwindcss/vite` plugin in `vite.config.ts` — no `tailwind.config.js` needed.

---

## 2. Firebase project setup (one-time)

1. Firebase Console → Create project (`do-chit-chat`)
2. Enable **Authentication → Google provider**
3. Enable **Firestore** (production mode)
4. Enable **Realtime Database** (presence only)
5. Copy the web app config into `.env.local` with `VITE_FIREBASE_*` prefix
6. `pnpm exec firebase init` → choose Hosting + Firestore

---

## 3. Firebase init in code — `src/lib/firebase.ts`

Exports `auth`, `db`, `rtdb`.

**Gotcha:** Guard `rtdb` so it returns `null` when `VITE_FIREBASE_DATABASE_URL` is missing — `getDatabase()` throws at module import and crashes the app silently (blank screen, no error). All presence code does `if (!rtdb) return`.

---

## 4. Cloudinary setup (one-time)

Create a free Cloudinary account. In the console:

- **Settings → Upload → Upload presets → Add new**
  - Mode: **Unsigned**; Folder: `chatly`; Allowed formats: `jpg,jpeg,png,gif,webp,pdf,webm,mp3,m4a,wav`; Max size: `5242880`; Resource type: `auto`
- Add to `.env.local`:
  ```
  VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
  VITE_CLOUDINARY_UPLOAD_PRESET=chatly_attachments
  ```

`src/lib/cloudinary.ts` uploads via plain XHR to `https://api.cloudinary.com/v1_1/{cloud}/auto/upload` — no SDK dependency.

---

## 5. Type model — `src/types/index.ts`

Defines `User`, `Conversation`, `Message`, `Attachment`, `AudioClip`, `MessageKind`. Shapes match Firestore documents exactly.

---

## 6. Auth layer — `src/hooks/useAuth.ts`

- Wraps `onAuthStateChanged`
- On first sign-in writes `users/{uid}` including `displayNameLower` for case-insensitive search
- `App.tsx`: signed-out → `<GoogleSignIn />`, signed-in → `<ChatPage />`

**Gotcha:** `User` from `firebase/auth` is type-only in Firebase SDK v12+. Always `import type { User }` — a regular import silently crashes the app.

---

## 7. Presence — `src/hooks/usePresence.ts`

- Writes `online: true` to Realtime Database on mount
- `.onDisconnect().set(false)` marks the user offline if the browser crashes or loses network
- Listens to `visibilitychange` to handle tab switching

---

## 8. Conversation list — `src/hooks/useConversations.ts`

- `onSnapshot` on `conversations where members array-contains uid`
- Fetches member user docs and merges into `memberDetails` using an in-memory `Map` cache + `Promise.all` (avoids the N+1 read problem)

---

## 9. Messages — `src/hooks/useMessages.ts`

- `onSnapshot` on `conversations/{id}/messages` ordered desc, `limit(50)`; reversed for display
- `loadMore()` uses `startAfter(oldestDoc)` cursor for older pages
- Batch-updates `readBy` on open (drives read receipts)
- `sendMessage(text, uid)` — writes message doc + updates `lastMessage` on parent conversation
- `sendAttachment(attachment, uid)` — same but `kind: 'attachment'`; sidebar preview: `📷 Photo` / `📄 PDF`
- `sendAudio(clip, uid)` — `kind: 'audio'`; sidebar preview: `🎤 Voice message (M:SS)`
- `deleteMessage(id)` — `deleteDoc`; propagates to all clients via `onSnapshot`

---

## 10. Typing — `src/hooks/useTyping.ts`

- `useTyping(convoId, uid)` — writes `typing.{uid}: true` on the conversation doc; auto-clears after 2 s of no keystrokes; clears on unmount
- `useTypingUsers(convoId, uid, memberDetails)` — reads `typing` map, returns display names of other typing users

---

## 11. File upload pipeline — `src/hooks/useAttachmentUpload.ts`

```
File selected
  → validateFile() in src/lib/fileValidation.ts
      • 5 MB cap
      • magic-byte sniff via file-type (catches renamed executables)
      • MIME + extension whitelist
  → (images only) browser-image-compression
      • max 1 MB / 1920 px, Web Worker, non-blocking
      • falls back to original on error
  → uploadToCloudinary() in src/lib/cloudinary.ts
      • XHR POST to auto/upload endpoint
      • Cloudinary preset enforces type/size server-side
  → onEach(attachment) callback → sendAttachment() → Firestore message doc
```

Uploads are silent (no progress UI). Only failures surface as dismissible error toasts.

Audio follows the same path but skips compression:

```
Blob from MediaRecorder
  → validateFile(blob, 'voice-note.webm')
  → uploadToCloudinary to chatly/{convoId}/audio/
  → sendAudio() → Firestore message doc
```

`publicId` is stored on every message for future server-side Cloudinary deletion (requires a Cloud Function + API secret — not yet deployed).

---

## 12. Voice recording — `src/hooks/useRecorder.ts`

- Requests mic via `getUserMedia`
- Auto-detects format: `audio/webm;codecs=opus` → `audio/webm` → `audio/mp4` → `audio/mpeg`
- 120 s hard limit; auto-stops and resolves at the limit
- Handles `NotAllowedError` (mic denied) gracefully
- `start()` → `stop()` returns `Promise<{blob, duration} | null>`

---

## 13. UI layout — `src/pages/ChatPage.tsx`

Two-pane layout:

- `<Sidebar />` — conversation list, user search, new-group modal, per-item leave button
- `<ChatPanel />` — chat header, message list, message input

**Mobile:** sidebar is a fixed full-width overlay (`-translate-x-full` when closed). Opens by default; closes when a conversation is selected.

### Component responsibilities

| Component | Responsibility |
|---|---|
| `MessageBubble` | Switches on `kind` → text div / `AttachmentBubble` / `AudioPlayer`. Delete button on hover (own messages only). `system` kind is rendered as a centered pill in `ChatPanel`, not here |
| `AttachmentBubble` | Image: lazy `<img>` + lightbox with download. PDF: file card with Open + Download. Download fetches a blob to bypass cross-origin `download` restrictions |
| `AudioPlayer` | Custom player: play/pause, seekable bar, time display. Themed to bubble colour |
| `VoiceRecorder` | Red pulsing dot + live timer. Inline in `MessageInput` during recording |
| `MessageInput` | Paperclip (multi-file), textarea, mic/send toggle. Only shows errors, never progress |
| `Avatar` | Falls back to initials + deterministic colour on broken image URL |
| `ConversationItem` | Hover reveals trash icon (leave, or delete if group admin) replacing timestamp |
| `GroupInfoModal` | Member list with role tags, add/remove members, moderator toggle, leave/delete, claim-admin for legacy groups |
| `ConfirmProvider` / `useConfirm` | App-wide promise-based confirm dialog replacing `window.confirm` |

### Group roles

`Conversation.createdBy` is the **admin**; `Conversation.moderators[]` are mods. `groupRole(convo, uid)` returns `'admin' | 'moderator' | 'member'`. Admin: full control (rename, manage moderators, remove members, delete). Moderator: add members. Member: leave only. Legacy groups (no `createdBy`) show a "Become admin" banner to adopt the role once.

### System / activity messages

`kind: 'system'` messages (via `postSystemMessage()` in `lib/systemMessage.ts`) log group events — created, member added/removed/left, moderator changes, admin claimed — as centered pills. Posted **before** an actor leaves, since rules forbid posting once removed.

---

## 14. Security — `firestore.rules`

- `users/{uid}` — authenticated read; owner write only
- `conversations/{id}/messages` — members-only read/write
- `conversations/{id}` — role-aware updates branched by `diff().affectedKeys()`:
  1. Any member: only `lastMessage`/`typing` changed (message send / typing)
  2. Admin or moderator: members only grows, creator preserved (add members)
  3. Admin: creator preserved (rename, manage moderators, remove members)
  4. Any member: removes only themselves (leave)
  5. Adopt an adminless group: set `createdBy` to self when none exists
- Delete is **admin-only**. Optional fields read with `.get(key, default)` so direct conversations don't error.

Composite index in `firestore.indexes.json`: `members array-contains` + `createdAt desc`.

**Gotcha:** Do not add single-field indexes to `firestore.indexes.json` — Firestore auto-manages them, and a trailing comma in the array causes a JSON parse error that breaks `firebase deploy`.

---

## 15. Build, deploy, push

```bash
pnpm build
pnpm exec firebase deploy --only hosting --project do-chit-chat
git push
```

After deploying to a new domain, add it to **Firebase Console → Authentication → Settings → Authorized domains**.

---

## Firestore data model

```
users/{uid}
  uid, displayName, displayNameLower, email, photoURL, lastSeen, online

conversations/{id}
  type: 'direct' | 'group'
  name (groups only)
  members: uid[]
  createdBy: uid          // group admin (creator)
  moderators: uid[]       // can add members
  lastMessage: { text, senderId, timestamp }
  typing: { [uid]: boolean }
  createdAt

conversations/{id}/messages/{msgId}
  kind: 'text' | 'attachment' | 'audio' | 'system'
  text?: string          // also the body of 'system' activity logs
  attachment?: {
    type: 'image' | 'pdf'
    url: string          // Cloudinary CDN URL
    publicId: string     // for future deletion
    name: string
    size: number
    mimeType: string
    width?: number
    height?: number
  }
  audio?: {
    url: string
    publicId: string
    duration: number     // seconds
  }
  senderId: string
  timestamp: Timestamp
  readBy: uid[]
```

---

## Mental model

```
Firebase Auth ──> useAuth ──> App.tsx (gate)
                                  │
                                  ▼
                              ChatPage
                             /        \
            useConversations           useMessages
                  │                        │
            Firestore                 Firestore subcollection
            (onSnapshot)              (onSnapshot, paginated)

File uploads (attachment / audio):
  useAttachmentUpload ──> fileValidation ──> browser-image-compression (images)
                      └──> cloudinary.ts (XHR) ──> Cloudinary CDN
                                                       │
                                                 useMessages.sendAttachment/sendAudio
                                                       │
                                                  Firestore ──> onSnapshot ──> all clients
```

Every UI update is driven by an `onSnapshot` listener — no manual refresh anywhere. That is what makes it feel real-time.

---

## Common follow-ups

- **Add a message type** → extend `MessageKind` in `types/index.ts`, add a send method to `useMessages`, add a case to `MessageBubble`
- **Implement Cloudinary asset deletion on message delete** → needs a Firebase Cloud Function (`onDocumentDeleted` trigger); requires Blaze plan and Cloudinary API secret set via `firebase functions:secrets:set`
- **Change security rules** → edit `firestore.rules`, deploy with `pnpm exec firebase deploy --only firestore:rules --project do-chit-chat`
- **Inspect Firestore** → Firebase Console → Firestore Database
- **Inspect presence** → Firebase Console → Realtime Database → `/status/{uid}`
