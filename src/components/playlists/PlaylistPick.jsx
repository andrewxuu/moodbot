import { useEffect, useMemo, useState } from 'react'
import SpotifyError from './SpotifyError'
import { useSpotify } from '../../spotify/useSpotify'
import { buildMoodSongs, describeProfile, isGoodMatch, matchPercent, profilePlaylists, rankProfiles } from '../../lib/playlistMood'

export default function PlaylistPick({ mood, savedSongs, onOpen }) {
  const { status, profile, playlists, listening, createPlaylist, addSongs } = useSpotify()
  const [profiles, setProfiles] = useState(null)
  const [building, setBuilding] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (status !== 'connected' || !profile?.id) return
    let cancelled = false
    profilePlaylists(playlists, profile.id)
      .then((result) => !cancelled && setProfiles(result))
      .catch(() => !cancelled && setProfiles([]))
    return () => {
      cancelled = true
    }
  }, [status, profile?.id, playlists])

  const best = useMemo(() => (profiles && mood ? rankProfiles(profiles, mood)[0] : null), [profiles, mood])

  const build = async () => {
    setBuilding(true)
    setError(null)
    try {
      const picks = await buildMoodSongs({ mood, saved: savedSongs, listening })
      if (!picks.length) throw new Error(`Couldn’t find enough ${mood.toLowerCase()} songs yet. Try again.`)
      const playlist = await createPlaylist(`${mood} mix`)
      await addSongs(playlist.id, picks)
      onOpen(playlist.id)
    } catch (err) {
      setError(err)
    } finally {
      setBuilding(false)
    }
  }

  if (!mood) return <p className="text-sm text-muted">Rate your stress above to get a playlist pick.</p>
  if (status !== 'connected') return <p className="text-sm text-muted">Connect Spotify to get playlist picks.</p>
  if (!profiles) return <p role="status" className="text-sm text-muted">Finding your best match…</p>

  if (best && isGoodMatch(best.distance)) {
    const { playlist } = best
    return (
      <button type="button" onClick={() => onOpen(playlist.id)} className="flex items-center gap-4 text-left">
        {playlist.image ? (
          <img src={playlist.image} alt="" className="size-16 shrink-0 rounded-[12px] object-cover" />
        ) : (
          <div className="size-16 shrink-0 rounded-[12px] bg-art" />
        )}
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold">
            {playlist.name} <span className="ml-1.5 text-teal">{matchPercent(best.distance)}% match</span>
          </p>
          <p className="mt-0.5 text-[13px] text-muted">
            {playlist.count !== null ? `${playlist.count} songs · ` : ''}
            {describeProfile(best.profile)}
          </p>
        </div>
      </button>
    )
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-sm text-muted">None of your playlists fit {mood.toLowerCase()} well.</p>
      <button
        type="button"
        onClick={build}
        disabled={building}
        className="h-10 rounded-full bg-teal px-5 text-[15px] text-white disabled:opacity-50"
      >
        {building ? 'Building…' : `Build a ${mood.toLowerCase()} mix`}
      </button>
      <SpotifyError error={error} />
    </div>
  )
}
