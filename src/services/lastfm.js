const KEY = import.meta.env.VITE_LASTFM_API_KEY
const BASE = import.meta.env.DEV ? '/lastfm/2.0/' : 'https://ws.audioscrobbler.com/2.0/'
const cache = new Map()

export const isLastfmConfigured = () => Boolean(KEY) && KEY !== 'your-lastfm-key-here'

const asList = (value) => (Array.isArray(value) ? value : value ? [value] : [])

async function call(method, params) {
  const query = new URLSearchParams({ method, api_key: KEY, format: 'json', autocorrect: '1', ...params })
  const cacheKey = query.toString()
  if (cache.has(cacheKey)) return cache.get(cacheKey)

  const res = await fetch(`${BASE}?${query}`)
  if (!res.ok) throw new Error(`Last.fm request failed (${res.status}).`)
  const data = await res.json()
  if (data.error) throw new Error(data.message || 'Last.fm request failed.')

  cache.set(cacheKey, data)
  return data
}

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
