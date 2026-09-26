import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import MoodCalendar from '../components/MoodCalendar'
import SegmentedSwitch from '../components/SegmentedSwitch'
import { moodLevels } from '../data'
import { checkInsBetween, daysBetween, sampleCheckIn, whenLabel } from '../sampleMoods'

const moodBg = {
  great: 'bg-mood-great',
  good: 'bg-mood-good',
  okay: 'bg-mood-okay',
  low: 'bg-mood-low',
  awful: 'bg-mood-awful',
}
const label = (m) => m[0].toUpperCase() + m.slice(1)
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

const stats = [
  { label: 'Most common', value: '[Mood]' },
  { label: 'Check-ins this week', value: '[#]' },
  { label: 'Songs saved from chats', value: '[#]' },
]

export default function MoodPage() {
  const [range, setRange] = useState('Week')
  const [offset, setOffset] = useState(0)
  const today = new Date()
  const period = periodFor(range, offset, today)
  const week = daysBetween(period.start, period.end).map((date) => ({ date, checkIn: sampleCheckIn(date, today) }))
  const changeRange = (value) => {
    setRange(value)
    setOffset(0)
  }
  const recent = checkInsBetween(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 13), today)
    .reverse()
    .slice(0, 4)

  return (
    <section className="flex flex-col gap-5 px-10 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-[30px] font-semibold">Your moods</h1>
          <p className="mt-1 text-[15px] text-muted">Logged from your chats</p>
        </div>
        <SegmentedSwitch size="sm" options={['Week', 'Month']} value={range} onChange={changeRange} />
      </div>

      <div className="flex gap-5">
        <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-[14px] border border-line bg-white p-4">
          <div className="flex items-center justify-between">
            <PeriodNav
              title={period.title}
              unit={range.toLowerCase()}
              onPrev={() => setOffset((o) => o - 1)}
              onNext={() => setOffset((o) => o + 1)}
              canGoNext={offset < 0}
            />
            <p className="text-xs text-muted">Sample data</p>
          </div>
          {range === 'Week' ? (
            <>
          <div className="flex h-[220px] items-end gap-2.5">
            {week.map(({ date, checkIn }) =>
              checkIn ? (
                <div
                  key={date.toISOString()}
                  title={label(checkIn.mood)}
                  style={{ height: checkIn.score * 44 }}
                  className={`flex-1 rounded-md ${moodBg[checkIn.mood]}`}
                />
              ) : (
                <div
                  key={date.toISOString()}
                  className="flex h-[44px] flex-1 items-center justify-center rounded-md border border-dashed border-line text-[11px] text-hint"
                >
                  No check-in
                </div>
              )
            )}
          </div>
          <div className="flex gap-2.5 text-center text-xs text-muted">
            {week.map(({ date }) => (
              <p key={date.toISOString()} className="flex-1">
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </p>
            ))}
          </div>
            </>
          ) : (
            <MoodCalendar monthStart={period.start} />
          )}
          <div className="flex gap-3 text-xs text-muted">
            {moodLevels.map((m) => (
              <span key={m} className="flex items-center gap-1">
                <span className={`size-2.5 rounded-full ${moodBg[m]}`} />
                {label(m)}
              </span>
            ))}
          </div>
        </div>

        <div className="flex w-[280px] shrink-0 flex-col gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-[14px] border border-line bg-white px-3.5 py-3">
              <p className="text-[13px] text-muted">{s.label}</p>
              <p className="mt-0.5 text-xl font-semibold">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <h2 className="text-base font-semibold">Recent check-ins</h2>
        {recent.map((c) => (
          <button
            key={c.id}
            type="button"
            className="flex h-[60px] items-center gap-3 rounded-[14px] border border-line bg-white px-3.5 text-left hover:border-teal"
          >
            <span className={`size-3.5 shrink-0 rounded-full ${moodBg[c.mood]}`} />
            <div className="flex-1">
              <p className="text-[15px] font-semibold">{label(c.mood)}</p>
              <p className="mt-0.5 text-[13px] text-muted">{c.note}</p>
            </div>
            <div className="text-right text-[13px] text-muted">
              <p>{whenLabel(c.date, today)}</p>
              <p className="mt-0.5">{c.songs} songs</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}