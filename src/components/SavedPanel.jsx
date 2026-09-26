import { useState } from 'react'
import { Search } from 'lucide-react'
import SongRow from './SongRow'

export default function SavedPanel({ songs, onSeeAll }) {
  const [query, setQuery] = useState('')
  const shown = songs.filter((s) => s.title.toLowerCase().includes(query.toLowerCase())).slice(0, 6)

  return (
    <aside className="flex h-full w-[360px] shrink-0 flex-col gap-4 border-l border-line bg-white px-6 py-8">
      <div className="flex items-center justify-between">
        <p className="text-lg font-semibold">Saved songs</p>
        <button type="button" onClick={onSeeAll} className="text-sm underline">
          See all
        </button>
      </div>

      <label className="flex h-11 items-center gap-2.5 rounded-[14px] border border-line px-3.5">
        <Search size={18} className="text-teal" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          className="w-full bg-transparent text-[15px] outline-none placeholder:text-hint"
        />
      </label>

      <div className="flex flex-col gap-2">
        {shown.map((song) => (
          <SongRow key={song.id} song={song} showHeart={false} />
        ))}
      </div>
    </aside>
  )
}
