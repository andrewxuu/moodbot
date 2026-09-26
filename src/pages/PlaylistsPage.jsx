import { Music, Plus } from 'lucide-react'
import { useSpotify } from '../spotify/useSpotify'

export default function PlaylistsPage() {
  const { status, error, playlists, sync, connect } = useSpotify()
  const syncing = status === 'syncing'
  const needsSpotify = status === 'disconnected' || status === 'expired'

  const body = () => {
    if (playlists.length) {
      return (
        <div className="grid grid-cols-[repeat(auto-fill,260px)] gap-6">
          {playlists.map((p) => (
            <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="block">
              {p.image ? (
                <img src={p.image} alt="" className="h-[220px] w-full rounded-[14px] object-cover" />
              ) : (
                <div className="h-[220px] rounded-[14px] bg-art" />
              )}
              <p className="mt-2 truncate text-base font-semibold">{p.name}</p>
              {p.count !== null && <p className="mt-2 text-[13px] text-muted">{p.count} songs</p>}
            </a>
          ))}
        </div>
      )
    }
    if (syncing) return <p className="text-[15px] text-muted">Loading your playlists…</p>
    if (needsSpotify) return <p className="text-[15px] text-muted">Connect Spotify to see your playlists here.</p>
    return <p className="text-[15px] text-muted">Your Spotify account doesn’t have any playlists yet.</p>
  }

  return (
    <section className="flex flex-col gap-6 px-10 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-[30px] font-semibold">Playlists</h1>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={needsSpotify ? connect : sync}
            className="flex h-11 items-center gap-1.5 rounded-full border border-line bg-white px-[18px] text-[15px] hover:border-teal"
          >
            <Music size={18} className="text-teal" />
            {syncing ? 'Syncing…' : needsSpotify ? 'Connect Spotify' : 'Sync to Spotify'}
          </button>
          <button
            type="button"
            className="flex h-11 items-center gap-1.5 rounded-full bg-teal px-[18px] text-[15px] text-white"
          >
            <Plus size={18} />
            New playlist
          </button>
        </div>
      </div>

      {error && status === 'error' && <p className="text-[13px] text-muted">{error}</p>}
      {body()}
    </section>
  )
}
