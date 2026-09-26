import { useState } from 'react'
import { Search } from 'lucide-react'
import Chip from '../components/ui/Chip'
import SongRow from '../components/songs/SongRow'
import { useSpotify } from '../spotify/useSpotify'
import { matchesSearch } from '../lib/search'

const filters = [
  { id: 'all', label: 'All' },
  { id: 'chat', label: 'From chat' },
  { id: 'spotify', label: 'From Spotify' },
]

export default function SavedSongsPage({ savedSongs, isSaved, onSave }) {
  const { status, error, connect } = useSpotify()
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')

  const shown = savedSongs.filter(
    (s) => (filter === 'all' || s.source === filter) && matchesSearch(query, s.title, s.artist, s.album)
  )
  const needsSpotify = status === 'disconnected' || status === 'expired'

  const empty = () => {
    if (status === 'syncing' && filter !== 'chat') return <p className="text-[15px] text-muted">Loading your Spotify songs…</p>
    if (filter === 'spotify' && needsSpotify) {
      return (
        <div className="flex flex-col items-start gap-3">
          <p className="text-[15px] text-muted">Connect Spotify to see your liked songs here.</p>
          <button type="button" onClick={connect} className="h-11 rounded-full bg-teal px-5 text-[15px] text-white">
            {status === 'expired' ? 'Reconnect Spotify' : 'Connect Spotify'}
          </button>
          {error && <p className="text-[13px] text-muted">{error}</p>}
        </div>
      )
    }
    if (query) return <p className="text-[15px] text-muted">No songs match “{query}”.</p>
    if (filter === 'chat') return <p className="text-[15px] text-muted">Songs you save in chat show up here.</p>
    return <p className="text-[15px] text-muted">Save songs in chat or connect Spotify to fill this page.</p>
  }

  return (
    <section className="flex flex-col gap-5 px-10 py-8">
      <h1 className="font-serif text-[30px] font-semibold">Saved songs</h1>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex h-12 w-[420px] items-center gap-2.5 rounded-[14px] border border-line bg-white px-3.5">
          <Search size={18} className="text-teal" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search saved songs"
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-hint"
          />
        </label>
        <div className="flex gap-2">
          {filters.map((f) => (
            <Chip key={f.id} selected={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
            </Chip>
          ))}
        </div>
      </div>

      {shown.length ? (
        <div className="flex flex-col gap-2.5">
          {shown.map((song) => (
            <SongRow key={`${song.source}-${song.id}`} song={song} slot="saved" variant="card" saved={isSaved(song.id)} onSave={onSave} />
          ))}
        </div>
      ) : (
        empty()
      )}
    </section>
  )
}