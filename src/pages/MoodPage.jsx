import { useState } from 'react'
import SegmentedSwitch from '../components/SegmentedSwitch'
import { checkIns, moodLevels, week } from '../data'

const barHeight = { great: 220, good: 176, okay: 132, low: 88, awful: 44 }
const moodBg = {
  great: 'bg-mood-great',
  good: 'bg-mood-good',
  okay: 'bg-mood-okay',
  low: 'bg-mood-low',
  awful: 'bg-mood-awful',
}
const label = (m) => m[0].toUpperCase() + m.slice(1)

const stats = [
  { label: 'Most common', value: '[Mood]' },
  { label: 'Check-ins this week', value: '[#]' },
  { label: 'Songs saved from chats', value: '[#]' },
]

export default function MoodPage() {
  const [range, setRange] = useState('Week')

  return (
    <section className="flex flex-col gap-5 px-10 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-[30px] font-semibold">Your moods</h1>
          <p className="mt-1 text-[15px] text-muted">Logged from your chats</p>
        </div>
        <SegmentedSwitch size="sm" options={['Week', 'Month']} value={range} onChange={setRange} />
      </div>

      <div className="flex gap-5">
        <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-[14px] border border-line bg-white p-4">
          <div className="flex justify-between">
            <p className="text-[15px] font-semibold">This {range.toLowerCase()}</p>
            <p className="text-xs text-muted">Sample data</p>
          </div>
          <div className="flex h-[220px] items-end gap-2.5">
            {week.map((d, i) => (
              <div
                key={i}
                title={label(d.mood)}
                style={{ height: barHeight[d.mood] }}
                className={`flex-1 rounded-md ${moodBg[d.mood]}`}
              />
            ))}
          </div>
          <div className="flex gap-2.5 text-center text-xs text-muted">
            {week.map((d) => (
              <p key={d.day} className="flex-1">{d.day}</p>
            ))}
          </div>
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
        {checkIns.map((c) => (
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
              <p>{c.when}</p>
              <p className="mt-0.5">{c.count}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
