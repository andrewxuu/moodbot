import { Music } from 'lucide-react'
import { useSpotify } from '../../spotify/useSpotify'

const pill = 'inline-flex h-8 items-center gap-2 self-start rounded-full border px-3 text-[13px]'

export default function SpotifyStatus() {
  const { status, error, connect, sync } = useSpotify()

  if (status === 'connected' || status === 'syncing') {
    return (
      <div role="status" className={`${pill} border-line text-muted`}>
        <Music size={14} />
        {status === 'syncing' ? 'Syncing…' : 'Spotify connected'}
      </div>
    )
  }

  const label = { expired: 'Reconnect Spotify', error: 'Retry sync' }[status] ?? 'Connect Spotify'

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={status === 'error' ? sync : connect}
        className={`${pill} border-teal font-semibold text-teal hover:bg-teal-soft`}
      >
        <Music size={14} />
        {label}
      </button>
      {error && <p className="text-xs text-muted">{error}</p>}
    </div>
  )
}
