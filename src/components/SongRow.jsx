import { Heart, Plus } from 'lucide-react'
import AlbumArt from './AlbumArt'
import IconButton from './IconButton'

const sourceLabel = { chat: 'From chat', spotify: 'From Spotify' }

export default function SongRow({ song, saved, onSave, showHeart = true, variant = 'compact' }) {
  const heart = showHeart && (
    <IconButton
      icon={Heart}
      label={saved ? 'Saved' : 'Save song'}
      active={saved}
      onClick={() => onSave?.(song)}
    />
  )
  const plus = <IconButton icon={Plus} label="Add to playlist" />

  if (variant === 'card') {
    return (
      <div className="flex items-center gap-4 rounded-[14px] border border-line bg-white px-3.5 py-2.5">
        <AlbumArt src={song.image} size={44} />
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
      <AlbumArt src={song.image} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold">{song.title}</p>
        <p className="mt-0.5 truncate text-[13px] text-muted">{song.artist}</p>
      </div>
      {heart}
      {plus}
    </div>
  )
}
