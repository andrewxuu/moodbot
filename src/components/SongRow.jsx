import { Heart, Plus, X } from 'lucide-react'
import AlbumArt from './AlbumArt'
import IconButton from './IconButton'
import SpotifyEmbed from './SpotifyEmbed'
import { usePlayer } from '../spotify/usePlayer'

const sourceLabel = { chat: 'From chat', spotify: 'From Spotify' }

export default function SongRow({ song, slot = 'list', saved, onSave, showHeart = true, variant = 'compact' }) {
  const { openKey, open, close } = usePlayer()
  const key = `${slot}:${song.id}`
  const isOpen = openKey === key && Boolean(song.uri)
  const isCard = variant === 'card'

  if (isOpen) {
    return (
      <div
        className={`flex items-center gap-3 ${isCard ? 'rounded-[14px] border border-line bg-white px-3.5 py-2.5' : ''}`}
      >
        <SpotifyEmbed uri={song.uri} />
        <IconButton icon={X} label="Close player" onClick={close} />
      </div>
    )
  }

  const heart = showHeart && (
    <IconButton
      icon={Heart}
      label={saved ? 'Saved' : 'Save song'}
      active={saved}
      onClick={() => onSave?.(song)}
    />
  )
  const plus = <IconButton icon={Plus} label="Add to playlist" />
  const art = <AlbumArt song={song} size={isCard ? 44 : 40} onPlay={() => open(key)} />

  if (isCard) {
    return (
      <div className="flex items-center gap-4 rounded-[14px] border border-line bg-white px-3.5 py-2.5">
        {art}
        <div className="w-[360px] min-w-0 shrink">
          <p className="truncate text-[15px] font-semibold">{song.title}</p>
          <p className="mt-0.5 truncate text-[13px] text-muted">{song.artist}</p>
        </div>
        <p className="flex-1 text-sm text-muted">{sourceLabel[song.source]}</p>
        {plus}
        {heart}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {art}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold">{song.title}</p>
        <p className="mt-0.5 truncate text-[13px] text-muted">{song.artist}</p>
      </div>
      {heart}
      {plus}
    </div>
  )
}