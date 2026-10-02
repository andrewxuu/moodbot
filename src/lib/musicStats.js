import { dayKey } from '../data/sampleMoods'
import { loadChats } from '../data/sampleChats'

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
    for (const genre of new Set(song.genres)) counts[genre] = (counts[genre] ?? 0) + 1
  }
  return { total: songs.length, withGenres, genres: top(counts, 3) }
}
