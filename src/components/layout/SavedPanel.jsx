import { useEffect, useState } from 'react'
import { PanelRightClose, PanelRightOpen, Search } from 'lucide-react'
import AlbumArt from '../songs/AlbumArt'
import IconButton from './IconButton'
import SongRow from '../SongRow'
import { usePlayer } from '../../spotify/usePlayer'
import { matchesSearch } from '../../lib/search'

const COLLAPSED_KEY = 'moodbot:saved-panel-collapsed'
const LIMIT = 11

export default function SavedPanel({ songs, onSeeAll }) {
  const { open } = usePlayer()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === 'true')
  const [query, setQuery] = useState('')

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, String(collapsed))
  }, [collapsed])

  if (collapsed) {
    return (
      <aside
        aria-label="Saved songs"
        className="flex h-full w-16 shrink-0 flex-col items-center gap-3 overflow-y-auto border-l border-line bg-white py-8"
      >
        <IconButton icon={PanelRightOpen} label="Show saved songs" size={40} onClick={() => setCollapsed(false)} />
        {songs.slice(0, LIMIT).map((song) => (
          <AlbumArt
            key={song.id}
            song={song}
            onPlay={() => {
              open(`panel:${song.id}`)
              setCollapsed(false)
            }}
          />
        ))}
      </aside>
    )
  }

  const shown = songs.filter((s) => matchesSearch(query, s.title, s.artist, s.album)).slice(0, LIMIT)

  return (
    <aside
      aria-label="Saved songs"
      className="flex h-full w-[400px] shrink-0 flex-col gap-4 border-l border-line bg-white px-6 py-8"
    >
      <div className="flex items-center gap-3">
        <p className="flex-1 text-lg font-semibold">Saved songs</p>
        <IconButton icon={PanelRightClose} label="Hide saved songs" size={36} onClick={() => setCollapsed(true)} />
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

      <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
        {shown.length ? (
          <div className="flex flex-col gap-2">
            {shown.map((song) => (
              <SongRow key={song.id} song={song} slot="panel" showHeart={false} />
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-muted">
            {songs.length ? 'No matches.' : 'Tap the heart on a song to save it here.'}
          </p>
        )}
      </div>

      {songs.length > 0 && (
        <button type="button" onClick={onSeeAll} className="self-center text-sm underline">
          See all {songs.length} saved songs
        </button>
      )}
    </aside>
  )
}