import { useRef, useState } from 'react'
import { moodBg, moodLabel } from '../../lib/moodMonth'

const longDate = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
const shortDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export function dayTip(date, checkIn, future = false) {
  if (!checkIn) return { key: `day-${date.getTime()}`, title: longDate(date), meta: future ? 'Upcoming' : 'No check-in' }
  return {
    key: `day-${date.getTime()}`,
    title: longDate(date),
    mood: checkIn.mood,
    moodText: moodLabel(checkIn.mood),
    note: checkIn.note,
    meta: checkIn.meta,
  }
}

export function weekTip(index, days, avg, count) {
  const title = `Week ${index + 1}, ${shortDate(days[0].date)}–${days.at(-1).date.getDate()}`
  if (!avg) return { key: `week-${index}`, title, meta: 'No check-ins' }
  const mood = ['', 'great', 'good', 'okay', 'low', 'awful'][Math.round(avg)]
  return {
    key: `week-${index}`,
    title,
    mood,
    moodText: `Average: ${moodLabel(mood)} (${avg.toFixed(1)})`,
    meta: `${count} check-in${count === 1 ? '' : 's'}`,
  }
}

export function useChartTooltip() {
  const ref = useRef(null)
  const [tip, setTip] = useState(null)

  const at = (clientX, clientY) => {
    const box = ref.current.getBoundingClientRect()
    return { x: clientX - box.left, y: clientY - box.top, width: box.width }
  }
  const above = (el) => {
    const b = el.getBoundingClientRect()
    return at(b.left + b.width / 2, b.top)
  }

  const bind = (content) => ({
    onPointerMove: (e) => e.pointerType === 'mouse' && setTip({ ...at(e.clientX, e.clientY), content }),
    onPointerLeave: (e) => e.pointerType === 'mouse' && setTip(null),
    onFocus: (e) => setTip({ ...above(e.currentTarget), content }),
    onBlur: () => setTip(null),
  })

  const tooltip = tip && (
    <div
      role="tooltip"
      style={{ left: Math.min(Math.max(tip.x, 110), tip.width - 110), top: tip.y }}
      className="pointer-events-none absolute z-10 w-[200px] -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-[10px] bg-ink px-3 py-2 text-xs text-surface shadow-lg"
    >
      <p className="font-semibold">{tip.content.title}</p>
      {tip.content.mood && (
        <p className="mt-1 flex items-center gap-1.5">
          <span className={`size-2.5 shrink-0 rounded-full ring-1 ring-surface/60 ${moodBg[tip.content.mood]}`} />
          {tip.content.moodText}
        </p>
      )}
      {tip.content.note && <p className="mt-1 text-surface/80">“{tip.content.note}”</p>}
      {tip.content.meta && <p className="mt-1 text-surface/70">{tip.content.meta}</p>}
    </div>
  )

  return { ref, bind, tooltip }
}
