import { sampleCheckIn } from '../sampleMoods'

const moodBg = {
  great: 'bg-mood-great',
  good: 'bg-mood-good',
  okay: 'bg-mood-okay',
  low: 'bg-mood-low',
  awful: 'bg-mood-awful',
}
const scoreMood = ['', 'awful', 'low', 'okay', 'good', 'great']
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const label = (m) => m[0].toUpperCase() + m.slice(1)

function buildWeeks(monthStart, today) {
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

const weekAverage = (week) => {
  const scores = week.filter((c) => c?.checkIn).map((c) => c.checkIn.score)
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null
}

export default function MoodCalendar({ monthStart }) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weeks = buildWeeks(monthStart, today)

  return (
    <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_72px] gap-1.5 text-xs">
      {weekdays.map((d) => (
        <span key={d} className="pb-1 text-center text-muted">
          {d}
        </span>
      ))}
      <span className="pb-1 text-center text-muted">Week avg</span>

      {weeks.map((week, w) => {
        const avg = weekAverage(week)
        return [
          ...week.map((cell, i) => {
            if (!cell) return <span key={`${w}-${i}`} />
            const { date, future, checkIn } = cell
            const day = date.getDate()
            const isToday = date.getTime() === today.getTime()
            const ring = isToday ? 'ring-2 ring-ink ring-offset-2' : ''
            const name = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

            if (checkIn) {
              return (
                <div
                  key={`${w}-${i}`}
                  aria-label={`${name}: ${label(checkIn.mood)}`}
                  className={`flex h-10 items-start justify-end rounded-lg px-1.5 py-1 font-semibold text-white ${moodBg[checkIn.mood]} ${ring}`}
                >
                  {day}
                </div>
              )
            }
            return (
              <div
                key={`${w}-${i}`}
                aria-label={`${name}: ${future ? 'upcoming' : 'no check-in'}`}
                className={`flex h-10 items-start justify-end rounded-lg px-1.5 py-1 text-hint ${
                  future ? 'border border-dashed border-line' : 'border border-line bg-cream'
                } ${ring}`}
              >
                {day}
              </div>
            )
          }),
          <div key={`avg-${w}`} className="flex items-center justify-center gap-1.5 text-muted">
            {avg ? (
              <>
                <span className={`size-2.5 rounded-full ${moodBg[scoreMood[Math.round(avg)]]}`} />
                <span className="tabular-nums text-ink">{avg.toFixed(1)}</span>
              </>
            ) : (
              <span className="text-hint">{week.some((c) => c && !c.future) ? 'None' : 'Upcoming'}</span>
            )}
          </div>,
        ]
      })}
    </div>
  )
}
