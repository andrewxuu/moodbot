import { checkInsBetween, daysBetween } from '../data/sampleMoods'

export function periodStats(start, end, today) {
  const days = daysBetween(start, end).length
  const checkIns = checkInsBetween(start, end, today)
  if (!checkIns.length) return { days, count: 0, songs: 0, avg: null, mostCommon: null, best: null }

  const avg = checkIns.reduce((sum, c) => sum + c.score, 0) / checkIns.length

  const counts = {}
  checkIns.forEach((c) => (counts[c.mood] = (counts[c.mood] ?? 0) + 1))
  const byCount = checkIns
    .map((c) => ({ mood: c.mood, score: c.score, count: counts[c.mood] }))
    .sort((a, b) => b.count - a.count || b.score - a.score)
  const mostCommon = { mood: byCount[0].mood, count: byCount[0].count }

  const best = checkIns.reduce((top, c) => (c.score >= top.score ? c : top), checkIns[0])

  return {
    days,
    count: checkIns.length,
    songs: checkIns.reduce((sum, c) => sum + c.songs, 0),
    avg,
    mostCommon,
    best: { date: best.date, mood: best.mood },
  }
}
