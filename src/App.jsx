import { useState } from 'react'
import Sidebar from './components/Sidebar'
import ChatPage from './pages/ChatPage'
import MoodPage from './pages/MoodPage'
import SavedSongsPage from './pages/SavedSongsPage'
import PlaylistsPage from './pages/PlaylistsPage'

export default function App() {
  const [page, setPage] = useState('chat')
  const [liked, setLiked] = useState(new Set())

  const toggleLike = (id) =>
    setLiked((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const pages = {
    chat: <ChatPage liked={liked} onLike={toggleLike} onNavigate={setPage} />,
    mood: <MoodPage />,
    saved: <SavedSongsPage liked={liked} onLike={toggleLike} />,
    playlists: <PlaylistsPage />,
  }

  return (
    <div className="flex h-screen bg-cream">
      <Sidebar page={page} onNavigate={setPage} />
      <main className="min-w-0 flex-1 overflow-y-auto">{pages[page]}</main>
    </div>
  )
}
