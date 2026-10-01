import { getAudioFeatures } from '../services/reccobeats'
import { getPlaylistSongs } from '../spotify/api'
import { playlistCache } from './playlistCache'
import { FILTERS } from './filters'
import { averageOf, distance, targets } from '../picks'

const MAX_PLAYLISTS = 10
const MAX_SONGS = 100
const MIN_SONGS = 3
const FAR = 0.5

export const moodForStress = (rating) => (rating <= 4 ? 'Calm' : rating <= 6 ? 'Focus' : 'Happy')

export const matchPercent = (d) => Math.max(0, Math.round((1 - d / FAR) * 100))
export const isGoodMatch = (d) => d <= FILTERS.maxMoodDistance

async function songsOf(id) {
  if (!playlistCache.has(id)) playlistCache.set(id, await getPlaylistSongs(id))
  return playlistCache.get(id)
}

export async function profilePlaylists(playlists, ownerId) {
  const owned = playlists.filter((p) => p.ownerId === ownerId && p.count !== 0).slice(0, MAX_PLAYLISTS)
  const results = await Promise.allSettled(
    owned.map(async (playlist) => {
      const songs = (await songsOf(playlist.id)).slice(0, MAX_SONGS)
      const features = await getAudioFeatures(songs.map((s) => s.id))
      const found = songs.map((s) => features[s.id]).filter(Boolean)
      return found.length >= MIN_SONGS ? { playlist, profile: averageOf(found) } : null
    })
  )
  return results.flatMap((r) => (r.status === 'fulfilled' && r.value ? [r.value] : []))
}

export const rankProfiles = (profiles, mood) =>
  profiles
    .map((p) => ({ ...p, distance: distance(p.profile, targets[mood]) }))
    .filter((p) => Number.isFinite(p.distance))
    .sort((a, b) => a.distance - b.distance)

export async function closestSongs(songs, mood, n = 25) {
  const features = await getAudioFeatures(songs.map((s) => s.id))
  const limit = FILTERS.maxMoodDistance + FILTERS.relaxBy
  return songs
    .map((song) => ({ song, d: distance(features[song.id], targets[mood]) }))
    .filter((x) => x.d <= limit)
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((x) => x.song)
}

export function describeProfile(p) {
  const traits = []
  if (p.energy < 0.4) traits.push('Low energy')
  else if (p.energy > 0.65) traits.push('High energy')
  if (p.valence > 0.6) traits.push('upbeat')
  else if (p.valence < 0.35) traits.push('moody')
  if (p.acousticness > 0.5) traits.push('acoustic')
  if (p.instrumentalness > 0.5) traits.push('instrumental')
  if (p.danceability > 0.65) traits.push('danceable')
  return traits.slice(0, 3).join(', ') || 'Balanced mix'
}
