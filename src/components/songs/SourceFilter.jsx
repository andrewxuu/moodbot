import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Funnel } from 'lucide-react'

export default function SourceFilter({ options, value, onChange }) {
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
        className="flex h-12 items-center gap-1.5 rounded-[14px] border border-teal bg-teal-soft px-3.5 text-sm font-semibold text-teal"
      >
        <Funnel size={15} aria-hidden="true" />
        {value}
        <ChevronDown size={15} aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-20 mt-2 w-[200px] rounded-xl border border-line bg-surface p-1.5 shadow-lg">
          {options.map((o) => {
            const selected = value === o.id
            return (
              <button
                key={o.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => pick(o.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm ${
                  selected ? 'bg-teal-soft font-semibold' : 'hover:bg-cream'
                } ${o.count ? 'text-ink' : 'text-hint'}`}
              >
                <span className="flex-1">{o.id}</span>
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
