# 03 — Attachments and Voice Notes

## Context

The app only supported text. We added two new message types:

1. **Attachments** — image (`.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`) and PDF
2. **Voice notes** — recorded audio via browser `MediaRecorder`

### Why Cloudinary (not Firebase Storage)

Firebase Storage now requires the Blaze (paid) plan. Cloudinary's free tier gives 25 GB storage + 25 GB bandwidth, unsigned upload presets, built-in CDN, and image transformations — no credit card required.

Trade-off: no built-in antivirus. Mitigated with layered client-side defence (see below).

### Cloudinary setup (one-time)

- **Cloudinary Console → Settings → Upload → Upload presets → Add new**
  - Name: `chatly_attachments` (unsigned)
  - Folder: `chatly`
  - Allowed formats: `jpg, jpeg, png, gif, webp, pdf, webm, mp3, m4a, wav`
  - Max file size: 5 242 880 bytes (5 MB)
  - Resource type: `auto`
- Add to `.env.local`:
  ```
  VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
  VITE_CLOUDINARY_UPLOAD_PRESET=chatly_attachments
  ```

## What changed

### New files

| File | Purpose |
|---|---|
| `src/lib/cloudinary.ts` | XHR-based upload (no SDK) with progress callback; returns `secure_url`, `public_id`, `bytes`, dimensions, duration |
| `src/lib/fileValidation.ts` | `validateFile(file)` — 5 MB cap → magic-byte sniff via `file-type/browser` → MIME/extension whitelist. Returns typed `ValidationOk \| ValidationErr` |
| `src/hooks/useAttachmentUpload.ts` | Orchestrates: validate → upload → expose `error` / `audioError` only on failure |
| `src/hooks/useRecorder.ts` | `MediaRecorder` wrapper; auto-detects format (`webm/opus` → `webm` → `mp4` → `mpeg`); 120 s max; handles `NotAllowedError` |
| `src/components/Chat/AttachmentBubble.tsx` | Image: lazy `<img>` + click-to-lightbox. PDF: file card with download link |
| `src/components/Chat/VoiceRecorder.tsx` | Recording UI: pulsing dot + live timer + cancel/send buttons |
| `src/components/Chat/AudioPlayer.tsx` | Custom audio player: play/pause, seekable progress bar, current/total time. Themed to bubble colour (own vs other) |

### Modified files

| File | Change |
|---|---|
| `src/types/index.ts` | Added `MessageKind`, `Attachment`, `AudioClip`; extended `Message` with `kind?`, `attachment?`, `audio?` |
| `src/hooks/useMessages.ts` | Added `sendAttachment()` and `sendAudio()` methods; sidebar preview strings (`📷 Photo`, `📄 PDF`, `🎤 Voice 0:12`) |
| `src/components/Chat/MessageInput.tsx` | Paperclip button (left of textarea); mic button morphs into send when text is present; voice mode hides paperclip and textarea |
| `src/components/Chat/MessageBubble.tsx` | Switches on `message.kind` → `AttachmentBubble` / `AudioPlayer` / text div |
| `src/components/Chat/ChatPanel.tsx` | Wires `handleAttach` and `handleVoice` through to `MessageInput` |

### Firestore message shape (new fields)

```ts
interface Message {
  kind?: 'text' | 'attachment' | 'audio'
  attachment?: {
    type: 'image' | 'pdf'
    url: string        // Cloudinary CDN URL
    publicId: string   // stored for future server-side deletion
    name: string
    size: number
    mimeType: string
    width?: number
    height?: number
  }
  audio?: {
    url: string
    publicId: string
    duration: number   // seconds
  }
  // existing fields unchanged: text, senderId, timestamp, readBy
}
```

### Security layering (free-tier AV alternative)

1. **Magic-byte validation** client-side (`file-type`) — catches renamed executables
2. **Cloudinary upload preset whitelist** — server-side type + size enforcement
3. **`publicId` stored** on every message — future Cloud Function can call Cloudinary destroy API when a message is deleted (not yet deployed; requires Firebase Blaze plan)

## Verification

- Send JPG, PNG, PDF between two browsers → render correctly on both sides
- Rename `.exe` to `.jpg` → client rejects with error toast
- File > 5 MB → rejected client-side before upload starts
- Refresh page → CDN URLs still load
- Deny microphone permission → graceful error, no crash
- Record voice note → plays inline with custom player
- Safari: audio recorded in `mp4` fallback format plays correctly
