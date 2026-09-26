import { useState } from 'react'
import { Search } from 'lucide-react'
import Chip from '../components/Chip'
import SongRow from '../components/SongRow'
import { songs } from '../data'

const filters = [
  { id: 'all', label: 'All' },
  { id: 'chat', label: 'From chat' },
  { id: 'spotify', label: 'From Spotify' },
]

export default function SavedSongsPage({ liked, onLike }) {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')

  const shown = songs.filter(
    (s) =>
      (filter === 'all' || s.source === filter) &&
      `${s.title} ${s.artist}`.toLowerCase().includes(query.toLowerCase())
  )

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

      <div className="flex flex-col gap-2.5">
        {shown.map((song) => (
          <SongRow key={song.id} song={song} variant="card" liked={liked.has(song.id)} onLike={onLike} />
        ))}
      </div>
    </section>
  )
}
