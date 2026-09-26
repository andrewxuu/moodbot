import { buildWeeks, moodHex, moodLabel, scoreMood, startOfToday, weekAverage } from '../moodMonth'

const W = 720
const H = 220
const LEFT = 44
const TOP = 8
const BOTTOM = 22
const y = (score) => TOP + (H - TOP - BOTTOM) * (1 - score / 5)

export default function MoodDaily({ monthStart }) {
  const today = startOfToday()
  const weeks = buildWeeks(monthStart, today)
  const days = weeks.flat().filter(Boolean)
  const slot = (W - LEFT) / days.length
  const x = (day) => LEFT + (day - 1) * slot
  const ticks = [1, 8, 15, 22, 29].filter((d) => d <= days.length)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Daily moods with weekly average line">
      {[1, 2, 3, 4, 5].map((score) => (
        <g key={score}>
          <line x1={LEFT} x2={W} y1={y(score)} y2={y(score)} stroke="#eae5d8" strokeWidth="1" />
          <text x="0" y={y(score) + 4} fontSize="11" fill="#5b5850">
            {moodLabel(scoreMood[score])}
          </text>
        </g>
      ))}

      <line x1={LEFT} x2={W} y1={y(0)} y2={y(0)} stroke="#d9d4c7" strokeWidth="1" />

      {days.map(({ date, checkIn }) => {
        if (!checkIn) return null
        const top = y(checkIn.score)
        return (
          <rect
            key={date.getDate()}
            x={x(date.getDate()) + 1}
            y={top}
            width={Math.max(2, slot - 2)}
            height={y(0) - top}
            rx="3"
            fill={moodHex[checkIn.mood]}
            opacity="0.85"
          >
            <title>{`${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${moodLabel(checkIn.mood)}`}</title>
          </rect>
        )
      })}

      {weeks.map((week, i) => {
        const avg = weekAverage(week)
        const inMonth = week.filter((c) => c && !c.future)
        if (!avg || !inMonth.length) return null
        const x1 = x(inMonth[0].date.getDate()) + 2
        const x2 = x(inMonth.at(-1).date.getDate()) + slot - 2
        return (
          <g key={i}>
            <line x1={x1} x2={x2} y1={y(avg)} y2={y(avg)} stroke="#1e1d1a" strokeWidth="2" strokeLinecap="round" />
            <circle cx={x2} cy={y(avg)} r="4" fill="#1e1d1a" stroke="#fff" strokeWidth="2">
              <title>{`Week ${i + 1} average: ${avg.toFixed(1)}`}</title>
            </circle>
          </g>
        )
      })}

      {ticks.map((d) => (
        <text key={d} x={x(d) + slot / 2} y={H - 6} fontSize="11" fill="#5b5850" textAnchor="middle">
          {d}
        </text>
      ))}
    </svg>
  )
}
