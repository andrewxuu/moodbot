import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Funnel } from 'lucide-react'
import { moodBg, moodLabel } from '../../lib/moodMonth'
import { whenLabel } from '../../data/sampleMoods'

const moods = ['great', 'good', 'okay', 'low', 'awful']
const PREVIEW = 5

function MoodFilter({ value, onChange, counts, total }) {
  const [open, setOpen] = useState(false)
  const wrap = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => !wrap.current?.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const options = [{ id: 'all', label: 'All', count: total }, ...moods.map((m) => ({ id: m, label: moodLabel(m), count: counts[m] }))]
  const active = value !== 'all'
  const pick = (id) => {
    onChange(id)
    setOpen(false)
  }

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm ${
          active ? 'border-teal bg-teal-soft font-semibold text-teal' : 'border-line bg-surface text-ink hover:border-teal'
        }`}
      >
        <Funnel size={15} aria-hidden="true" />
        {active ? `Filter: ${moodLabel(value)}` : 'Filter'}
        <ChevronDown size={15} aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-20 mt-2 w-[200px] rounded-xl border border-line bg-surface p-1.5 shadow-lg">
          {options.map((o) => {
            const selected = value === o.id
            const empty = o.id !== 'all' && !o.count
            return (
              <button
                key={o.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => pick(o.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm ${
                  selected ? 'bg-teal-soft font-semibold' : 'hover:bg-cream'
                } ${empty ? 'text-hint' : 'text-ink'}`}
              >
                {o.id !== 'all' && <span className={`size-2.5 shrink-0 rounded-full ${moodBg[o.id]} ${empty ? 'opacity-40' : ''}`} />}
                <span className="flex-1">{o.label}</span>
                <span className="tabular-nums text-muted">{o.count}</span>
                <Check size={15} aria-hidden="true" className={selected ? 'text-teal' : 'invisible'} />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function CheckInList({ title, checkIns, periodKey }) {
  const [filter, setFilter] = useState('all')
  const [showAll, setShowAll] = useState(false)

  useEffect(() => setShowAll(false), [periodKey, filter])

  const counts = Object.fromEntries(moods.map((m) => [m, checkIns.filter((c) => c.mood === m).length]))
  const filtered = filter === 'all' ? checkIns : checkIns.filter((c) => c.mood === filter)
  const shown = showAll ? filtered : filtered.slice(0, PREVIEW)

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">
          {title} <span className="font-normal text-muted">({checkIns.length})</span>
        </h2>
        <MoodFilter value={filter} onChange={setFilter} counts={counts} total={checkIns.length} />
      </div>

      {shown.map((c) => (
        <div key={c.id} className="flex h-[60px] items-center gap-3 rounded-[14px] border border-line bg-surface px-3.5">
          <span className={`size-3.5 shrink-0 rounded-full ${moodBg[c.mood]}`} />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold">{moodLabel(c.mood)}</p>
            <p className="mt-0.5 truncate text-[13px] text-muted">{c.note || `${c.count} check-in${c.count === 1 ? '' : 's'}`}</p>
          </div>
          <div className="shrink-0 text-right text-[13px] text-muted">
            <p>{whenLabel(c.date)}</p>
            <p className="mt-0.5">{c.real ? `${c.rating}/10` : `${c.songs} songs`}</p>
          </div>
        </div>
      ))}

      {!filtered.length && (
        <p className="text-sm text-muted">
          {checkIns.length ? `No ${moodLabel(filter).toLowerCase()} check-ins in this period.` : 'No check-ins in this period.'}
        </p>
      )}

      {filtered.length > PREVIEW && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="self-center text-sm font-semibold text-teal underline">
          {showAll ? 'Show less' : `Show all ${filtered.length} check-ins`}
        </button>
      )}
    </div>
  )
}
