import { useCallback, useEffect, useMemo, useState } from 'react'
import Sidebar from './components/Sidebar'
import CallbackPage from './pages/CallbackPage'
import ChatPage from './pages/ChatPage'
import MoodPage from './pages/MoodPage'
import SavedSongsPage from './pages/SavedSongsPage'
import PlaylistsPage from './pages/PlaylistsPage'
import { SpotifyProvider, useSpotify } from './spotify/useSpotify'
import { PlayerProvider } from './spotify/usePlayer'

const SAVED_KEY = 'moodbot:saved-songs'

const loadSaved = () => {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY)) ?? []
  } catch {
    return []
  }
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname)
  const finishLogin = useCallback(() => setPath('/'), [])

  if (path === '/callback') return <CallbackPage onDone={finishLogin} />

  return (
    <SpotifyProvider>
      <PlayerProvider>
        <Moodbot />
      </PlayerProvider>
    </SpotifyProvider>
  )
}

function Moodbot() {
  const { liked } = useSpotify()
  const [page, setPage] = useState('chat')
  const [chatSaved, setChatSaved] = useState(loadSaved)

  useEffect(() => {
    localStorage.setItem(SAVED_KEY, JSON.stringify(chatSaved))
  }, [chatSaved])

  const likedIds = useMemo(() => new Set(liked.map((s) => s.id)), [liked])
  const savedSongs = useMemo(
    () => [...chatSaved, ...liked.filter((s) => !chatSaved.some((c) => c.id === s.id))],
    [chatSaved, liked]
  )

  const isSaved = (id) => likedIds.has(id) || chatSaved.some((s) => s.id === id)

  const toggleSave = (song) => {
    if (likedIds.has(song.id)) return
    setChatSaved((prev) =>
      prev.some((s) => s.id === song.id) ? prev.filter((s) => s.id !== song.id) : [{ ...song, source: 'chat', isNew: undefined }, ...prev]
    )
  }

  const shared = { savedSongs, isSaved, onSave: toggleSave }
  const pages = {
    chat: <ChatPage {...shared} onNavigate={setPage} />,
    mood: <MoodPage />,
    saved: <SavedSongsPage {...shared} />,
    playlists: <PlaylistsPage />,
  }

  return (
    <div className="flex h-screen bg-cream">
      <Sidebar page={page} onNavigate={setPage} />
      <main className="min-w-0 flex-1 overflow-y-auto">{pages[page]}</main>
    </div>
  )
}
