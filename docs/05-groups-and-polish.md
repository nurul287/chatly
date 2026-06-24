# 05 — Group Roles, System Logs & Polish

## Context

After attachments and the first polish pass, the app needed real group management (it had groups, but no admin/member distinction), plus a round of fixes from live testing: PDF downloads, mobile sign-in layout, native-dialog replacement, and activity logs.

## What changed

### File downloads ([AttachmentBubble.tsx](../src/components/Chat/AttachmentBubble.tsx), [cloudinary.ts](../src/lib/cloudinary.ts))

- Images: download button added to the lightbox.
- PDFs: the card now has two actions — **Open** (new tab) and **Download**.
- The browser `download` attribute is ignored for cross-origin URLs (Cloudinary is a different origin), so download now **fetches the file into a blob** and saves it via a same-origin object URL. Falls back to opening the `fl_attachment` URL if the fetch is blocked.
- `toDownloadUrl()` helper injects Cloudinary's `fl_attachment` flag (forces `Content-Disposition: attachment`).
- **Cloudinary gotcha:** free accounts block PDF/ZIP delivery by default. Enable **Settings → Security → "Allow delivery of PDF and ZIP files"** or PDFs return 401.

### Mobile sign-in fix ([GoogleSignIn.tsx](../src/components/Auth/GoogleSignIn.tsx))

The sign-in card vertically centered with `justify-center`; with the expanded feature list it overflowed and the brand/logo was clipped and unreachable. Fixed with `items-start` + `overflow-y-auto` + `my-auto` on the inner card — centers when it fits, scrolls from the top when it doesn't.

### Mobile empty state ([ChatPanel.tsx](../src/components/Chat/ChatPanel.tsx), [ChatPage.tsx](../src/pages/ChatPage.tsx))

The "no conversation selected" panel was `hidden md:flex` — invisible on mobile with no way back to the sidebar. Now it renders on mobile with a top nav bar (hamburger + logo) and an "Open conversations" button.

### Group roles ([types/index.ts](../src/types/index.ts))

Two fields added to `Conversation`:
- `createdBy` — the group **admin** (creator)
- `moderators[]` — users who can add members

Helper `groupRole(convo, uid)` returns `'admin' | 'moderator' | 'member'`.

**Permission matrix:**

| Action | Admin | Moderator | Member |
|---|---|---|---|
| Add members | ✅ | ✅ | ❌ |
| Set/remove moderators | ✅ | ❌ | ❌ |
| Remove members | ✅ | ❌ | ❌ |
| Leave group | deletes instead | ✅ | ✅ |
| Delete group | ✅ | ❌ | ❌ |

### Group info panel ([GroupInfoModal.tsx](../src/components/Chat/GroupInfoModal.tsx))

Tapping the group header opens a WhatsApp-style panel:
- Member list sorted admin → moderators → members, each with avatar, online dot, role tag, "(You)"
- **Add members** — staged selection: tapping a search result makes it a pill; "Add N members" commits them in one write. Visible to admin/moderators only.
- Admin-only per-member controls: make/remove moderator, remove member
- **Leave group** (members/mods) or **Delete group** (admin)
- **Adminless legacy groups**: groups created before this feature have no `createdBy`. A "Become admin" banner lets a member claim it (one-time adoption, also permitted by a security-rule branch).

### Sidebar role-awareness ([Sidebar.tsx](../src/components/Sidebar/Sidebar.tsx), [ConversationItem.tsx](../src/components/Sidebar/ConversationItem.tsx))

The hover trash icon now deletes the group if you're the admin, otherwise removes you.

### Security rules ([firestore.rules](../firestore.rules))

Conversation updates are branched by role and by which keys changed (`diff().affectedKeys()`):
1. Any member: only `lastMessage`/`typing` changed (message send / typing)
2. Admin or moderator: members only grows, creator preserved (add members)
3. Admin: creator preserved (rename, manage moderators, remove members)
4. Any member: removes only themselves (leave)
5. Adopt adminless group: set `createdBy` to self when none exists

Delete is admin-only. Optional fields read with `.get(key, default)` so direct conversations (no `createdBy`) don't error.

### Confirm dialog ([ConfirmDialog.tsx](../src/components/UI/ConfirmDialog.tsx))

Replaced every `window.confirm()` with a centered, themed dialog. `ConfirmProvider` wraps the app; `useConfirm()` returns an async `confirm({ title, message, confirmText, danger })` that resolves to a boolean. Renders at `z-[60]` (above modals). Used by: message delete, conversation leave/delete, group remove/leave/delete.

### System / activity messages ([systemMessage.ts](../src/lib/systemMessage.ts))

New `system` message kind for WhatsApp-style activity logs, rendered as a centered gray pill (no avatar, no ticks, no delete). `postSystemMessage(convoId, text, actorId)` writes to the messages subcollection. Logged events: group created, members added, member removed, member left, moderator set/removed, admin claimed. Departure logs are posted **before** the actor leaves (rules forbid posting once removed).

## Verification

- Download a PDF / image → saves with original filename (after enabling Cloudinary PDF delivery)
- Sign-in page on a short mobile viewport → brand reachable, scrolls from top
- Create a group → admin sees role tags, Add members, Delete group; members see Leave only
- Add/remove members, toggle moderator, leave → matching system pill appears for everyone live
- Delete/leave actions show the centered confirm dialog, not the native browser alert
- Legacy group with no admin → "Become admin" banner claims it
