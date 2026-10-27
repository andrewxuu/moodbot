import { Heart } from 'lucide-react'
import AlbumArt from './AlbumArt'
import IconButton from '../ui/IconButton'
import AddToPlaylist from '../playlists/AddToPlaylist'
import SongThumbs from './SongThumbs'
import { usePlayer } from '../../spotify/usePlayer'

const sourceLabel = { chat: 'From chat', spotify: 'From Spotify' }

export default function SongRow({ song, queue, saved, onSave, showHeart = true, variant = 'compact', rating, onRate, downNote }) {
  const { play, currentId } = usePlayer()
  const isCard = variant === 'card'
  const titleColor = currentId === song.id ? 'text-teal' : ''

  const heart = showHeart && (
    <IconButton
      icon={Heart}
      label={saved ? 'Saved' : 'Save song'}
      active={saved}
      onClick={() => onSave?.(song)}
    />
  )
  const plus = <AddToPlaylist song={song} />
  const art = <AlbumArt song={song} size={isCard ? 44 : 40} onPlay={() => (queue ? play(queue, Math.max(0, queue.indexOf(song))) : play(song))} />

  if (isCard) {
    return (
      <div className="flex items-center gap-3 rounded-[14px] border border-line bg-surface px-3.5 py-2.5 sm:gap-4">
        {art}
        <div className="min-w-0 flex-1 sm:w-[360px] sm:flex-none">
          <p className={`truncate text-[15px] font-semibold ${titleColor}`}>{song.title}</p>
          <p className="mt-0.5 truncate text-[13px] text-muted">{song.artist}</p>
        </div>
        <p className="hidden flex-1 text-sm text-muted sm:block">{sourceLabel[song.source]}</p>
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
          <p className={`truncate text-[15px] font-semibold ${titleColor}`}>{song.title}</p>
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
