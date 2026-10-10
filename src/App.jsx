import { useCallback, useEffect, useMemo, useState } from 'react'
import Sidebar from './components/layout/Sidebar'
import SettingsModal from './components/settings/SettingsModal'
import { ThemeProvider } from './theme'
import { RatingsProvider } from './ratings'
import CallbackPage from './pages/CallbackPage'
import ChatPage from './pages/ChatPage'
import HomePage from './pages/HomePage'
import MoodPage from './pages/MoodPage'
import SavedSongsPage from './pages/SavedSongsPage'
import PlaylistsPage from './pages/PlaylistsPage'
import { SpotifyProvider, useSpotify } from './spotify/useSpotify'
import { PlayerProvider } from './spotify/usePlayer'
import { FeedbackProvider } from './feedback'
import { AccountProvider, useAccount } from './account'
import { cloudPush } from './lib/cloudSync'
import AuthPage from './pages/AuthPage'
import OnboardingPage from './pages/OnboardingPage'

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
  const finishLogin = useCallback(() => setPath(import.meta.env.BASE_URL), [])

  if (path === `${import.meta.env.BASE_URL}callback`) return <CallbackPage onDone={finishLogin} />

  return (
    <ThemeProvider>
      <AccountProvider>
        <SpotifyProvider>
          <PlayerProvider>
            <FeedbackProvider>
              <RatingsProvider>
                <Gate />
              </RatingsProvider>
            </FeedbackProvider>
          </PlayerProvider>
        </SpotifyProvider>
      </AccountProvider>
    </ThemeProvider>
  )
}

function Gate() {
  const { ready, user, guest, onboarded, replay } = useAccount()
  if (!ready) return <div className="min-h-screen bg-cream" />
  if (!user && !guest && onboarded) return <AuthPage />
  if (!onboarded || replay) return <OnboardingPage />
  return <Moodbot />
}

function Moodbot() {
  const { liked, disconnect } = useSpotify()
  const { signOut } = useAccount()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const closeSettings = useCallback(() => setSettingsOpen(false), [])
  const logOut = () => {
    disconnect()
    setSettingsOpen(false)
    setPage('home')
    signOut()
  }
  const [page, setPage] = useState('home')
  const [openPlaylistId, setOpenPlaylistId] = useState(null)
  const navigate = (next) => {
    setOpenPlaylistId(null)
    setPage(next)
  }
  const openPlaylist = (id) => {
    setOpenPlaylistId(id)
    setPage('playlists')
  }
  const [chatSaved, setChatSaved] = useState(loadSaved)

  useEffect(() => {
    localStorage.setItem(SAVED_KEY, JSON.stringify(chatSaved))
    cloudPush('saved', chatSaved)
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
    home: <HomePage {...shared} onNavigate={navigate} />,
    chat: <ChatPage {...shared} onNavigate={navigate} onOpenPlaylist={openPlaylist} />,
    mood: <MoodPage savedSongs={savedSongs} />,
    saved: <SavedSongsPage {...shared} />,
    playlists: <PlaylistsPage {...shared} initialOpenId={openPlaylistId} />,
  }

  return (
    <div className="flex h-screen bg-cream">
      <Sidebar page={page} onNavigate={navigate} onOpenSettings={() => setSettingsOpen(true)} />
      <main className="min-w-0 flex-1 overflow-y-auto">{pages[page]}</main>
      {settingsOpen && <SettingsModal onClose={closeSettings} onLogOut={logOut} />}
    </div>
  )
}
