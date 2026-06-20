export interface User {
  uid: string
  displayName: string
  email: string
  photoURL: string
  online: boolean
  lastSeen: number
}

export interface Message {
  id: string
  text: string
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
