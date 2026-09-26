import { dayTip, useChartTooltip, weekTip } from '../ui/ChartTooltip'
import { buildWeeks, moodBg, moodLabel as label, scoreMood, startOfToday, weekAverage, weekIsUpcoming } from '../../lib/moodMonth'

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function MoodCalendar({ monthStart }) {
  const today = startOfToday()
  const weeks = buildWeeks(monthStart, today)
  const { ref, bind, tooltip } = useChartTooltip()

  return (
    <div ref={ref} className="relative grid grid-cols-[repeat(7,minmax(0,1fr))_72px] gap-1.5 text-xs">
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
            const ring = isToday ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : ''
            const name = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

            if (checkIn) {
              return (
                <button
                  type="button"
                  key={`${w}-${i}`}
                  aria-label={`${name}: ${label(checkIn.mood)}`}
                  {...bind(dayTip(date, checkIn))}
                  className={`flex h-10 items-start justify-end rounded-lg px-1.5 py-1 font-semibold text-white hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal ${moodBg[checkIn.mood]} ${ring}`}
                >
                  {day}
                </button>
              )
            }
            return (
              <button
                type="button"
                key={`${w}-${i}`}
                aria-label={`${name}: ${future ? 'upcoming' : 'no check-in'}`}
                {...bind(dayTip(date, null, future))}
                className={`flex h-10 items-start justify-end rounded-lg px-1.5 py-1 text-hint ${
                  future ? 'border border-dashed border-line' : 'border border-line bg-cream'
                } ${ring} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal`}
              >
                {day}
              </button>
            )
          }),
          <div
            key={`avg-${w}`}
            tabIndex={avg ? 0 : -1}
            {...(avg ? bind(weekTip(w, week.filter(Boolean), avg, week.filter((c) => c?.checkIn).length)) : {})}
            className="flex items-center justify-center gap-1.5 rounded-lg text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
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
      {tooltip}
    </div>
  )
}
