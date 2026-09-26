import { Heart, Plus, X } from 'lucide-react'
import AlbumArt from './songs/AlbumArt'
import IconButton from './IconButton'
import SongThumbs from './SongThumbs'
import SpotifyEmbed from './SpotifyEmbed'
import { usePlayer } from '../spotify/usePlayer'

const sourceLabel = { chat: 'From chat', spotify: 'From Spotify' }

export default function SongRow({ song, slot = 'list', saved, onSave, showHeart = true, variant = 'compact', rating, onRate, downNote }) {
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

  const disliked = rating === 'down'

  return (
    <div className="flex items-center gap-3">
      <div className={`flex min-w-0 flex-1 items-center gap-3 ${disliked ? 'opacity-50' : ''}`}>
      {art}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-[15px] font-semibold">{song.title}</p>
          {song.isNew && (
            <span className="shrink-0 rounded-full bg-teal-soft px-1.5 py-0.5 text-[11px] font-semibold text-teal">New</span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[13px] text-muted">{disliked && downNote ? downNote : song.artist}</p>
      </div>
      </div>
      {onRate && <SongThumbs song={song} rating={rating} onRate={onRate} />}
      {heart}
      {plus}
    </div>
  )
}
