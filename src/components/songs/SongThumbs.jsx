import { ThumbsDown, ThumbsUp } from 'lucide-react'

const base = 'flex h-[34px] w-9 items-center justify-center'

export default function SongThumbs({ song, rating, onRate }) {
  const toggle = (value) => onRate(rating === value ? null : value)

  return (
    <div role="group" aria-label={`Rate ${song.title}`} className="flex shrink-0 overflow-hidden rounded-full border border-line bg-surface">
      <button
        type="button"
        aria-label="More like this song"
        aria-pressed={rating === 'up'}
        onClick={() => toggle('up')}
        className={`${base} ${rating === 'up' ? 'bg-teal text-white' : 'text-teal hover:bg-teal-soft'}`}
      >
        <ThumbsUp size={16} fill={rating === 'up' ? 'currentColor' : 'none'} />
      </button>
      <button
        type="button"
        aria-label="Less like this song"
        aria-pressed={rating === 'down'}
        onClick={() => toggle('down')}
        className={`${base} border-l border-line ${rating === 'down' ? 'bg-muted text-white' : 'text-teal hover:bg-teal-soft'}`}
      >
        <ThumbsDown size={16} fill={rating === 'down' ? 'currentColor' : 'none'} />
      </button>
    </div>
  )
}
