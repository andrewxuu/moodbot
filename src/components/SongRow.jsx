import { Heart, Plus } from 'lucide-react'
import IconButton from './IconButton'

const sourceLabel = { chat: 'From chat', spotify: 'From Spotify' }

export default function SongRow({ song, liked, onLike, showHeart = true, variant = 'compact' }) {
  const heart = showHeart && (
    <IconButton icon={Heart} label="Save song" active={liked} onClick={() => onLike?.(song.id)} />
  )
  const plus = <IconButton icon={Plus} label="Add to playlist" />

  if (variant === 'card') {
    return (
      <div className="flex items-center gap-4 rounded-[14px] border border-line bg-white px-3.5 py-2.5">
        <div className="size-11 shrink-0 rounded-lg bg-art" />
        <div className="w-[360px] shrink-0">
          <p className="text-[15px] font-semibold">{song.title}</p>
          <p className="mt-0.5 text-[13px] text-muted">{song.artist}</p>
        </div>
        <p className="flex-1 text-sm text-muted">{sourceLabel[song.source]}</p>
        {plus}
        {heart}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <div className="size-10 shrink-0 rounded-lg bg-art" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold">{song.title}</p>
        <p className="mt-0.5 truncate text-[13px] text-muted">{song.artist}</p>
      </div>
      {heart}
      {plus}
    </div>
  )
}
