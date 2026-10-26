import { useEffect, useMemo, useState } from 'react'
import { dayKey } from '../data/sampleMoods'
import { loadChats } from '../data/sampleChats'
import { firstArtist } from './filters'
import { MAX_LOOKUPS, artistKey, broadGenres, lookupGenres, readGenreCache, saveGenreCache } from './genreMatch'

const top = (counts, n) =>
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)

export const titleCase = (text) => text.charAt(0).toUpperCase() + text.slice(1)

export function chatStats(days) {
  const saved = loadChats()
  const moods = {}
  let chats = 0
  for (const date of days) {
    const messages = saved[dayKey(date)] ?? []
    if (!messages.some((m) => m.from === 'user')) continue
    chats += 1
    for (const m of messages) if (m.from === 'bot' && m.mood) moods[m.mood] = (moods[m.mood] ?? 0) + 1
  }
  return { chats, moods: top(moods, 3) }
}

export function songStats(songs) {
  const counts = {}
  let withGenres = 0
  for (const song of songs) {
    if (!song.genres?.length) continue
    withGenres += 1
    for (const genre of broadGenres(song.genres)) counts[genre] = (counts[genre] ?? 0) + 1
  }
  return { total: songs.length, withGenres, genres: top(counts, 3) }
}

export function useSongGenres(songs) {
  const [known, setKnown] = useState(readGenreCache)

  const wanted = useMemo(() => {
    const seen = new Set()
    return songs
      .flatMap((song) => {
        const key = artistKey(song)
        if (song.genres?.length || !key || known[key] || seen.has(key)) return []
        seen.add(key)
        return [{ key, id: song.artistIds?.[0], name: firstArtist(song.artist) }]
      })
      .slice(0, MAX_LOOKUPS)
  }, [songs, known])
  const need = wanted.map((w) => w.key).join('|')

  useEffect(() => {
    if (!need) return
    let cancelled = false
    lookupGenres(wanted).then((found) => {
      if (!cancelled && Object.keys(found).length) setKnown((prev) => ({ ...prev, ...found }))
    })
    return () => {
      cancelled = true
    }
  }, [need, wanted])

  useEffect(() => {
    saveGenreCache(known)
  }, [known])

  return useMemo(
    () => songs.map((song) => (song.genres?.length ? song : { ...song, genres: known[artistKey(song)] ?? [] })),
    [songs, known]
  )
}
