import { useEffect, useState } from 'react'
import { ArrowLeft, Clock, ExternalLink, Search } from 'lucide-react'
import PlaylistSongRow, { PLAYLIST_COLUMNS } from '../components/PlaylistSongRow'
import { getPlaylistSongs, NotOwnedError } from '../spotify/api'
import { useSpotify } from '../spotify/useSpotify'
import { matchesSearch } from '../search'

const cache = new Map()

const totalLength = (songs) => {
  const minutes = Math.round(songs.reduce((sum, s) => sum + (s.durationMs || 0), 0) / 60000)
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} hr ${minutes % 60} min`
}

export default function PlaylistDetail({ playlist, onBack, isSaved, onSave }) {
  const { profile } = useSpotify()
  const notMine = profile?.id && playlist.ownerId && playlist.ownerId !== profile.id && !playlist.collaborative
  const [state, setState] = useState(() =>
    cache.has(playlist.id) ? { status: 'ready', songs: cache.get(playlist.id) } : { status: 'loading', songs: [] }
  )
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (cache.has(playlist.id)) return
    if (notMine) {
      setState({ status: 'not-owned', songs: [] })
      return
    }
    let cancelled = false
    getPlaylistSongs(playlist.id)
      .then((songs) => {
        cache.set(playlist.id, songs)
        if (!cancelled) setState({ status: 'ready', songs })
      })
      .catch((err) => {
        if (!cancelled) setState({ status: err instanceof NotOwnedError ? 'not-owned' : 'error', songs: [], error: err.message })
      })
    return () => {
      cancelled = true
    }
  }, [playlist.id, notMine])

  const shown = state.songs.filter((s) => matchesSearch(query, s.title, s.artist, s.album))
  const summary = state.status === 'ready' ? `${state.songs.length} songs, ${totalLength(state.songs)}` : playlist.count !== null ? `${playlist.count} songs` : ''

  const body = () => {
    if (state.status === 'loading') return <p role="status" className="text-[15px] text-muted">Loading songs…</p>
    if (state.status === 'not-owned') {
      return <p className="text-[15px] text-muted">Spotify only shares the songs in playlists you own. Open it in Spotify to see what’s inside.</p>
    }
    if (state.status === 'error') return <p className="text-[15px] text-muted">{state.error} Try again in a moment.</p>
    if (!state.songs.length) return <p className="text-[15px] text-muted">This playlist doesn’t have any songs yet.</p>
    if (!shown.length) return <p className="text-[15px] text-muted">No songs match “{query}”.</p>

    return (
      <div className="flex flex-col gap-2.5">
        <div className={`${PLAYLIST_COLUMNS} border-b border-line px-3.5 pb-2 text-[13px] text-muted`}>
          <span>#</span>
          <span>Title</span>
          <span className="hidden lg:block">Album</span>
          <span className="hidden xl:block">Date added</span>
          <Clock size={15} aria-label="Duration" />
          <span />
        </div>
        {shown.map((song) => (
          <PlaylistSongRow
            key={`${song.id}-${state.songs.indexOf(song)}`}
            song={song}
            index={state.songs.indexOf(song)}
            saved={isSaved(song.id)}
            onSave={onSave}
          />
        ))}
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-5 px-10 py-8">
      <button type="button" onClick={onBack} className="flex items-center gap-1.5 self-start text-[15px] font-semibold text-teal">
        <ArrowLeft size={18} />
        Playlists
      </button>

      <div className="flex items-end gap-5">
        {playlist.image ? (
          <img src={playlist.image} alt="" className="size-[140px] shrink-0 rounded-[14px] object-cover" />
        ) : (
          <div className="size-[140px] shrink-0 rounded-[14px] bg-art" />
        )}
        <div className="min-w-0">
          <h1 className="truncate font-serif text-[30px] font-semibold">{playlist.name}</h1>
          {summary && <p className="mt-1 text-[15px] text-muted">{summary}</p>}
          {playlist.url && (
            <a href={playlist.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm text-teal underline">
              <ExternalLink size={14} />
              Open in Spotify
            </a>
          )}
        </div>
      </div>

      {state.status === 'ready' && state.songs.length > 0 && (
        <label className="flex h-12 w-full max-w-[420px] items-center gap-2.5 rounded-[14px] border border-line bg-white px-3.5">
          <Search size={18} className="text-teal" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search this playlist"
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-hint"
          />
        </label>
      )}

      {body()}
    </section>
  )
}