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
  memberDetails?: Record<string, User>
  lastMessage?: {
    text: string
    senderId: string
    timestamp: number
  }
  createdAt: number
}
