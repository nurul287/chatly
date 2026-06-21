# 03 — Attachments and Voice Notes (Planned)

> **Status: planned, not yet implemented.** Architecture revised: switched storage backend from Firebase Storage to **Cloudinary** because Firebase Storage now requires the paid Blaze plan, which is out of scope for this portfolio project.

## Context

The app only supports text today. We want to add:

1. **Attachments** — image (`.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`) and document (`.pdf`)
2. **Voice notes** — recorded audio via browser `MediaRecorder`

User requirements:

- **5 MB hard cap** on every file
- **Type validation by magic bytes**, not just extension or MIME
- **Industry-standard upload pipeline**, scoped to free-tier services
- No credit card required (rules out Firebase Storage + Cloud Functions)

### Why Cloudinary (not Firebase Storage)

Firebase Storage and Cloud Functions both require the Blaze plan now. Cloudinary's free tier gives us:

- 25 GB storage, 25 GB monthly bandwidth — orders of magnitude more than this app will use
- No credit card on signup
- A CDN in front of every file
- Built-in image transformations (auto-format, auto-quality, resize) — replaces the canvas-resize step we'd have had to write
- **Server-side upload presets** that enforce file type and size limits — replaces the Storage rules we'd have written

The trade-off: Cloudinary doesn't have built-in antivirus. See the AV section below for how we mitigate.

## Architecture

```
Client
  └─ validate (size + magic bytes via `file-type/browser`)
      │
      ▼
  Optional: VirusTotal hash check (free public API, 4 req/min)
      │
      ▼
  Upload directly to Cloudinary using an UNSIGNED upload preset
  scoped to {convoId}/{uid}/
      │
      ▼
  Cloudinary returns: secure_url, public_id, resource_type, format, bytes
      │
      ▼
  Client writes Firestore message doc with the URL
      │
      ▼
  Other members receive via existing onSnapshot listener
```

The whole pipeline is **client-only** — no Cloud Function needed. Cloudinary enforces the type/size whitelist server-side via the upload preset config.

## Antivirus strategy (free-tier reality)

True server-side AV scanning would require a Cloud Function or a paid Cloudinary add-on (Perception Point). Since both cost money, we use **layered defense** instead:

1. **Client magic-byte validation** with the `file-type` npm package — rejects renamed `.exe → .jpg` tricks
2. **Cloudinary upload preset whitelist** — Cloudinary refuses anything outside `image/*`, `application/pdf`, `audio/*`, with a 5 MB cap, server-side
3. **VirusTotal public-API hash lookup** (optional, client-side) — before upload, compute the file's SHA-256 and query `https://www.virustotal.com/api/v3/files/{hash}`. If VT knows the hash and flagged it, abort. Hash lookups are free, instant, and don't consume the upload quota
4. **Documented limitation** — for a true production app, we'd proxy uploads through a serverless function (Vercel, Netlify, Cloudflare Workers) that runs VT's bytes-upload endpoint. Out of scope for v1; noted in the docs

This is a portfolio-appropriate compromise: honest about the limit, with a clear upgrade path.

## What will change

### Setup (manual, one-time)

In the Cloudinary Console after creating a free account:

1. **Settings → Upload → Upload presets → Add new**
   - Name: `chatly_attachments`
   - Signing Mode: **Unsigned**
   - Folder: `chatly`
   - Allowed formats: `jpg, jpeg, png, gif, webp, pdf, webm, mp3, m4a, wav`
   - Max file size: `5242880` (5 MB)
   - Resource type: `auto`
2. Grab the **Cloud name** and the **upload preset name** — add to `.env.local`:
   ```
   VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
   VITE_CLOUDINARY_UPLOAD_PRESET=chatly_attachments
   ```

### Code

| File | Action |
|---|---|
| `src/lib/cloudinary.ts` | New — `uploadToCloudinary(file, folder)` posts to `https://api.cloudinary.com/v1_1/{cloud}/auto/upload` and returns `{secure_url, public_id, resource_type, bytes}` |
| `src/lib/fileValidation.ts` | New — extension + MIME + magic-byte sniff (`file-type/browser`) + 5 MB cap + optional VT hash check |
| `src/types/index.ts` | Extend `Message` with `kind`, `attachment`, `audio` fields |
| `src/hooks/useAttachmentUpload.ts` | New — validate → upload → progress + status |
| `src/hooks/useMessages.ts` | Broaden `sendMessage` to accept attachment/audio payloads |
| `src/components/Chat/AttachmentPicker.tsx` | New — paperclip button, `accept="image/*,application/pdf"`, preview |
| `src/components/Chat/AttachmentBubble.tsx` | New — image lightbox, PDF download card |
| `src/components/Chat/MessageInput.tsx` | Add paperclip + mic buttons |
| `src/components/Chat/MessageBubble.tsx` | `switch (message.kind)` to delegate |
| `src/components/Sidebar/ConversationItem.tsx` | Sidebar preview per kind (`📎 Photo`, `📄 PDF`, `🎤 Voice 0:12`) |
| `src/hooks/useRecorder.ts` | New — `MediaRecorder` wrapper |
| `src/components/Chat/VoiceRecorder.tsx` | New — hold-to-record mic with timer |

### Message type
```ts
type MessageKind = 'text' | 'attachment' | 'audio'

interface Message {
  id: string
  kind: MessageKind             // defaults to 'text'
  text?: string
  attachment?: {
    type: 'image' | 'pdf'
    url: string                 // Cloudinary secure_url
    publicId: string            // Cloudinary id for delete/transform
    name: string
    size: number
    mimeType: string
    width?: number; height?: number
  }
  audio?: { url: string; publicId: string; duration: number }
  senderId: string
  timestamp: Timestamp
  readBy: string[]
}
```

## Rollout phases

| Phase | Deliverable | Effort |
|---|---|---|
| 0 | Cloudinary account + upload preset + env vars | 15 min (user) |
| 1 | `cloudinary.ts` + `fileValidation.ts` + attachment UI for images/PDF | ~1 day |
| 2 | Voice recorder + audio rendering | ~half day |

## Verification

**Phase 1 — Attachments**
- Send JPG, PNG, PDF between two browsers → render correctly
- Rename `.exe` to `.jpg` → client magic-byte check rejects with toast
- Try a >5 MB file → rejected by client; if bypassed, Cloudinary rejects via preset
- Refresh page → attachments still load (Cloudinary CDN URL)
- Cloudinary Console → Media Library shows files under `chatly/{convoId}/`

**Phase 2 — Audio**
- Record + send → other side plays
- Deny mic permission → graceful error
- Chrome, Edge, Firefox, Safari all play recorded clips
