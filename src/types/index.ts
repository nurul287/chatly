export interface User {
  uid: string
  displayName: string
  email: string
  photoURL: string
  online: boolean
  lastSeen: number
}

export type MessageKind = 'text' | 'attachment' | 'audio' | 'system'

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

export interface ReplyRef {
  id: string
  text: string
  senderName: string
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
  /** emoji → list of uids who reacted with it */
  reactions?: Record<string, string[]>
  /** snapshot of the message this one replies to */
  replyTo?: ReplyRef
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
    readBy?: string[]
  }
  createdAt: number
}

/** True if the conversation has an incoming message the user hasn't seen. */
export function isUnread(convo: Conversation, uid: string): boolean {
  const lm = convo.lastMessage
  return !!lm && lm.senderId !== uid && !(lm.readBy ?? []).includes(uid)
}

export type GroupRole = 'admin' | 'moderator' | 'member'

export function groupRole(convo: Conversation, uid: string): GroupRole {
  if (convo.createdBy === uid) return 'admin'
  if (convo.moderators?.includes(uid)) return 'moderator'
  return 'member'
}
