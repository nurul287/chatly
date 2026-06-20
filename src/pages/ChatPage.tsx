import { useState } from 'react'
import type { User as FirebaseUser } from 'firebase/auth'
import { useConversations } from '../hooks/useConversations'
import { usePresence } from '../hooks/usePresence'
import { Sidebar } from '../components/Sidebar/Sidebar'
import { ChatPanel } from '../components/Chat/ChatPanel'

interface Props {
  user: FirebaseUser
}

export function ChatPage({ user }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null)
  // On mobile, sidebar starts open so users can see conversations immediately
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth < 768)
  const conversations = useConversations(user.uid)

  usePresence(user.uid)

  const activeConvo = conversations.find((c) => c.id === activeId) ?? null

  const handleSelect = (id: string) => {
    setActiveId(id)
    setSidebarOpen(false)
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-[#16162a]">
      <Sidebar
        user={user}
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
      />
    </div>
  )
}
