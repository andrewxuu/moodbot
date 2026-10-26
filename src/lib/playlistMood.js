import { getAudioFeatures } from '../services/reccobeats'
import { getPlaylistSongs } from '../spotify/api'
import { playlistCache } from './playlistCache'
import { FILTERS, firstArtist } from './filters'
import { MODES, averageOf, distance, effectiveMood, stateFor, stateOf, targetFor, targetOf } from './moodTags'
import { llmSongs } from '../services/llmSongs'
import { discoverSongs } from '../picks'
import { applyGenrePrefs, boostLiked, fillGenres, hasGenrePrefs, inGenres, matchGenre, topGenres } from './genreMatch'
import { loadGenrePrefs } from './genrePrefs'

const MAX_PLAYLISTS = 10
const MAX_SONGS = 100
const MIN_SONGS = 3
const FAR = 0.5
const AVOID_SHARE = 0.25
const LIKE_BONUS = 0.04
const GENRE_SONGS = 60
const MIX_GENRES = 2
const MIN_COHESIVE = 8
const PEAK_AT = 0.65
const SWING = 0.08
const FLOW = ['energy', 'valence', 'danceability', 'acousticness']

export const NEW_MIN = 15
export const NEW_MAX = 20

export const moodForStress = (rating) => stateFor({ stress: rating }).mood

const targetFrom = (mood) => (typeof mood === 'string' ? targetOf(mood) : mood)

export const matchPercent = (d) => Math.max(0, Math.round((1 - d / FAR) * 100))
export const isGoodMatch = (d) => d <= FILTERS.maxMoodDistance

async function songsOf(id) {
  if (!playlistCache.has(id)) playlistCache.set(id, await getPlaylistSongs(id))
  return playlistCache.get(id)
}

async function genreShares(songs, prefs) {
  if (!hasGenrePrefs(prefs) || !songs.length) return { avoid: 0, like: 0 }
  const filled = await fillGenres(songs)
  const share = (list) => filled.filter((s) => matchGenre(s.genres, list)).length / filled.length
  return { avoid: share(prefs.avoided), like: share(prefs.liked) }
}

export async function profilePlaylists(playlists, ownerId) {
  const prefs = loadGenrePrefs()
  const owned = playlists.filter((p) => p.ownerId === ownerId && p.count !== 0).slice(0, MAX_PLAYLISTS)
  const results = await Promise.allSettled(
    owned.map(async (playlist) => {
      const songs = (await songsOf(playlist.id)).slice(0, MAX_SONGS)
      const features = await getAudioFeatures(songs.map((s) => s.id))
      const found = songs.map((s) => features[s.id]).filter(Boolean)
      return found.length >= MIN_SONGS ? { playlist, profile: averageOf(found), songs: songs.slice(0, GENRE_SONGS) } : null
    })
  )
  const profiled = results.flatMap((r) => (r.status === 'fulfilled' && r.value ? [r.value] : []))
  const out = []
  for (const { songs, ...rest } of profiled) out.push({ ...rest, ...(await genreShares(songs, prefs)) })
  return out
}

export const rankProfiles = (profiles, mood) => {
  const bonus = (p) => LIKE_BONUS * (p.like ?? 0)
  return profiles
    .filter((p) => (p.avoid ?? 0) <= AVOID_SHARE)
    .map((p) => ({ ...p, distance: distance(p.profile, targetFrom(mood)) }))
    .filter((p) => Number.isFinite(p.distance))
    .sort((a, b) => a.distance - bonus(a) - (b.distance - bonus(b)))
}

export async function closestSongs(songs, mood, n = 25) {
  const features = await getAudioFeatures(songs.map((s) => s.id))
  const limit = FILTERS.maxMoodDistance + FILTERS.relaxBy
  return songs
    .map((song) => ({ song, d: distance(features[song.id], targetFrom(mood)) }))
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

const unique = (songs) => [...new Map(songs.map((s) => [s.id, s])).values()]

const energyCurve = (i, n, base, lifting) => {
  const t = n > 1 ? i / (n - 1) : 0
  if (lifting) return base + SWING - 2 * SWING * t
  return t < PEAK_AT ? base - SWING + 2 * SWING * (t / PEAK_AT) : base + SWING - 3 * SWING * ((t - PEAK_AT) / (1 - PEAK_AT))
}

export function flowGap(a, b) {
  const dims = FLOW.filter((k) => typeof a[k] === 'number' && typeof b[k] === 'number')
  const feel = dims.length ? Math.sqrt(dims.reduce((sum, k) => sum + (a[k] - b[k]) ** 2, 0) / dims.length) : 0
  const pace = typeof a.tempo === 'number' && typeof b.tempo === 'number' ? Math.min(1, Math.abs(a.tempo - b.tempo) / 60) : 0
  return feel + 0.25 * pace
}

export function placeSongs(songs, extra, features) {
  const order = [...songs]
  extra.forEach((song) => {
    const f = features[song.id]
    if (!f) return order.push(song)
    const artist = firstArtist(song.artist)
    let best = order.length
    let bestCost = Infinity
    for (let i = 0; i <= order.length; i++) {
      const prev = order[i - 1]
      const next = order[i]
      const a = prev && features[prev.id]
      const b = next && features[next.id]
      let cost = 1
      if (a && b) cost = flowGap(a, f) + flowGap(f, b) - flowGap(a, b)
      else if (a || b) cost = flowGap(a ?? b, f) + 0.1
      if ((prev && firstArtist(prev.artist) === artist) || (next && firstArtist(next.artist) === artist)) cost += 0.5
      if (cost < bestCost) [best, bestCost] = [i, cost]
    }
    order.splice(best, 0, song)
  })
  return order
}

export async function djOrder(songs, target, lifting) {
  try {
    const features = await getAudioFeatures(songs.map((s) => s.id))
    const withFeatures = songs.filter((s) => features[s.id])
    const rest = songs.filter((s) => !features[s.id])
    if (withFeatures.length < 3) return songs

    const base = typeof target.energy === 'number' ? target.energy : 0.5
    const pool = [...withFeatures]
    const out = []
    while (pool.length) {
      const want = energyCurve(out.length, withFeatures.length, base, lifting)
      const prev = out.at(-1)
      const before = out.at(-2)
      let best = 0
      let bestScore = Infinity
      pool.forEach((song, i) => {
        const f = features[song.id]
        let score = Math.abs((typeof f.energy === 'number' ? f.energy : want) - want)
        if (prev) {
          score += flowGap(features[prev.id], f)
          if (firstArtist(song.artist) === firstArtist(prev.artist)) score += 0.5
          else if (before && firstArtist(song.artist) === firstArtist(before.artist)) score += 0.2
        } else if (!song.isNew) {
          score -= 0.05
        }
        if (score < bestScore) [best, bestScore] = [i, score]
      })
      out.push(pool.splice(best, 1)[0])
    }
    return [...out, ...rest]
  } catch {
    return songs
  }
}

async function anchorGenres(listening, library, prefs) {
  const sample = await fillGenres([...listening.filter((s) => s.top).slice(0, 40), ...listening.slice(0, 40), ...library.slice(0, 80)])
  const ranked = topGenres(sample, 8)
  const preferred = ranked.filter((g) => prefs.liked.includes(g))
  return (preferred.length ? preferred : ranked).slice(0, MIX_GENRES)
}

export async function buildMoodSongs({ mood, state, mode = MODES.match, saved, listening }) {
  const lifting = mode === MODES.lift
  const target = targetFor(mood, lifting, state)
  const library = saved.filter((s) => s.id)
  const prefs = loadGenrePrefs()
  const stayIn = await anchorGenres(listening, library, prefs).catch(() => [])
  let songs = []

  try {
    songs = unique(
      await discoverSongs({ top: listening.filter((s) => s.top), library, pool: listening, mood, state, lifting, stayIn, count: NEW_MAX })
    )
  } catch {
    songs = []
  }

  const fill = async (candidates, genres) => {
    try {
      const have = new Set(songs.map((s) => s.id))
      const { songs: allowed, liked } = await applyGenrePrefs(candidates.filter((s) => !have.has(s.id)), prefs)
      const inStyle = genres.length ? (await fillGenres(allowed)).filter((s) => inGenres(s, genres)) : allowed
      const near = boostLiked(await closestSongs(inStyle, target, NEW_MAX + 10), (s) => liked.has(s.id))
      songs = unique([...songs, ...near.slice(0, NEW_MAX - songs.length)])
    } catch {
      songs = unique(songs)
    }
  }

  if (songs.length < NEW_MIN) await fill(library.slice(0, 200), stayIn)
  if (songs.length < NEW_MIN) await fill(listening.filter((s) => s.id), stayIn)

  if (songs.length < NEW_MIN) {
    try {
      const asked = await llmSongs(stateOf(effectiveMood(mood, lifting)).ask, NEW_MAX - songs.length, songs)
      const allowed = (await applyGenrePrefs(asked, prefs)).songs
      const inStyle = stayIn.length ? (await fillGenres(allowed)).filter((s) => inGenres(s, stayIn)) : allowed
      songs = unique([...songs, ...inStyle])
    } catch {
      songs = unique(songs)
    }
  }

  if (songs.length < MIN_COHESIVE) {
    await fill(library.slice(0, 200), [])
    if (songs.length < MIN_COHESIVE) await fill(listening.filter((s) => s.id), [])
  }

  return djOrder(songs.slice(0, NEW_MAX), target, lifting)
}
