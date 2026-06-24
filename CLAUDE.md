# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development workflow (always apply)

When building or changing a feature, follow the `ship-feature` skill:

1. **Build** — implement, then `pnpm build`; fix all type/lint errors.
2. **Verify in mobile** — check every UI change at a mobile viewport (preview `mobile` 375×812, and ~360×600 for overflow). Nothing clipped, content scroll-reachable, no horizontal overflow. Share proof, don't ask the user to check.
3. **Micro-commit** — small, one-concern commits with conventional messages. Never bundle unrelated changes.
4. **Never deploy until told** — do not run `firebase deploy` (hosting/rules/functions) on your own. Push only when asked. Offer to deploy and wait for an explicit, per-time instruction.

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

**Auth gate** — `App.tsx` checks `useAuth` (wraps `onAuthStateChanged`). Unauthenticated → `GoogleSignIn`; authenticated → `ChatPage`.

**Data flow** — Custom hooks drive all data:
- `useConversations(uid)` — `onSnapshot` on conversations where user is a member; enriches each doc with per-member user docs fetched individually
- `useMessages(convoId, uid)` — `onSnapshot` desc-ordered with `limit(50)`; reversed for display. `loadMore()` uses `startAfter` cursor for pagination. Also batch-updates `readBy` on open.
- `usePresence(uid)` — writes online/offline to Firebase Realtime Database with `.onDisconnect()` fallback; also listens to `visibilitychange`
- `useTyping(convoId, uid)` — writes `typing.{uid}: true` to the conversation doc, auto-clears after 2 s idle
- `useTypingUsers(convoId, uid, memberDetails)` — reads `typing` map from the conversation doc, returns names of other typing users
- `useAttachmentUpload(convoId)` — validates → (compresses images via `browser-image-compression`) → uploads to Cloudinary; exposes `error`/`audioError` state only on failure, no progress UI
- `useRecorder()` — `MediaRecorder` wrapper with auto format detection, 120 s max, mic permission error handling

**Firebase services** — `src/lib/firebase.ts` exports `auth`, `db` (Firestore), `rtdb` (Realtime Database). `rtdb` is conditionally null if `VITE_FIREBASE_DATABASE_URL` is unset — all presence code guards with `if (!rtdb)`.

**Cloudinary** — Images and PDFs are uploaded via `src/lib/cloudinary.ts` (XHR, no SDK) using an unsigned upload preset. Audio goes to `chatly/{convoId}/audio/`. File validation (`src/lib/fileValidation.ts`) uses `file-type` magic-byte sniffing + 5 MB cap before anything is sent. Cloudinary `publicId` is stored on every attachment/audio message for future deletion (not yet implemented client-side — requires server-side API secret).

**Firestore data model:**
```
users/{uid}
  displayName, displayNameLower, photoURL, email, online, lastSeen

conversations/{id}
  type ('direct'|'group'), name (groups only), members[], lastMessage, createdAt
  createdBy: uid          ← group admin (creator)
  moderators: uid[]       ← can add members
  typing.{uid}: boolean   ← ephemeral typing state

conversations/{id}/messages/{id}
  kind: 'text' | 'attachment' | 'audio' | 'system'
  text?: string           ← also the body of 'system' activity logs
  attachment?: { type, url, publicId, name, size, mimeType, width?, height? }
  audio?: { url, publicId, duration }
  senderId, timestamp, readBy[]
```

**Message kinds** — `MessageBubble` switches on `kind`: text → styled div, attachment → `AttachmentBubble` (image lightbox or PDF Open/Download), audio → `AudioPlayer` (custom player, not native `<audio>`). `system` messages are rendered as centered pills directly in `ChatPanel` (not `MessageBubble`).

**Group roles** — `groupRole(convo, uid)` (in `types/index.ts`) returns `'admin' | 'moderator' | 'member'` from `createdBy`/`moderators`. Admin: rename, manage moderators, remove members, delete group. Moderator: add members. Member: leave only. `GroupInfoModal` (opened from the group header) renders the member list with role tags and gates actions by role. Legacy groups without `createdBy` show a "Become admin" banner to adopt the role once. Permissions are enforced server-side in `firestore.rules` (update branches keyed on `diff().affectedKeys()`; delete is admin-only).

**System / activity logs** — `postSystemMessage()` (in `lib/systemMessage.ts`) writes `kind: 'system'` messages for group events (created, member added/removed/left, moderator changes, admin claimed). Always posted **before** an actor leaves, since rules forbid posting once removed.

**Confirm dialog** — `ConfirmProvider` wraps the app; `useConfirm()` returns an async `confirm({title, message, confirmText, danger})` resolving to a boolean. Replaces all `window.confirm`. Renders at `z-[60]`, above modals.

**Search** — `SearchUsers` queries `displayNameLower` (stored on write in `useAuth`) for case-insensitive prefix search via Firestore range query.

**Read receipts** — `readBy[]` on each message. "All read" = every member except sender is in the array. `useMessages` batch-updates on conversation open.

**Delete message** — `deleteDoc` on the message doc. Firestore `onSnapshot` propagates the deletion to all clients instantly. Cloudinary asset cleanup is deferred (requires a Cloud Function with the API secret).

**Mobile layout** — Sidebar is `fixed` off-screen (`-translate-x-full`) on mobile, toggled via `mobileOpen` in `ChatPage`. Hamburger in `ChatHeader` opens it; selecting a conversation or tapping the backdrop closes it.

**Avatar fallback** — `Avatar` component uses `onError` to catch broken image URLs and falls back to initials with a deterministic color derived from the user's name.

**Leave / delete conversation** — hover a sidebar conversation item to reveal a trash icon. Group admin → deletes the group (`deleteDoc`); everyone else → removes self (`arrayRemove(uid)` on members + moderators).

**File downloads** — `AttachmentBubble` fetches the file into a blob and saves via a same-origin object URL, because the `download` attribute is ignored for cross-origin (Cloudinary) URLs. `toDownloadUrl()` adds Cloudinary's `fl_attachment` flag for the fallback path.

## Environment

All config in `.env.local` with `VITE_` prefix. See `.env.example` for required keys. Firebase project ID: `do-chit-chat`. Cloudinary keys: `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET`.

## Deployment

Hosted at **https://do-chit-chat.web.app** via Firebase Hosting. Always `pnpm build` before deploying hosting.

After deploying to a new domain, add it to **Firebase Console → Authentication → Settings → Authorized domains**.

## Key gotchas

- `User` from `firebase/auth` must be `import type` in Firebase SDK v12+ — a regular import silently crashes the app (blank page, no console error).
- `rtdb` can be `null` — always guard presence/typing code with `if (!rtdb)`.
- Firestore indexes for the `displayNameLower` range query are in `firestore.indexes.json`. Do not add single-field indexes manually — Firestore auto-manages them and a trailing comma in the JSON will break `firebase deploy`.
- Image compression (`browser-image-compression`) runs in a Web Worker — it is non-blocking but can take a moment on large files; the upload starts after it completes.
- Cloudinary free accounts **block PDF/ZIP delivery by default** — enable **Settings → Security → "Allow delivery of PDF and ZIP files"** or PDF open/download returns 401.
- System/leave logs must be posted **before** removing a member from `members` — the security rules only allow current members to write messages.
