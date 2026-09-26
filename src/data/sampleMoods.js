export const moodScore = { great: 1, good: 2, okay: 3, low: 4, awful: 5 }
export const scoreMood = ['', 'great', 'good', 'okay', 'low', 'awful']

const notes = {
  great: ['Best day in a while, want to keep it going', 'Got great news today', 'Feeling unstoppable after the gym'],
  good: ['Pretty solid day overall', 'Hung out with friends after class', 'Productive morning, chill night'],
  okay: ['Just a normal day', 'A little tired but fine', 'Nothing special, need background music'],
  low: ['Long day at work, want something calm', 'Kind of drained today', 'Missing home a bit'],
  awful: ['Rough day, everything went wrong', 'Really stressed about deadlines', 'Could not sleep last night'],
}

export const dayKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export function seeded(key) {
  let h = 2166136261
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

export function sampleCheckIn(date, today = new Date()) {
  const day = startOfDay(date)
  if (day > startOfDay(today)) return null

  const key = dayKey(day)
  const rand = seeded(key)
  if (rand() < 0.15) return null

  const weekend = day.getDay() === 0 || day.getDay() === 6
  const drift = Math.sin(day.getTime() / (1000 * 60 * 60 * 24 * 9)) * 0.6
  const raw = 3.1 + drift + (weekend ? 0.4 : 0) + (rand() - 0.5) * 3.6
  const score = 6 - Math.min(5, Math.max(1, Math.round(raw)))
  const mood = scoreMood[score]
  const options = notes[mood]

  return {
    id: key,
    date: day,
    mood,
    score,
    note: options[Math.floor(rand() * options.length)],
    songs: 2 + Math.floor(rand() * 7),
  }
}

export function daysBetween(start, end) {
  const days = []
  for (let d = startOfDay(start); d <= startOfDay(end); d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    days.push(d)
  }
  return days
}

let realByDay = new Map()

export function setRealRatings(ratings) {
  const map = new Map()
  for (const r of ratings) {
    const key = dayKey(new Date(r.at))
    map.set(key, [...(map.get(key) ?? []), r])
  }
  realByDay = map
}

const bandMood = (rating) => scoreMood[Math.min(4, Math.floor((rating - 1) / 2)) + 1]

function realCheckIn(day, logged) {
  const avg = logged.reduce((sum, r) => sum + r.rating, 0) / logged.length
  const rating = Math.round(avg * 10) / 10
  const count = logged.length
  const latestNote = [...logged].sort((a, b) => b.at.localeCompare(a.at)).find((r) => r.note)?.note
  return {
    id: `real-${dayKey(day)}`,
    date: day,
    mood: bandMood(Math.round(avg)),
    score: Math.max(1, avg / 2),
    rating,
    count,
    real: true,
    note: latestNote ?? '',
    songs: 0,
    meta: `${rating}/10 · ${count} check-in${count === 1 ? '' : 's'}`,
  }
}

export function checkInFor(date, today = new Date()) {
  const day = startOfDay(date)
  const now = startOfDay(today)
  if (day > now) return null
  const logged = realByDay.get(dayKey(day))
  if (logged?.length) return realCheckIn(day, logged)
  if (day >= now) return null
  const sample = sampleCheckIn(day, today)
  if (!sample) return null
  return { ...sample, rating: sample.score * 2, count: 1, real: false, meta: `${sample.songs} songs picked` }
}

export function checkInsBetween(start, end, today = new Date()) {
  return daysBetween(start, end)
    .map((d) => checkInFor(d, today))
    .filter(Boolean)
}

export function whenLabel(date, today = new Date()) {
  const diff = Math.round((startOfDay(today) - startOfDay(date)) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return date.toLocaleDateString('en-US', { weekday: 'short' })
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
