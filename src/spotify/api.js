import { getAccessToken, logout, ReconnectError } from './auth'
import { normalize } from '../lib/filters'

const BASE = 'https://api.spotify.com/v1'

const MAX_ACTIVE = 3
const SHORT_WAIT = 5
const DEFAULT_COOLDOWN = 30
const MAX_COOLDOWN = 3600
const COOLDOWN_KEY = 'moodbot:spotify-cooldown'
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID

let active = 0
const waiting = []
const inflight = new Map()

const takeSlot = () =>
  new Promise((resolve) => {
    if (active < MAX_ACTIVE) {
      active++
      resolve()
    } else {
      waiting.push(resolve)
    }
  })

const freeSlot = () => {
  const next = waiting.shift()
  if (next) next()
  else active--
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function readCooldown() {
  try {
    const saved = JSON.parse(localStorage.getItem(COOLDOWN_KEY))
    return saved?.clientId === CLIENT_ID ? saved : null
  } catch {
    return null
  }
}

function startCooldown(seconds, quota) {
  try {
    localStorage.setItem(COOLDOWN_KEY, JSON.stringify({ until: Date.now() + seconds * 1000, quota, clientId: CLIENT_ID }))
  } catch {
    return
  }
}

export const cooldownLeft = () => Math.max(0, (readCooldown()?.until ?? 0) - Date.now())

function waitText(ms) {
  const minutes = Math.ceil(ms / 60000)
  if (minutes <= 1) return 'a minute'
  if (minutes < 60) return `${minutes} minutes`
  return `${Math.ceil(minutes / 60)} hours`
}

function busyError(ms, quota = Boolean(readCooldown()?.quota)) {
  const error = new Error(
    quota
      ? `Spotify’s usage limit for this app was reached. Try again in about ${waitText(ms)}.`
      : `Spotify asked Muse to slow down. Try again in about ${waitText(ms)}.`
  )
  error.status = 429
  error.quota = quota
  error.cooldown = true
  error.retryAfter = Math.ceil(ms / 1000)
  return error
}

async function execute(url, method, body, attempt = 0) {
  const left = cooldownLeft()
  if (left > 0) throw busyError(left)

  const token = await getAccessToken()
  if (!token) throw new ReconnectError()

  await takeSlot()
  let res
  try {
    res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body && { 'Content-Type': 'application/json' }),
      },
      body: body && JSON.stringify(body),
    })
  } finally {
    freeSlot()
  }

  if (res.status === 401) {
    logout()
    throw new ReconnectError()
  }
  if (res.status === 429) {
    const data = await res.json().catch(() => ({}))
    const quota = data.error?.reason === 'QUOTA_EXCEEDED'
    const header = Number(res.headers.get('Retry-After')) || 0
    if (header && header <= SHORT_WAIT && attempt < 2 && !quota) {
      await sleep(header * 1000)
      return execute(url, method, body, attempt + 1)
    }
    const seconds = Math.min(MAX_COOLDOWN, header || DEFAULT_COOLDOWN)
    startCooldown(seconds, quota)
    throw busyError(seconds * 1000, quota)
  }
  if (!res.ok) {
    const error = new Error(`Spotify request failed (${res.status}). Try again.`)
    error.status = res.status
    throw error
  }

  const text = await res.text()
  return text ? JSON.parse(text) : null
}

async function request(pathOrUrl, { method = 'GET', body } = {}) {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : BASE + pathOrUrl
  if (method !== 'GET') return execute(url, method, body)

  if (!inflight.has(url)) {
    const run = execute(url, method, body)
    const clear = () => inflight.delete(url)
    run.then(clear, clear)
    inflight.set(url, run)
  }
  return inflight.get(url)
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

export async function getLikedSongs(max = 200, offset = 0) {
  const items = await collect(`/me/tracks?limit=50&offset=${offset}`, max)
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

export async function createPlaylist(name, description = 'Created with Muse') {
  const created = await write('/me/playlists', { name, description, public: false })
  return { ...toPlaylist(created), count: 0 }
}

async function libraryWrite(id, method) {
  try {
    await write(`/me/library?uris=${encodeURIComponent(`spotify:track:${id}`)}`, undefined, method)
  } catch (err) {
    if (err.code === 'scope' || (err.status !== 400 && err.status !== 404)) throw err
    await write('/me/tracks', { ids: [id] }, method)
  }
}

export async function startPlayback(deviceId, uris, position = 0) {
  await request(`/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
    method: 'PUT',
    body: { uris, offset: { position } },
  })
}

export const likeTrack = (id) => libraryWrite(id, 'PUT')
export const unlikeTrack = (id) => libraryWrite(id, 'DELETE')

const playlistLibraryUri = (id) => encodeURIComponent(`spotify:playlist:${id}`)

async function playlistLibraryWrite(id, method) {
  try {
    await write(`/me/library?uris=${playlistLibraryUri(id)}`, undefined, method)
  } catch (err) {
    if (err.code === 'scope' || (err.status !== 400 && err.status !== 404)) throw err
    await write(`/playlists/${id}/followers`, method === 'PUT' ? { public: false } : undefined, method)
  }
}

export const deletePlaylist = (id) => playlistLibraryWrite(id, 'DELETE')
export const restorePlaylist = (id) => playlistLibraryWrite(id, 'PUT')

export async function addTracks(playlistId, uris) {
  await write(`/playlists/${playlistId}/items`, { uris })
}

export async function replaceTracks(playlistId, uris) {
  await write(`/playlists/${playlistId}/items`, { uris: uris.slice(0, 100) }, 'PUT')
  for (let i = 100; i < uris.length; i += 100) await addTracks(playlistId, uris.slice(i, i + 100))
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


export async function getArtistGenres(ids) {
  const out = {}
  for (let i = 0; i < ids.length; i += 50) {
    const data = await request(`/artists?ids=${ids.slice(i, i + 50).join(',')}`)
    ;(data.artists ?? []).forEach((a) => a && (out[a.id] = a.genres ?? []))
  }
  return out
}

export async function getTracks(ids) {
  const results = await Promise.allSettled(ids.map((id) => request(`/tracks/${id}`)))
  return Object.fromEntries(
    results.flatMap((r, i) => (r.status === 'fulfilled' && r.value ? [[ids[i], toSong(r.value, 'spotify')]] : []))
  )
}

const searchCache = new Map()

export function searchTrack(title, artist) {
  const key = `${normalize(artist)}|${normalize(title)}`
  if (!searchCache.has(key)) {
    searchCache.set(
      key,
      searchTrackRequest(title, artist).catch((err) => {
        searchCache.delete(key)
        throw err
      })
    )
  }
  return searchCache.get(key)
}

async function searchTrackRequest(title, artist) {
  const params = new URLSearchParams({ q: `track:${title} artist:${artist}`, type: 'track', limit: '5' })
  const data = await request(`/search?${params}`)
  const wantArtist = normalize(artist)
  const wantTitle = normalize(title).slice(0, 14)
  const match = (data?.tracks?.items ?? []).find(
    (t) => t?.id && t.artists.some((a) => normalize(a.name) === wantArtist) && normalize(t.name).startsWith(wantTitle)
  )
  return match ? toSong(match, 'spotify') : null
}
