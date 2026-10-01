import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { hasToken, login, logout, ReconnectError } from './auth'
import { addTracks, createPlaylist as createPlaylistRequest, getLikedSongs, getListening, getPlaylists, getProfile } from './api'
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

  const addToPlaylist = useCallback(async (playlistId, song) => {
    const uri = song.uri ?? (song.id ? `spotify:track:${song.id}` : null)
    if (!uri) throw new Error('This song can’t be added to a playlist.')
    await addTracks(playlistId, [uri])
    playlistCache.delete(playlistId)
    setData((prev) => ({
      ...prev,
      playlists: prev.playlists.map((p) => (p.id === playlistId ? { ...p, count: (p.count ?? 0) + 1 } : p)),
    }))
  }, [])

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
    <SpotifyContext.Provider value={{ status, error, ...data, sync, connect, disconnect, createPlaylist, addToPlaylist }}>
      {children}
    </SpotifyContext.Provider>
  )
}

export function useSpotify() {
  const value = useContext(SpotifyContext)
  if (!value) throw new Error('useSpotify must be used inside SpotifyProvider')
  return value
}
