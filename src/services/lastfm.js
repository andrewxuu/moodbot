const KEY = import.meta.env.VITE_LASTFM_API_KEY
const BASE = import.meta.env.DEV ? '/lastfm/2.0/' : 'https://ws.audioscrobbler.com/2.0/'
const MAX_IN_FLIGHT = 4
const cache = new Map()

export const isLastfmConfigured = () => Boolean(KEY) && KEY !== 'your-lastfm-key-here'

const asList = (value) => (Array.isArray(value) ? value : value ? [value] : [])

let inFlight = 0
const waiting = []
const takeSlot = () => (inFlight < MAX_IN_FLIGHT ? (inFlight++, Promise.resolve()) : new Promise((r) => waiting.push(r)))
const releaseSlot = () => {
  const next = waiting.shift()
  if (next) next()
  else inFlight--
}

async function send(query) {
  await takeSlot()
  try {
    const res = await fetch(`${BASE}?${query}`)
    if (!res.ok) throw new Error(`Last.fm request failed (${res.status}).`)
    const data = await res.json()
    if (data.error) throw new Error(data.message || 'Last.fm request failed.')
    return data
  } finally {
    releaseSlot()
  }
}

function call(method, params) {
  const query = new URLSearchParams({ method, api_key: KEY, format: 'json', autocorrect: '1', ...params })
  const cacheKey = query.toString()
  if (!cache.has(cacheKey)) {
    cache.set(
      cacheKey,
      send(query).catch((err) => {
        cache.delete(cacheKey)
        throw err
      })
    )
  }
  return cache.get(cacheKey)
}

const toTags = (list) =>
  asList(list)
    .map((t) => ({ name: String(t.name ?? '').toLowerCase().trim(), count: Number(t.count) || 0 }))
    .filter((t) => t.name && t.count > 0)

export async function getSimilarTracks(artist, track, limit = 30) {
  const data = await call('track.getsimilar', { artist, track, limit: String(limit) })
  return asList(data.similartracks?.track).map((t) => ({
    title: t.name,
    artist: t.artist?.name ?? '',
    match: Number(t.match) || 0,
  }))
}

export async function getSimilarArtists(artist, limit = 5) {
  const data = await call('artist.getsimilar', { artist, limit: String(limit) })
  return asList(data.similarartists?.artist).map((a) => ({ name: a.name, match: Number(a.match) || 0 }))
}

export async function getArtistTopTracks(artist, limit = 3) {
  const data = await call('artist.gettoptracks', { artist, limit: String(limit) })
  return asList(data.toptracks?.track).map((t) => ({ title: t.name, artist: t.artist?.name ?? artist }))
}

export async function getTrackTags(artist, track) {
  const data = await call('track.gettoptags', { artist, track })
  return toTags(data.toptags?.tag)
}

export async function getArtistTags(artist) {
  const data = await call('artist.gettoptags', { artist })
  return toTags(data.toptags?.tag)
}

export async function getTagTopTracks(tag, limit = 50, page = 1) {
  const data = await call('tag.gettoptracks', { tag, limit: String(limit), page: String(page) })
  return asList(data.tracks?.track).map((t) => ({ title: t.name, artist: t.artist?.name ?? '' }))
}
