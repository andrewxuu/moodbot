import { sampleCheckIn } from './sampleMoods'

export const moodBg = {
  great: 'bg-mood-great',
  good: 'bg-mood-good',
  okay: 'bg-mood-okay',
  low: 'bg-mood-low',
  awful: 'bg-mood-awful',
}
export const moodHex = { great: '#1c4a86', good: '#4a8ae0', okay: '#84817a', low: '#d97a22', awful: '#b3322a' }
export const scoreMood = ['', 'awful', 'low', 'okay', 'good', 'great']
export const moodLabel = (m) => m[0].toUpperCase() + m.slice(1)

export const startOfToday = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export function buildWeeks(monthStart, today) {
  const year = monthStart.getFullYear()
  const month = monthStart.getMonth()
  const lastDay = new Date(year, month + 1, 0).getDate()
  const cells = Array.from({ length: monthStart.getDay() }, () => null)

  for (let d = 1; d <= lastDay; d++) {
    const date = new Date(year, month, d)
    cells.push({ date, future: date > today, checkIn: sampleCheckIn(date, today) })
  }
  while (cells.length % 7) cells.push(null)

  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export function weekAverage(week) {
  const scores = week.filter((c) => c?.checkIn).map((c) => c.checkIn.score)
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null
}

export const weekIsUpcoming = (week) => !week.some((c) => c && !c.future)
