# Chatly

A minimal real-time chat application built as a portfolio project. Supports direct messaging, group chats, online presence, and read receipts.

**Live demo → [https://do-chit-chat.web.app](https://do-chit-chat.web.app)**

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white&style=flat-square)
![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28?logo=firebase&logoColor=black&style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white&style=flat-square)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white&style=flat-square)

---

## Features

- **Google Authentication** — sign in with one click, no passwords
- **Direct messaging** — search any user by name and start a private conversation instantly
- **Group chats** — create named groups and add multiple members
- **Real-time updates** — messages appear instantly via Firestore `onSnapshot`
- **Online/offline status** — green dot powered by Firebase Realtime Database presence
- **Read receipts** — grey double-check (delivered) → blue double-check (seen by all)
- **Mobile responsive** — full-screen sidebar on mobile, collapses into chat view on conversation select

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| Auth | Firebase Authentication (Google) |
| Database | Cloud Firestore (messages, conversations, users) |
| Presence | Firebase Realtime Database (online/offline) |
| Animations | Framer Motion |
| Hosting | Firebase Hosting |

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- A Firebase project with **Firestore**, **Realtime Database**, and **Google Authentication** enabled

### 1. Clone and install

```bash
git clone <repo-url>
cd chat-app
pnpm install
```

### 2. Configure Firebase

Copy the example env file and fill in your Firebase project credentials:

```bash
cp .env.example .env.local
```

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_DATABASE_URL=
```

Find these in **Firebase Console → Project Settings → Your apps → Web app config**.

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
  displayName, photoURL, email, online, lastSeen

conversations/{id}
  type: "direct" | "group"
  name: string          # groups only
  members: uid[]
  lastMessage: { text, senderId, timestamp }
  createdAt

conversations/{id}/messages/{id}
  text, senderId, timestamp
  readBy: uid[]         # drives read receipts
```

---

## Project Structure

```
src/
├── lib/firebase.ts          # Firebase init (auth, db, rtdb)
├── hooks/
│   ├── useAuth.ts           # Auth state + user doc sync on first login
│   ├── useConversations.ts  # Realtime conversation list with member details
│   ├── useMessages.ts       # Realtime messages + batch read-receipt updates
│   └── usePresence.ts       # Online/offline heartbeat via Realtime Database
├── components/
│   ├── Auth/                # Google sign-in screen with feature guide
│   ├── Sidebar/             # Conversation list, user search, new group modal
│   └── Chat/                # Message list, bubbles, input
├── pages/
│   └── ChatPage.tsx         # Root layout: Sidebar + ChatPanel
└── types/index.ts           # Shared TypeScript interfaces
```

---

## Security

- Firestore rules restrict all reads/writes to authenticated conversation members only
- Transport encrypted via HTTPS/TLS
- At-rest encryption provided by Firebase
- No passwords stored — Google OAuth only
