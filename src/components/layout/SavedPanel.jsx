import { useEffect, useState } from 'react'
import { PanelRightClose, PanelRightOpen, Search, X } from 'lucide-react'
import AlbumArt from '../songs/AlbumArt'
import IconButton from '../ui/IconButton'
import SongRow from '../songs/SongRow'
import { usePlayer } from '../../spotify/usePlayer'
import { matchesSearch } from '../../lib/search'

const COLLAPSED_KEY = 'moodbot:saved-panel-collapsed'
const LIMIT = 11

function PanelBody({ songs, onSeeAll, action }) {
  const [query, setQuery] = useState('')
  const shown = songs.filter((s) => matchesSearch(query, s.title, s.artist, s.album)).slice(0, LIMIT)

  return (
    <>
      <div className="flex items-center gap-3">
        <p className="flex-1 text-lg font-semibold">Saved songs</p>
        {action}
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
    </>
  )
}

export default function SavedPanel({ songs, onSeeAll, drawerOpen = false, onCloseDrawer }) {
  const { open } = usePlayer()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === 'true')

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, String(collapsed))
  }, [collapsed])

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e) => e.key === 'Escape' && onCloseDrawer?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen, onCloseDrawer])

  const drawer = drawerOpen && (
    <div className="fixed inset-0 z-40 xl:hidden">
      <button type="button" aria-label="Close saved songs" onClick={onCloseDrawer} className="absolute inset-0 bg-black/40" />
      <aside
        role="dialog"
        aria-label="Saved songs"
        className="absolute inset-x-0 bottom-0 flex max-h-[85vh] animate-sheet-up flex-col gap-4 rounded-t-[20px] bg-surface px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6 motion-reduce:animate-none md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[400px] md:animate-sheet-in md:rounded-none md:px-6 md:py-8"
      >
        <PanelBody
          songs={songs}
          onSeeAll={() => {
            onCloseDrawer?.()
            onSeeAll()
          }}
          action={<IconButton icon={X} label="Close saved songs" size={36} onClick={onCloseDrawer} />}
        />
      </aside>
    </div>
  )

  if (collapsed) {
    return (
      <>
        <aside
          aria-label="Saved songs"
          className="hidden h-full w-16 shrink-0 flex-col items-center gap-3 overflow-y-auto border-l border-line bg-surface py-8 xl:flex"
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
        {drawer}
      </>
    )
  }

  return (
    <>
      <aside
        aria-label="Saved songs"
        className="hidden h-full w-[400px] shrink-0 flex-col gap-4 border-l border-line bg-surface px-6 py-8 xl:flex"
      >
        <PanelBody
          songs={songs}
          onSeeAll={onSeeAll}
          action={<IconButton icon={PanelRightClose} label="Hide saved songs" size={36} onClick={() => setCollapsed(true)} />}
        />
      </aside>
      {drawer}
    </>
  )
}
