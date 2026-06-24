import { useState } from 'react'
import type { User as FirebaseUser } from 'firebase/auth'
import type { User } from '../types'
import { useConversations } from '../hooks/useConversations'
import { usePresence } from '../hooks/usePresence'
import { useUnreadTitle } from '../hooks/useUnreadTitle'
import { Sidebar } from '../components/Sidebar/Sidebar'
import { ChatPanel } from '../components/Chat/ChatPanel'

interface Props {
  user: FirebaseUser
  profile: User | null
}

export function ChatPage({ user, profile }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null)
  // On mobile, sidebar starts open so users can see conversations immediately
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const conversations = useConversations(user.uid)

  usePresence(user.uid)
  useUnreadTitle(conversations, user.uid)

  const activeConvo = conversations.find((c) => c.id === activeId) ?? null

  const handleSelect = (id: string) => {
    setActiveId(id)
    setSidebarOpen(false)
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-[#16162a]">
      <Sidebar
        user={user}
        profile={profile}
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSelect}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />
      <ChatPanel
        conversation={activeConvo}
        currentUid={user.uid}
        onMenuOpen={() => setSidebarOpen(true)}
        onConversationClosed={() => setActiveId(null)}
      />
    </div>
  )
}
