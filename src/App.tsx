import { useAuth } from './hooks/useAuth'
import { GoogleSignIn } from './components/Auth/GoogleSignIn'
import { ChatPage } from './pages/ChatPage'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#1e1e2e]">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!user) return <GoogleSignIn />

  return <ChatPage user={user} />
}

export default App
