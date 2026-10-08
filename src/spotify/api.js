import { getAccessToken, logout, ReconnectError } from './auth'
import { normalize } from '../lib/filters'

const BASE = 'https://api.spotify.com/v1'

async function request(pathOrUrl, { method = 'GET', body } = {}) {
  const token = await getAccessToken()
  if (!token) throw new ReconnectError()

  const url = pathOrUrl.startsWith('http') ? pathOrUrl : BASE + pathOrUrl
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body && { 'Content-Type': 'application/json' }),
    },
    body: body && JSON.stringify(body),
  })

  if (res.status === 401) {
    logout()
    throw new ReconnectError()
  }
  if (res.status === 429) {
    const data = await res.json().catch(() => ({}))
    throw new Error(
      data.error?.reason === 'QUOTA_EXCEEDED'
        ? 'Spotify’s usage limit for this app was reached. Try again later.'
        : 'Spotify is busy. Wait a moment, then try again.'
    )
  }
  if (!res.ok) {
    const error = new Error(`Spotify request failed (${res.status}). Try again.`)
    error.status = res.status
    throw error
  }

  const text = await res.text()
  return text ? JSON.parse(text) : null
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
  album: track.album?.name ?? '',
  durationMs: track.duration_ms ?? 0,
  source,
})

export async function getProfile() {
  const me = await request('/me')
  const images = me.images ?? []
  const image = images.find((i) => (i.width ?? 0) >= 72) ?? images[0]
  return { id: me.id, name: me.display_name || me.id, image: image?.url }
}

export async function getLikedSongs(max = 200) {
  const items = await collect('/me/tracks?limit=50', max)
  return items.filter((i) => i.track?.id).map((i) => toSong(i.track, 'spotify'))
}

const toPlaylist = (p) => ({
  id: p.id,
  name: p.name,
  image: p.images?.[0]?.url,
  count: p.items?.total ?? p.tracks?.total ?? null,
  url: p.external_urls?.spotify,
  ownerId: p.owner?.id,
  collaborative: Boolean(p.collaborative),
})

export async function getPlaylists(max = 100) {
  const items = await collect('/me/playlists?limit=50', max)
  return items.filter(Boolean).map(toPlaylist)
}

async function write(path, body, method = 'POST') {
  try {
    return await request(path, { method, body })
  } catch (err) {
    if (err.status === 403) {
      const denied = new Error('Spotify needs permission to edit your playlists.')
      denied.code = 'scope'
      throw denied
    }
    throw err
  }
}

export async function createPlaylist(name) {
  const created = await write('/me/playlists', { name, public: false })
  return { ...toPlaylist(created), count: 0 }
}

export async function addTracks(playlistId, uris) {
  await write(`/playlists/${playlistId}/items`, { uris })
}

export async function removeTracks(playlistId, uris) {
  const items = uris.map((uri) => ({ uri }))
  await write(`/playlists/${playlistId}/items`, { items, tracks: items }, 'DELETE')
}

export class NotOwnedError extends Error {
  constructor() {
    super('Spotify only shares the songs in playlists you own.')
    this.name = 'NotOwnedError'
  }
}

export async function getPlaylistSongs(id, max = 500) {
  try {
    const items = await collect(`/playlists/${id}/items?limit=50`, max)
    return items.flatMap((entry) => {
      const track = entry?.item ?? entry?.track
      if (!track?.id || (track.type && track.type !== 'track')) return []
      return [{ ...toSong(track, 'spotify'), addedAt: entry.added_at ?? null }]
    })
  } catch (err) {
    if (err.status === 403 || err.status === 404) throw new NotOwnedError()
    throw err
  }
}

export async function getListening() {
  const [top, recent, artists] = await Promise.all([
    request('/me/top/tracks?limit=50&time_range=medium_term'),
    request('/me/player/recently-played?limit=50'),
    request('/me/top/artists?limit=50&time_range=medium_term'),
  ])

  const genresByArtist = Object.fromEntries(artists.items.map((a) => [a.id, a.genres ?? []]))
  const seen = new Set()
  const pool = []

  const topIds = new Set(top.items.map((t) => t.id))

  for (const track of [...top.items, ...recent.items.map((i) => i.track)]) {
    if (!track?.id || seen.has(track.id)) continue
    seen.add(track.id)
    const song = toSong(track, 'spotify')
    song.top = topIds.has(track.id)
    song.genres = song.artistIds.flatMap((id) => genresByArtist[id] ?? [])
    pool.push(song)
  }
  return pool
}


export async function getTracks(ids) {
  const results = await Promise.allSettled(ids.map((id) => request(`/tracks/${id}`)))
  return Object.fromEntries(
    results.flatMap((r, i) => (r.status === 'fulfilled' && r.value ? [[ids[i], toSong(r.value, 'spotify')]] : []))
  )
}

export async function searchTrack(title, artist) {
  const params = new URLSearchParams({ q: `track:${title} artist:${artist}`, type: 'track', limit: '5' })
  const data = await request(`/search?${params}`)
  const wantArtist = normalize(artist)
  const wantTitle = normalize(title).slice(0, 14)
  const match = (data?.tracks?.items ?? []).find(
    (t) => t?.id && t.artists.some((a) => normalize(a.name) === wantArtist) && normalize(t.name).startsWith(wantTitle)
  )
  return match ? toSong(match, 'spotify') : null
}
