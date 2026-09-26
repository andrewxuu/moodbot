import { getAccessToken, logout, ReconnectError } from './auth'

const BASE = 'https://api.spotify.com/v1'

async function request(pathOrUrl) {
  const token = await getAccessToken()
  if (!token) throw new ReconnectError()

  const url = pathOrUrl.startsWith('http') ? pathOrUrl : BASE + pathOrUrl
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })

  if (res.status === 401) {
    logout()
    throw new ReconnectError()
  }
  if (res.status === 429) {
    const body = await res.json().catch(() => ({}))
    throw new Error(
      body.error?.reason === 'QUOTA_EXCEEDED'
        ? 'Spotify’s usage limit for this app was reached. Try again later.'
        : 'Spotify is busy. Wait a moment, then sync again.'
    )
  }
  if (!res.ok) throw new Error(`Spotify request failed (${res.status}). Try syncing again.`)
  return res.json()
}

async function collect(path, max) {
  const items = []
  let next = path
  while (next && items.length < max) {
    const page = await request(next)
    items.push(...page.items)
    next = page.next
  }
  return items.slice(0, max)
}

const toSong = (track, source) => ({
  id: track.id,
  uri: track.uri,
  title: track.name,
  artist: track.artists.map((a) => a.name).join(', '),
  artistIds: track.artists.map((a) => a.id),
  image: track.album?.images?.at(-1)?.url,
  source,
})

export async function getProfile() {
  const me = await request('/me')
  const images = me.images ?? []
  const image = images.find((i) => (i.width ?? 0) >= 72) ?? images[0]
  return { name: me.display_name || me.id, image: image?.url }
}

export async function getLikedSongs(max = 200) {
  const items = await collect('/me/tracks?limit=50', max)
  return items.filter((i) => i.track?.id).map((i) => toSong(i.track, 'spotify'))
}

export async function getPlaylists(max = 100) {
  const items = await collect('/me/playlists?limit=50', max)
  return items.filter(Boolean).map((p) => ({
    id: p.id,
    name: p.name,
    image: p.images?.[0]?.url,
    count: p.items?.total ?? p.tracks?.total ?? null,
    url: p.external_urls?.spotify,
  }))
}

export async function getListening() {
  const [top, recent, artists] = await Promise.all([
    request('/me/top/tracks?limit=50&time_range=short_term'),
    request('/me/player/recently-played?limit=50'),
    request('/me/top/artists?limit=50&time_range=medium_term'),
  ])

  const genresByArtist = Object.fromEntries(artists.items.map((a) => [a.id, a.genres ?? []]))
  const seen = new Set()
  const pool = []

  for (const track of [...top.items, ...recent.items.map((i) => i.track)]) {
    if (!track?.id || seen.has(track.id)) continue
    seen.add(track.id)
    const song = toSong(track, 'spotify')
    song.genres = song.artistIds.flatMap((id) => genresByArtist[id] ?? [])
    pool.push(song)
  }
  return pool
}