# 04 — UX & Polish Pass

## Context

After shipping attachments and voice notes, a round of UX improvements addressed usability issues visible in testing: broken avatar images showing blank, delete not being accessible, upload feedback being too noisy, and several UI alignment bugs.

## What changed

### Delete message

- `useMessages` gains `deleteMessage(messageId)` — calls `deleteDoc` on the Firestore message doc
- `MessageBubble` receives an optional `onDelete` prop (only passed for own messages via `ChatPanel`)
- **Desktop**: hover a bubble → trash icon appears beside it
- **Mobile**: long-press (500 ms) → trash icon appears
- `window.confirm` guards against accidental deletion
- Firestore `onSnapshot` propagates the deletion to all connected clients instantly
- **Cloudinary asset cleanup**: deferred — requires a Firebase Cloud Function with the API secret (not yet deployed). `publicId` is stored on every attachment/audio message for when this is implemented.

### Multi-file upload + image compression

- File input now has `multiple` attribute — user can select several files at once
- All selected files are validated and uploaded in parallel; each sends as a separate message
- Images are compressed before upload using `browser-image-compression` (Web Worker, non-blocking):
  - Max 1 MB output
  - Max 1920 px on longest edge
  - Falls back to original if compression throws

### Silent upload UX

- Removed all progress bars, status indicators, and upload queue UI
- Uploads happen silently in the background
- Only failures surface: an error toast per failed file (with filename + reason), dismissible with ✕
- Audio upload errors shown in a separate toast below the input

### Avatar fallback

- `Avatar` component now handles broken image URLs via `onError` handler
- Falls back to initials div (same as when `src` is null)
- Initials background colour is deterministically derived from the user's display name (8 colour palette, consistent across sessions and devices) — same pattern as WhatsApp/Slack

### Conversation delete moved to sidebar

- Leave conversation button removed from `ChatHeader` (was cluttering the header)
- Now exposed as a hover-reveal trash icon on each `ConversationItem` in the sidebar
- On hover: timestamp replaced by trash icon; click → confirm → `arrayRemove(currentUid)` on `members`
- Leave logic moved from `ChatPanel` into `Sidebar`

### Cursor pointer

- Global CSS rule added to `index.css`:
  ```css
  button, a, [role="button"], label[for], select { cursor: pointer; }
  button:disabled { cursor: not-allowed; }
  ```
- Covers all interactive elements without needing per-element Tailwind classes

### Custom audio player

- Native `<audio controls>` replaced with `AudioPlayer` component
- Single-row layout: play/pause button → seekable progress bar → `current / total` time
- Themed to bubble colour: white-tinted controls on own (indigo) bubbles, indigo controls on other (dark) bubbles
- Resets to start when clip ends

### Audio player alignment fix

- Delete button in `MessageBubble` was `items-end` (pinned to bubble bottom)
- Changed to `items-center` so trash icon is vertically centred for all message types (text, image, audio)

## Verification

- Delete own message → disappears immediately from both browsers; cannot delete others' messages
- Select 3 images + 1 PDF → all upload in parallel, each arrives as a separate message
- Large image (3 MB) → arrives visibly smaller after compression; quality remains acceptable
- Broken Google profile photo URL → initials shown with consistent colour
- All buttons and interactive elements show pointer cursor; disabled buttons show not-allowed
- Custom audio player: seek to middle, play, pause, page refresh → URL still plays
