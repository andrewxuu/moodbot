import { useState } from 'react'
import { Music, Plus } from 'lucide-react'
import { useSpotify } from '../spotify/useSpotify'
import PlaylistDetail from './PlaylistDetail'
import NewPlaylistForm from '../components/playlists/NewPlaylistForm'

export default function PlaylistsPage({ isSaved, onSave, initialOpenId = null }) {
  const { status, error, playlists, sync, connect, createPlaylist } = useSpotify()
  const [openId, setOpenId] = useState(initialOpenId)
  const [creating, setCreating] = useState(false)
  const selected = playlists.find((p) => p.id === openId)
  const syncing = status === 'syncing'
  const needsSpotify = status === 'disconnected' || status === 'expired'

  const body = () => {
    if (playlists.length) {
      return (
        <div className="grid grid-cols-[repeat(auto-fill,260px)] gap-6">
          {playlists.map((p) => (
            <button key={p.id} type="button" onClick={() => setOpenId(p.id)} className="block text-left">
              {p.image ? (
                <img src={p.image} alt="" className="h-[220px] w-full rounded-[14px] object-cover" />
              ) : (
                <div className="h-[220px] rounded-[14px] bg-art" />
              )}
              <p className="mt-2 truncate text-base font-semibold">{p.name}</p>
              {p.count !== null && <p className="mt-2 text-[13px] text-muted">{p.count} songs</p>}
            </button>
          ))}
        </div>
      )
    }
    if (syncing) return <p className="text-[15px] text-muted">Loading your playlists…</p>
    if (needsSpotify) return <p className="text-[15px] text-muted">Connect Spotify to see your playlists here.</p>
    return <p className="text-[15px] text-muted">Your Spotify account doesn’t have any playlists yet.</p>
  }

  if (selected) {
    return <PlaylistDetail playlist={selected} onBack={() => setOpenId(null)} isSaved={isSaved} onSave={onSave} />
  }

  return (
    <section className="flex flex-col gap-6 px-10 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-[30px] font-semibold">Playlists</h1>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={needsSpotify ? connect : sync}
            className="flex h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-[18px] text-[15px] hover:border-teal"
          >
            <Music size={18} className="text-teal" />
            {syncing ? 'Syncing…' : needsSpotify ? 'Connect Spotify' : 'Sync to Spotify'}
          </button>
          <button
            type="button"
            onClick={() => (needsSpotify ? connect() : setCreating(true))}
            className="flex h-11 items-center gap-1.5 rounded-full bg-teal px-[18px] text-[15px] text-white"
          >
            <Plus size={18} />
            New playlist
          </button>
        </div>
      </div>

      {error && status === 'error' && <p className="text-[13px] text-muted">{error}</p>}
      {body()}

      {creating && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4"
          onMouseDown={(e) => e.target === e.currentTarget && setCreating(false)}
        >
          <div role="dialog" aria-label="New playlist" className="w-full max-w-[380px] rounded-[14px] border border-line bg-surface p-6">
            <h2 className="mb-4 font-serif text-[22px] font-semibold">New playlist</h2>
            <NewPlaylistForm
              onCancel={() => setCreating(false)}
              onCreate={async (name) => {
                const playlist = await createPlaylist(name)
                setCreating(false)
                setOpenId(playlist.id)
              }}
            />
          </div>
        </div>
      )}
    </section>
  )
}
