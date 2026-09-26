import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { dayName } from '../../data/sampleChats'

export default function ChatDayPicker({ days, value, onChange }) {
  const [open, setOpen] = useState(false)
  const wrap = useRef(null)
  const current = days.find((d) => d.key === value) ?? days[0]

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

  const pick = (key) => {
    onChange(key)
    setOpen(false)
  }

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-sm text-ink hover:border-teal"
      >
        {dayName(current.date)}
        <ChevronDown size={15} aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div role="menu" className="absolute left-0 top-full z-20 mt-2 max-h-[320px] w-[200px] overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-lg">
          {days.map((d) => {
            const selected = d.key === current.key
            return (
              <button
                key={d.key}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => pick(d.key)}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-ink ${
                  selected ? 'bg-teal-soft font-semibold' : 'hover:bg-cream'
                }`}
              >
                <span className="flex-1">{dayName(d.date)}</span>
                <Check size={15} aria-hidden="true" className={selected ? 'text-teal' : 'invisible'} />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
