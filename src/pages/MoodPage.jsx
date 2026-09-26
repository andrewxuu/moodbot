import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import CheckInList from '../components/mood/CheckInList'
import MoodCalendar from '../components/mood/MoodCalendar'
import MoodDaily from '../components/mood/MoodDaily'
import MoodStats from '../components/mood/MoodStats'
import MoodWeekChart from '../components/mood/MoodWeekChart'
import MoodWeeks from '../components/mood/MoodWeeks'
import SegmentedSwitch from '../components/ui/SegmentedSwitch'
import { moodLevels } from '../data/data'
import { checkInFor, checkInsBetween, daysBetween } from '../data/sampleMoods'
import { periodStats } from '../lib/moodStats'
import { moodLabel as label } from '../lib/moodMonth'
import { useRatings } from '../ratings'

const moodBg = {
  great: 'bg-mood-great',
  good: 'bg-mood-good',
  okay: 'bg-mood-okay',
  low: 'bg-mood-low',
  awful: 'bg-mood-awful',
}
const shortDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

function periodFor(range, offset, today) {
  if (range === 'Week') {
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset * 7)
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 6)
    const title = offset === 0 ? 'This week' : offset === -1 ? 'Last week' : `${shortDate(start)} – ${shortDate(end)}`
    return { start, end, title }
  }
  const start = new Date(today.getFullYear(), today.getMonth() + offset, 1)
  const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0)
  const end = monthEnd > today ? today : monthEnd
  const title = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  return { start, end, monthEnd, title }
}

function PeriodNav({ title, onPrev, onNext, canGoNext, unit }) {
  const arrow = 'flex size-8 items-center justify-center rounded-full border border-line text-teal'
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label={`Previous ${unit}`} onClick={onPrev} className={`${arrow} hover:bg-teal-soft`}>
        <ChevronLeft size={16} />
      </button>
      <p aria-live="polite" className="min-w-[150px] text-center text-[15px] font-semibold">
        {title}
      </p>
      <button
        type="button"
        aria-label={`Next ${unit}`}
        aria-disabled={!canGoNext}
        onClick={() => canGoNext && onNext()}
        className={`${arrow} ${canGoNext ? 'hover:bg-teal-soft' : 'cursor-default opacity-40'}`}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

export default function MoodPage() {
  useRatings()
  const [range, setRange] = useState('Week')
  const [offset, setOffset] = useState(0)
  const [monthView, setMonthView] = useState('Calendar')
  const today = new Date()
  const period = periodFor(range, offset, today)
  const week = daysBetween(period.start, period.end).map((date) => ({ date, checkIn: checkInFor(date, today) }))
  const previousPeriod = periodFor(range, offset - 1, today)
  const compareTo =
    range === 'Month'
      ? previousPeriod.start.toLocaleDateString('en-US', { month: 'long' })
      : offset === 0
        ? 'last week'
        : 'the week before'
  const changeRange = (value) => {
    setRange(value)
    setOffset(0)
  }
  const periodCheckIns = checkInsBetween(period.start, period.end, today).reverse()
  const listTitle =
    range === 'Month'
      ? `Check-ins in ${period.start.toLocaleDateString('en-US', { month: 'long' })}`
      : offset === 0
        ? 'Check-ins this week'
        : offset === -1
          ? 'Check-ins last week'
          : `Check-ins, ${period.title}`

  return (
    <section className="flex flex-col gap-5 px-10 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-[30px] font-semibold">Your stress</h1>
          <p className="mt-1 text-[15px] text-muted">Logged from your check-ins</p>
        </div>
        <SegmentedSwitch size="sm" options={['Week', 'Month']} value={range} onChange={changeRange} />
      </div>

      <div className="flex">
        <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-[14px] border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <PeriodNav
              title={period.title}
              unit={range.toLowerCase()}
              onPrev={() => setOffset((o) => o - 1)}
              onNext={() => setOffset((o) => o + 1)}
              canGoNext={offset < 0}
            />
            <div className="flex items-center gap-3">
              {range === 'Month' && (
                <SegmentedSwitch size="sm" options={['Weeks', 'Calendar', 'Daily']} value={monthView} onChange={setMonthView} />
              )}
              <p className="text-xs text-muted">Past days include sample data</p>
            </div>
          </div>
          {range === 'Week' ? (
            <MoodWeekChart days={week} />
          ) : (
            <>
              {monthView === 'Weeks' && <MoodWeeks monthStart={period.start} />}
              {monthView === 'Calendar' && <MoodCalendar monthStart={period.start} />}
              {monthView === 'Daily' && <MoodDaily monthStart={period.start} />}
            </>
          )}
          <div className="flex gap-3 text-xs text-muted">
            {moodLevels.map((m) => (
              <span key={m} className="flex items-center gap-1">
                <span className={`size-2.5 rounded-full ${moodBg[m]}`} />
                {label(m)}
              </span>
            ))}
            {range === 'Month' && monthView === 'Daily' && (
              <span className="flex items-center gap-1">
                <span className="h-0.5 w-4 rounded-full bg-ink" />
                Weekly average
              </span>
            )}
          </div>
        </div>
      </div>

      <MoodStats
        current={periodStats(period.start, period.end, today)}
        previous={periodStats(previousPeriod.start, previousPeriod.end, today)}
        compareTo={compareTo}
      />

      <CheckInList title={listTitle} checkIns={periodCheckIns} periodKey={`${range}-${offset}`} />
    </section>
  )
}