import { recommendSongs } from '../services/llmSongs'
import { getAudioFeatures } from '../services/reccobeats'
import { MODES, distance, targetFor } from './moodTags'
import { firstArtist } from './filters'

const PICKS = 3

export async function requestPicks({ request, mood, state, mode, taste, avoid, skip }) {
  const found = await recommendSongs({ request, mood, artists: taste, avoid, count: PICKS * 2 })
  const seen = new Set()
  const fresh = found.filter((s) => {
    if (skip.has(s.id) || seen.has(s.id)) return false
    seen.add(s.id)
    return true
  })
  if (fresh.length <= PICKS) return fresh

  const target = targetFor(mood, mode === MODES.lift && Boolean(mood), state)
  if (!Object.keys(target).length) return fresh.slice(0, PICKS)

  const features = await getAudioFeatures(fresh.map((s) => s.id)).catch(() => ({}))
  const gap = (s) => {
    const d = distance(features[s.id], target)
    return Number.isFinite(d) ? d : 1
  }
  const ranked = [...fresh].sort((a, b) => gap(a) - gap(b))
  const out = []
  const artists = new Set()
  for (const s of ranked) {
    const artist = firstArtist(s.artist).toLowerCase()
    if (artists.has(artist) && ranked.length - out.length > PICKS - out.length) continue
    artists.add(artist)
    out.push(s)
    if (out.length === PICKS) break
  }
  return out
}

export const topArtists = (songs) => [...new Set(songs.slice(0, 20).map((s) => firstArtist(s.artist)))].slice(0, 8)
