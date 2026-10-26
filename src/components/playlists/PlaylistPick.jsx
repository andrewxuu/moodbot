import { useEffect, useMemo, useState } from 'react'
import SpotifyError from './SpotifyError'
import { useSpotify } from '../../spotify/useSpotify'
import { mixName } from '../../lib/moodTags'
import { buildMoodSongs, isGoodMatch, matchPercent, profilePlaylists, rankProfiles } from '../../lib/playlistMood'

export default function PlaylistPick({ state, savedSongs, onOpen }) {
  const mood = state?.mood ?? null
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

  const best = useMemo(() => (profiles && mood ? rankProfiles(profiles, state.target)[0] : null), [profiles, mood, state])

  const build = async () => {
    setBuilding(true)
    setError(null)
    try {
      const picks = await buildMoodSongs({ mood, state, saved: savedSongs, listening })
      if (!picks.length) throw new Error('Couldn’t find enough songs yet. Try again.')
      const playlist = await createPlaylist(mixName(mood))
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

  const matched = best && isGoodMatch(best.distance)

  return (
    <div className="flex flex-col items-start gap-3">
      {matched ? (
        <MatchCard best={best} onOpen={onOpen} />
      ) : (
        <p className="text-sm text-muted">None of your playlists fit how you feel right now.</p>
      )}
      <button
        type="button"
        onClick={build}
        disabled={building}
        className={
          matched
            ? 'text-sm font-semibold text-teal underline disabled:opacity-50'
            : 'h-10 rounded-full bg-teal px-5 text-[15px] text-white disabled:opacity-50'
        }
      >
        {building ? 'Building…' : matched ? 'Or build a new mix' : 'Build a new mix'}
      </button>
      <SpotifyError error={error} />
    </div>
  )
}

function MatchCard({ best, onOpen }) {
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
      </div>
    </button>
  )
}
