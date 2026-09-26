import { useChartTooltip, weekTip } from '../ui/ChartTooltip'
import { buildWeeks, moodBg, moodLabel, scoreMood, startOfToday, weekAverage, weekIsUpcoming } from '../../lib/moodMonth'

const shortDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export default function MoodWeeks({ monthStart }) {
  const today = startOfToday()
  const weeks = buildWeeks(monthStart, today)
  const { ref, bind, tooltip } = useChartTooltip()

  return (
    <div ref={ref} className="relative flex flex-col gap-2">
      <div className="flex h-[220px] items-end gap-4 px-1.5">
        {weeks.map((week, i) => {
          const avg = weekAverage(week)
          if (!avg) {
            return (
              <div
                key={i}
                className="flex h-[44px] flex-1 items-center justify-center rounded-md border border-dashed border-line text-[11px] text-hint"
              >
                {weekIsUpcoming(week) ? 'Upcoming' : 'No check-ins'}
              </div>
            )
          }
          const mood = scoreMood[Math.round(avg)]
          return (
            <button
              type="button"
              key={i}
              aria-label={`Week ${i + 1}: average ${moodLabel(mood)}, ${avg.toFixed(1)}`}
              {...bind(weekTip(i, week.filter(Boolean), avg, week.filter((c) => c?.checkIn).length))}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            >
              <span className="text-xs tabular-nums text-muted">{avg.toFixed(1)}</span>
              <span style={{ height: (avg / 5) * 190 }} className={`w-full rounded-b-[2px] rounded-t-md ${moodBg[mood]}`} />
            </button>
          )
        })}
      </div>
      <div className="flex gap-4 px-1.5 text-center text-xs text-muted">
        {weeks.map((week, i) => {
          const days = week.filter(Boolean)
          return (
            <div key={i} className="flex-1">
              <p className="font-semibold text-ink">Week {i + 1}</p>
              <p className="mt-0.5">
                {shortDate(days[0].date)}–{days.at(-1).date.getDate()}
              </p>
            </div>
          )
        })}
      </div>
      {tooltip}
    </div>
  )
}
