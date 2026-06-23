export interface User {
  uid: string
  displayName: string
  email: string
  photoURL: string
  online: boolean
  lastSeen: number
}

export type MessageKind = 'text' | 'attachment' | 'audio'

export interface Attachment {
  type: 'image' | 'pdf'
  url: string
  publicId: string
  name: string
  size: number
  mimeType: string
  width?: number
  height?: number
}

export interface AudioClip {
  url: string
  publicId: string
  duration: number
}

export interface Message {
  id: string
  kind?: MessageKind
  text?: string
  attachment?: Attachment
  audio?: AudioClip
  senderId: string
  timestamp: number
  readBy: string[]
}

export interface Conversation {
  id: string
  type: 'direct' | 'group'
  name?: string
  members: string[]
  /** Group admin — the user who created the group. Has full control. */
  createdBy?: string
  /** Group moderators — can add members but cannot manage roles or delete. */
  moderators?: string[]
  memberDetails?: Record<string, User>
  lastMessage?: {
    text: string
    senderId: string
    timestamp: number
  }
  createdAt: number
}

export type GroupRole = 'admin' | 'moderator' | 'member'

export function groupRole(convo: Conversation, uid: string): GroupRole {
  if (convo.createdBy === uid) return 'admin'
  if (convo.moderators?.includes(uid)) return 'moderator'
  return 'member'
}
