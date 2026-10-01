import { useSpotify } from '../../spotify/useSpotify'

export default function SpotifyError({ error }) {
  const { connect } = useSpotify()
  if (!error) return null

  return (
    <p role="alert" className="text-[13px] text-muted">
      {error.message}
      {error.code === 'scope' && (
        <button type="button" onClick={connect} className="ml-1.5 font-semibold text-teal underline">
          Reconnect
        </button>
      )}
    </p>
  )
}
