import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { hasToken, login, logout, ReconnectError } from './auth'
import { addTracks, createPlaylist as createPlaylistRequest, getLikedSongs, getListening, getPlaylists, getProfile, likeTrack, removeTracks, unlikeTrack, deletePlaylist, restorePlaylist } from './api'
import { playlistCache } from '../lib/playlistCache'

const SpotifyContext = createContext(null)
const empty = { profile: null, liked: [], playlists: [], listening: [] }

export function SpotifyProvider({ children }) {
  const [status, setStatus] = useState(hasToken() ? 'syncing' : 'disconnected')
  const [data, setData] = useState(empty)
  const [error, setError] = useState(null)
  const inFlight = useRef(false)

  const sync = useCallback(async () => {
    if (inFlight.current) return
    if (!hasToken()) return setStatus('disconnected')

    inFlight.current = true
    setStatus('syncing')
    setError(null)
    try {
      const [profile, liked, playlists, listening] = await Promise.all([
        getProfile(),
        getLikedSongs(),
        getPlaylists(),
        getListening(),
      ])
      setData({ profile, liked, playlists, listening })
      setStatus('connected')
    } catch (err) {
      setError(err.message)
      setStatus(err instanceof ReconnectError ? 'expired' : 'error')
    } finally {
      inFlight.current = false
    }
  }, [])

  const createPlaylist = useCallback(async (name) => {
    const playlist = await createPlaylistRequest(name)
    setData((prev) => ({ ...prev, playlists: [playlist, ...prev.playlists] }))
    return playlist
  }, [])

  const addSongs = useCallback(async (playlistId, songs) => {
    const uris = songs.map((s) => s.uri ?? (s.id ? `spotify:track:${s.id}` : null)).filter(Boolean)
    if (!uris.length) throw new Error('These songs can’t be added to a playlist.')
    await addTracks(playlistId, uris)
    playlistCache.delete(playlistId)
    setData((prev) => ({
      ...prev,
      playlists: prev.playlists.map((p) => (p.id === playlistId ? { ...p, count: (p.count ?? 0) + uris.length } : p)),
    }))
  }, [])

  const removeSong = useCallback(async (playlistId, song, copies = 1) => {
    await removeTracks(playlistId, [song.uri ?? `spotify:track:${song.id}`])
    playlistCache.delete(playlistId)
    setData((prev) => ({
      ...prev,
      playlists: prev.playlists.map((p) => (p.id === playlistId ? { ...p, count: Math.max(0, (p.count ?? 0) - copies) } : p)),
    }))
  }, [])

  const removePlaylists = useCallback(async (list) => {
    const results = await Promise.allSettled(list.map((p) => deletePlaylist(p.id)))
    const done = list.filter((_, i) => results[i].status === 'fulfilled')
    const failure = results.find((r) => r.status === 'rejected')
    if (done.length) {
      setData((prev) => ({ ...prev, playlists: prev.playlists.filter((p) => !done.some((d) => d.id === p.id)) }))
    }
    if (failure && !done.length) throw failure.reason
    return { done, failed: list.length - done.length }
  }, [])

  const restorePlaylists = useCallback(async (list, order) => {
    const results = await Promise.allSettled(list.map((p) => restorePlaylist(p.id)))
    const back = list.filter((_, i) => results[i].status === 'fulfilled')
    if (back.length) {
      const rank = (p) => (order.includes(p.id) ? order.indexOf(p.id) : order.length)
      setData((prev) => ({
        ...prev,
        playlists: [...prev.playlists, ...back.filter((b) => !prev.playlists.some((p) => p.id === b.id))].sort((a, b) => rank(a) - rank(b)),
      }))
    }
    if (back.length < list.length) throw new Error('Spotify couldn’t restore every playlist. Check your Spotify library.')
  }, [])

  const likeSong = useCallback(async (song) => {
    try {
      await likeTrack(song.id)
      setData((prev) => (prev.liked.some((s) => s.id === song.id) ? prev : { ...prev, liked: [song, ...prev.liked] }))
    } catch (err) {
      setError(err.code === 'scope' ? 'Reconnect Spotify to sync liked songs.' : err.message)
    }
  }, [])

  const unlikeSong = useCallback(async (song) => {
    try {
      await unlikeTrack(song.id)
      setData((prev) => ({ ...prev, liked: prev.liked.filter((s) => s.id !== song.id) }))
    } catch (err) {
      setError(err.code === 'scope' ? 'Reconnect Spotify to sync liked songs.' : err.message)
    }
  }, [])

  const addToPlaylist = useCallback((playlistId, song) => addSongs(playlistId, [song]), [addSongs])

  const connect = useCallback(() => {
    setError(null)
    login().catch((err) => setError(err.message))
  }, [])

  const disconnect = useCallback(() => {
    logout()
    setData(empty)
    setError(null)
    setStatus('disconnected')
  }, [])

  useEffect(() => {
    if (hasToken()) sync()
  }, [sync])

  return (
    <SpotifyContext.Provider value={{ status, error, ...data, sync, connect, disconnect, createPlaylist, addToPlaylist, addSongs, removeSong, likeSong, unlikeSong, removePlaylists, restorePlaylists }}>
      {children}
    </SpotifyContext.Provider>
  )
}

export function useSpotify() {
  const value = useContext(SpotifyContext)
  if (!value) throw new Error('useSpotify must be used inside SpotifyProvider')
  return value
}
