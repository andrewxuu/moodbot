import { getAudioFeatures } from '../services/reccobeats'
import { getPlaylistSongs } from '../spotify/api'
import { playlistCache } from './playlistCache'
import { FILTERS, firstArtist, shuffle } from './filters'
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
const PROFILE_KEY = 'moodbot:playlist-profiles'
const PROFILE_MS = 6 * 60 * 60 * 1000
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

const sampleCache = new Map()

async function sampleOf(id) {
  if (playlistCache.has(id)) return playlistCache.get(id)
  if (!sampleCache.has(id)) sampleCache.set(id, await getPlaylistSongs(id, MAX_SONGS))
  return sampleCache.get(id)
}

function readProfiles() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY)) ?? {}
  } catch {
    return {}
  }
}

function writeProfiles(profiles) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles))
  } catch {
    return
  }
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
  const saved = readProfiles()
  const next = {}
  const results = await Promise.allSettled(
    owned.map(async (playlist) => {
      const hit = saved[playlist.id]
      if (hit && hit.count === playlist.count && Date.now() - hit.at < PROFILE_MS) {
        next[playlist.id] = hit
        return hit.value && { playlist, ...hit.value }
      }
      const songs = (await sampleOf(playlist.id)).slice(0, MAX_SONGS)
      const features = await getAudioFeatures(songs.map((s) => s.id))
      const found = songs.map((s) => features[s.id]).filter(Boolean)
      const value = found.length >= MIN_SONGS ? { profile: averageOf(found), songs: songs.slice(0, GENRE_SONGS) } : null
      if (Object.keys(features).length) next[playlist.id] = { count: playlist.count, at: Date.now(), value }
      return value && { playlist, ...value }
    })
  )
  for (const p of owned) if (!next[p.id] && saved[p.id]) next[p.id] = saved[p.id]
  writeProfiles(next)
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
  return shuffle(preferred.length ? preferred : ranked).slice(0, MIX_GENRES)
}

const RECENT_KEY = 'moodbot:recent-mix'
const RECENT_MAX = 120

function readRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY)) ?? []
  } catch {
    return []
  }
}

function writeRecent(songs) {
  try {
    const ids = [...songs.map((s) => s.id), ...readRecent()].filter(Boolean)
    localStorage.setItem(RECENT_KEY, JSON.stringify([...new Set(ids)].slice(0, RECENT_MAX)))
  } catch {
    return
  }
}

export async function buildMoodSongs({ mood, state, mode = MODES.match, saved, listening }) {
  const lifting = mode === MODES.lift
  const target = targetFor(mood, lifting, state)
  const library = saved.filter((s) => s.id)
  const prefs = loadGenrePrefs()
  const stayIn = await anchorGenres(listening, library, prefs).catch(() => [])
  const recent = readRecent()
  let songs = []

  try {
    songs = unique(
      await discoverSongs({ top: listening.filter((s) => s.top), library, pool: listening, mood, state, lifting, stayIn, count: NEW_MAX, exclude: recent })
    )
  } catch {
    songs = []
  }

  const fill = async (candidates, genres) => {
    try {
      const have = new Set([...songs.map((s) => s.id), ...recent])
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

  const result = await djOrder(songs.slice(0, NEW_MAX), target, lifting)
  writeRecent(result)
  return result
}

const SWAP_SHARE = 0.25
const SWAP_MAX = 15
const SWAP_LIKED = 150

export async function planSwap({ songs, mood, state, lifting, library, listening }) {
  const target = targetFor(mood, lifting, state)
  const features = await getAudioFeatures(songs.slice(0, 200).map((s) => s.id))
  const scored = songs.map((song) => ({ song, d: distance(features[song.id], target) })).filter((x) => Number.isFinite(x.d))
  const count = Math.min(SWAP_MAX, Math.max(1, Math.round(songs.length * SWAP_SHARE)))
  const leaving = [...scored].sort((a, b) => b.d - a.d).slice(0, count)
  if (!leaving.length) return null

  const ids = songs.map((s) => s.id)
  const have = new Set(ids)
  const prefs = loadGenrePrefs()
  const stayIn = await anchorGenres(listening, library, prefs).catch(() => [])

  const fresh = await discoverSongs({ top: listening.filter((s) => s.top), library, pool: listening, mood, state, lifting, stayIn, count: count + 5, exclude: ids }).catch(() => [])
  const freshIds = new Set(fresh.map((s) => s.id))

  let pool = unique([...fresh, ...library.filter((s) => s.id && !have.has(s.id)).slice(0, SWAP_LIKED)]).filter((s) => !have.has(s.id))
  try {
    pool = (await applyGenrePrefs(pool, prefs)).songs
  } catch {
    pool = unique(pool)
  }

  const poolFeatures = await getAudioFeatures(pool.map((s) => s.id)).catch(() => ({}))
  const coming = pool
    .map((song) => ({ song, d: distance(poolFeatures[song.id], target) }))
    .filter((x) => Number.isFinite(x.d))
    .sort((a, b) => a.d - b.d)

  const pairs = []
  leaving.forEach((out, i) => {
    const inn = coming[i]
    if (!inn || inn.d >= out.d) return
    pairs.push({
      id: out.song.id,
      out: { song: out.song, d: out.d },
      inn: { song: { ...inn.song, isNew: freshIds.has(inn.song.id) }, d: inn.d, tag: freshIds.has(inn.song.id) ? 'new' : 'liked' },
    })
  })
  if (!pairs.length) return null

  return { pairs, scored, target, features: { ...features, ...poolFeatures } }
}

export function swapFit(plan, chosen) {
  const swapped = new Map(plan.pairs.filter((p) => chosen.has(p.id)).map((p) => [p.id, p.inn.d]))
  const avg = (list) => (list.length ? Math.round(list.reduce((sum, d) => sum + matchPercent(d), 0) / list.length) : 0)
  return {
    before: avg(plan.scored.map((x) => x.d)),
    after: avg(plan.scored.map((x) => swapped.get(x.song.id) ?? x.d)),
  }
}

export function applySwap(songs, pairs) {
  const replace = new Map(pairs.map((p) => [p.out.song.id, p.inn.song]))
  return songs.map((s) => replace.get(s.id) ?? s)
}
