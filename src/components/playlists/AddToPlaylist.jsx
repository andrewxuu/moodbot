import { useEffect, useRef, useState } from 'react'
import { Check, Plus, Search } from 'lucide-react'
import IconButton from '../ui/IconButton'
import NewPlaylistForm from './NewPlaylistForm'
import SpotifyError from './SpotifyError'
import { useSpotify } from '../../spotify/useSpotify'
import { matchesSearch } from '../../lib/search'

export default function AddToPlaylist({ song }) {
  const { status, profile, playlists, addToPlaylist, createPlaylist, connect } = useSpotify()
  const [open, setOpen] = useState(false)
  const [openUp, setOpenUp] = useState(false)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [added, setAdded] = useState(() => new Set())
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState(null)
  const box = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (!box.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = () => {
    if (!open) {
      const rect = box.current.getBoundingClientRect()
      setOpenUp(window.innerHeight - rect.bottom < 380)
      setQuery('')
      setCreating(false)
      setError(null)
    }
    setOpen(!open)
  }

  const markAdded = (id) => setAdded((prev) => new Set(prev).add(id))

  const add = async (playlist) => {
    if (added.has(playlist.id) || busyId) return
    setBusyId(playlist.id)
    setError(null)
    try {
      await addToPlaylist(playlist.id, song)
      markAdded(playlist.id)
    } catch (err) {
      setError(err)
    } finally {
      setBusyId(null)
    }
  }

  const create = async (name) => {
    const playlist = await createPlaylist(name)
    await addToPlaylist(playlist.id, song)
    markAdded(playlist.id)
    setCreating(false)
  }

  const needsSpotify = status === 'disconnected' || status === 'expired'
  const mine = playlists.filter((p) => p.ownerId === profile?.id || p.collaborative)
  const shown = mine.filter((p) => matchesSearch(query, p.name))

  return (
    <div ref={box} className="relative shrink-0">
      <IconButton icon={Plus} label="Add to playlist" active={open} onClick={toggle} />
      {open && (
        <div
          className={`absolute right-0 z-30 w-[300px] rounded-[14px] border border-line bg-surface p-3 shadow-lg ${
            openUp ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          {needsSpotify ? (
            <div className="flex flex-col gap-3 p-1">
              <p className="text-[15px] text-muted">Connect Spotify to add songs to playlists.</p>
              <button type="button" onClick={connect} className="h-10 rounded-full bg-teal text-[15px] text-white">
                Connect Spotify
              </button>
            </div>
          ) : creating ? (
            <div className="flex flex-col gap-3 p-1">
              <p className="text-[15px] font-semibold">New playlist</p>
              <NewPlaylistForm onCreate={create} onCancel={() => setCreating(false)} submitLabel="Create and add" />
            </div>
          ) : (
            <>
              <p className="px-1 pb-2 text-[15px] font-semibold">Add to playlist</p>
              <label className="flex h-10 items-center gap-2 rounded-[10px] border border-line px-2.5">
                <Search size={16} className="text-teal" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a playlist"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-hint"
                />
              </label>
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="mt-2 flex h-10 w-full items-center gap-2 rounded-[10px] px-2 text-[15px] font-semibold text-teal hover:bg-teal-soft"
              >
                <Plus size={16} />
                New playlist
              </button>
              <ul className="mt-1 max-h-[220px] overflow-y-auto">
                {shown.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => add(p)}
                      disabled={busyId === p.id}
                      className="flex h-11 w-full items-center gap-2.5 rounded-[10px] px-2 text-left hover:bg-teal-soft"
                    >
                      {p.image ? (
                        <img src={p.image} alt="" className="size-8 shrink-0 rounded-md object-cover" />
                      ) : (
                        <div className="size-8 shrink-0 rounded-md bg-art" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                      {added.has(p.id) && <Check size={16} className="shrink-0 text-teal" aria-label="Added" />}
                    </button>
                  </li>
                ))}
                {!shown.length && (
                  <li className="px-2 py-3 text-sm text-muted">{mine.length ? `No playlists match “${query}”.` : 'No playlists yet.'}</li>
                )}
              </ul>
              {error && (
                <div className="px-1 pt-2">
                  <SpotifyError error={error} />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
