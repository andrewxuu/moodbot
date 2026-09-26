import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { usePlayer } from '../spotify/usePlayer'
import { useSpotify } from '../spotify/useSpotify'
import SpotifyEmbed from './SpotifyEmbed'

const formatTime = (ms) => {
  const total = Math.floor((ms || 0) / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export default function NowPlaying() {
  const { current, mode, isPaused, position, duration, notice, loginAction, embedRef, onEmbedUpdate, toggle, next, previous } =
    usePlayer()
  const { connect } = useSpotify()

  if (!current || mode === 'idle') return null

  const progress = duration ? Math.min(100, (position / duration) * 100) : 0

  return (
    <section aria-label="Now playing" className="flex flex-col gap-2.5 rounded-[14px] border border-line p-3">
      <p className="text-xs text-muted">Now playing</p>

      {mode === 'embed' ? (
        <>
          <SpotifyEmbed uri={current.uri} controllerRef={embedRef} onUpdate={onEmbedUpdate} />
          <p className="text-xs leading-snug text-muted">{notice}</p>
          {loginAction && (
            <button type="button" onClick={connect} className="self-start text-xs font-semibold text-teal underline">
              {loginAction}
            </button>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center gap-2.5">
            {current.image ? (
              <img src={current.image} alt="" className="size-10 shrink-0 rounded-lg object-cover" />
            ) : (
              <div className="size-10 shrink-0 rounded-lg bg-art" />
            )}
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold">{current.title}</p>
              <p className="truncate text-xs text-muted">{current.artist}</p>
            </div>
          </div>

          <div>
            <div
              role="progressbar"
              aria-label="Song progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
              className="h-1 rounded-full bg-track"
            >
              <div style={{ width: `${progress}%` }} className="h-1 rounded-full bg-teal" />
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-muted">
              <span>{formatTime(position)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3.5 text-teal">
            <button type="button" aria-label="Previous song" onClick={previous} className="p-1">
              <SkipBack size={18} />
            </button>
            <button
              type="button"
              aria-label={isPaused ? 'Play' : 'Pause'}
              onClick={toggle}
              className="flex size-9 items-center justify-center rounded-full bg-teal text-white"
            >
              {isPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
            </button>
            <button type="button" aria-label="Next song" onClick={next} className="p-1">
              <SkipForward size={18} />
            </button>
          </div>
        </>
      )}
    </section>
  )
}
