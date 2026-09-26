import { buildWeeks, moodBg, moodLabel as label, scoreMood, startOfToday, weekAverage, weekIsUpcoming } from '../moodMonth'

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function MoodCalendar({ monthStart }) {
  const today = startOfToday()
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
              <span className="text-hint">{weekIsUpcoming(week) ? 'Upcoming' : 'None'}</span>
            )}
          </div>,
        ]
      })}
    </div>
  )
}
