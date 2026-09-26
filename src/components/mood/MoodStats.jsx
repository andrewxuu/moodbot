import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { moodBg, moodLabel, scoreMood } from '../../lib/moodMonth'

const Dot = ({ mood }) => <span className={`size-2.5 shrink-0 rounded-full ${moodBg[mood]}`} />

function Card({ label, children, sub }) {
  return (
    <div className="flex min-w-0 flex-col rounded-[14px] border border-line bg-surface px-3.5 py-3">
      <p className="text-[13px] text-muted">{label}</p>
      <div className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-lg font-semibold">{children}</div>
      <div className="mt-1 flex items-center gap-1 text-xs text-muted">{sub}</div>
    </div>
  )
}

function AverageChange({ now, before, compareTo }) {
  if (now === null) return 'No check-ins yet'
  if (before === null) return `No check-ins ${compareTo}`
  const diff = now - before
  if (Math.abs(diff) < 0.05) {
    return (
      <>
        <Minus size={14} aria-hidden="true" />
        Same as {compareTo}
      </>
    )
  }
  const Icon = diff > 0 ? TrendingUp : TrendingDown
  return (
    <>
      <Icon size={14} aria-hidden="true" />
      {diff > 0 ? 'Up' : 'Down'} {Math.abs(diff).toFixed(1)} from {compareTo}
    </>
  )
}

export default function MoodStats({ current, previous, compareTo }) {
  const avgMood = current.avg !== null ? scoreMood[Math.round(current.avg)] : null
  const bestDate = current.best?.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const cap = (text) => text[0].toUpperCase() + text.slice(1)

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <Card label="Average mood" sub={<AverageChange now={current.avg} before={previous.avg} compareTo={compareTo} />}>
        {avgMood ? (
          <>
            <Dot mood={avgMood} />
            {moodLabel(avgMood)} <span className="font-normal tabular-nums text-muted">{current.avg.toFixed(1)}</span>
          </>
        ) : (
          '–'
        )}
      </Card>

      <Card
        label="Most common"
        sub={current.mostCommon ? `${current.mostCommon.count} of ${current.count} check-ins` : 'No check-ins yet'}
      >
        {current.mostCommon ? (
          <>
            <Dot mood={current.mostCommon.mood} />
            {moodLabel(current.mostCommon.mood)}
          </>
        ) : (
          '–'
        )}
      </Card>

      <Card label="Best day" sub={current.best ? moodLabel(current.best.mood) : 'No check-ins yet'}>
        {current.best ? (
          <>
            <Dot mood={current.best.mood} />
            <span className="truncate">{bestDate}</span>
          </>
        ) : (
          '–'
        )}
      </Card>

      <Card label="Check-ins" sub={`${cap(compareTo)}: ${previous.count} of ${previous.days}`}>
        {current.count} <span className="font-normal text-muted">of {current.days} days</span>
      </Card>

      <Card label="Songs picked" sub={`${cap(compareTo)}: ${previous.songs}`}>
        {current.songs}
      </Card>
    </div>
  )
}
