import { useEffect, useState } from 'react'
import { Pause, Play, SkipBack, SkipForward, X } from 'lucide-react'
import { usePlayer } from '../../spotify/usePlayer'
import { useSpotify } from '../../spotify/useSpotify'

const NOTICES = {
  connect: { text: 'Connect Spotify to play songs here.', action: 'Connect' },
  reconnect: { text: 'Reconnect Spotify to play songs here.', action: 'Reconnect' },
  premium: { text: 'Playing songs in Muse needs Spotify Premium.' },
  unsupported: { text: 'This browser can’t play Spotify songs.' },
  starting: { text: 'The player is still starting. Try again in a moment.' },
  error: { text: 'Couldn’t play that song. Try again.' },
}

const frame =
  'fixed inset-x-2 bottom-[calc(3.5rem+env(safe-area-inset-bottom)+0.5rem)] z-20 overflow-hidden rounded-[14px] border border-line bg-surface md:static md:mx-6 md:mb-4 md:shrink-0'

function Progress() {
  const { getPosition, duration } = usePlayer()
  const [position, setPosition] = useState(getPosition)

  useEffect(() => {
    const id = setInterval(() => setPosition(getPosition()), 500)
    return () => clearInterval(id)
  }, [getPosition])

  const percent = duration ? Math.min(100, (position / duration) * 100) : 0
  return (
    <div className="h-[3px] bg-track" aria-hidden="true">
      <div className="h-full bg-teal" style={{ width: `${percent}%` }} />
    </div>
  )
}

function Control({ icon: Icon, label, onClick, disabled, className = '' }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex size-10 shrink-0 items-center justify-center rounded-full text-ink disabled:opacity-40 ${className}`}
    >
      <Icon size={20} fill={Icon === Play || Icon === Pause ? 'currentColor' : 'none'} />
    </button>
  )
}

export default function MiniPlayer() {
  const { current, playing, notice, toggle, next, prev, close, dismissNotice, hasPrev, hasNext } = usePlayer()
  const { connect } = useSpotify()

  if (notice) {
    const { text, action } = NOTICES[notice] ?? NOTICES.error
    return (
      <div role="status" className={`${frame} flex items-center gap-3 px-4 py-3`}>
        <p className="min-w-0 flex-1 text-sm">{text}</p>
        {action && (
          <button type="button" onClick={connect} className="shrink-0 text-sm font-semibold text-teal underline">
            {action}
          </button>
        )}
        <Control icon={X} label="Dismiss" onClick={dismissNotice} />
      </div>
    )
  }

  if (!current) return null

  return (
    <section aria-label="Player" className={frame}>
      <Progress />
      <div className="flex items-center gap-3 px-3 py-2">
        {current.image ? (
          <img src={current.image} alt="" className="size-11 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="size-11 shrink-0 rounded-lg bg-art" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{current.title}</p>
          <p className="mt-0.5 truncate text-[13px] text-muted">{current.artist}</p>
        </div>
        <Control icon={SkipBack} label="Previous song" onClick={prev} disabled={!hasPrev} className="hidden md:flex" />
        <Control
          icon={playing ? Pause : Play}
          label={playing ? 'Pause' : 'Play'}
          onClick={toggle}
          className="bg-teal !text-white"
        />
        <Control icon={SkipForward} label="Next song" onClick={next} disabled={!hasNext} />
        <Control icon={X} label="Close player" onClick={close} />
      </div>
    </section>
  )
}
