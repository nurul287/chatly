# Chatly

A real-time chat application built as a portfolio project. Supports direct messaging, group chats, file and image sharing, voice notes, online presence, and read receipts.

**Live demo → [https://do-chit-chat.web.app](https://do-chit-chat.web.app)**

**Step-by-step build guide → [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white&style=flat-square)
![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28?logo=firebase&logoColor=black&style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white&style=flat-square)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white&style=flat-square)
![Cloudinary](https://img.shields.io/badge/Cloudinary-CDN-3448C5?logo=cloudinary&logoColor=white&style=flat-square)

---

## Features

- **Google Authentication** — sign in with one click, no passwords
- **Direct messaging** — search any user by name (case-insensitive) and start a private conversation instantly
- **Group chats** — create named groups and add multiple members
- **Real-time updates** — messages appear instantly via Firestore `onSnapshot`
- **Image & PDF attachments** — select multiple files at once; images compressed before upload
- **Voice notes** — record and send audio clips up to 2 minutes; custom playback UI
- **Message deletion** — delete your own messages; removed for all members in real time
- **Online/offline status** — green dot powered by Firebase Realtime Database presence
- **Read receipts** — single check (sent) → double check (delivered) → blue double check (seen by all)
- **Typing indicator** — bouncing dots when another member is typing
- **Message pagination** — loads 50 messages at a time, "Load older" button fetches more
- **Date separators** — Today / Yesterday / date label between messages from different days
- **Mobile responsive** — full-screen sidebar overlay on mobile, collapses into chat view on select

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| Auth | Firebase Authentication (Google) |
| Database | Cloud Firestore (messages, conversations, users) |
| Presence & typing | Firebase Realtime Database |
| File storage | Cloudinary (CDN, image transforms, unsigned upload preset) |
| Image compression | browser-image-compression (Web Worker) |
| File validation | file-type (magic-byte sniffing) |
| Animations | Framer Motion |
| Hosting | Firebase Hosting |

---

## Getting Started

### Prerequisites

- Node.js 18+, pnpm
- Firebase project with **Firestore**, **Realtime Database**, and **Google Authentication** enabled
- Cloudinary free account with an unsigned upload preset configured

### 1. Clone and install

```bash
git clone <repo-url>
cd chat-app
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
# Firebase
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_DATABASE_URL=

# Cloudinary
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
```

Firebase config: **Firebase Console → Project Settings → Your apps → Web app config**.

Cloudinary config: **Cloudinary Console → Settings → Upload → Upload presets** — create an unsigned preset with folder `chatly`, allowed formats `jpg,jpeg,png,gif,webp,pdf,webm,mp3,m4a,wav`, max size 5 242 880 bytes.

### 3. Deploy Firestore rules and indexes

```bash
pnpm exec firebase deploy --only firestore:rules,firestore:indexes --project <your-project-id>
```

### 4. Run locally

```bash
pnpm dev   # http://localhost:5174
```

---

## Deployment

```bash
pnpm build
pnpm exec firebase deploy --only hosting --project <your-project-id>
```

After deploying to a new domain, add it to **Firebase Console → Authentication → Settings → Authorized domains**.

---

## Firestore Data Model

```
users/{uid}
  displayName, displayNameLower, photoURL, email, online, lastSeen

conversations/{id}
  type: 'direct' | 'group'
  name: string           # groups only
  members: uid[]
  lastMessage: { text, senderId, timestamp }
  typing: { [uid]: boolean }
  createdAt

conversations/{id}/messages/{id}
  kind: 'text' | 'attachment' | 'audio'
  text?: string
  attachment?: { type, url, publicId, name, size, mimeType, width?, height? }
  audio?: { url, publicId, duration }
  senderId, timestamp
  readBy: uid[]
```

---

## Security

- Firestore rules restrict all reads/writes to authenticated conversation members only
- File uploads validated client-side by magic bytes (`file-type`) and server-side by Cloudinary upload preset (type whitelist + 5 MB cap)
- Transport encrypted via HTTPS/TLS; at-rest encryption provided by Firebase and Cloudinary
- No passwords stored — Google OAuth only
