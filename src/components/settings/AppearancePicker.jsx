import { useId, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { useAppearance } from '../../appearance'
import { accents, stressPalettes } from '../../lib/appearanceData'

function Heading({ children }) {
  return <p className="text-[13px] text-muted">{children}</p>
}

export default function AppearancePicker() {
  const { accent, stress, setAccent, setStress } = useAppearance()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Heading>Site palette</Heading>
        <div role="radiogroup" aria-label="Site palette" className="flex flex-wrap gap-x-3 gap-y-2">
          {accents.map(({ id, label, swatch }) => {
            const on = accent === id
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setAccent(id)}
                className="flex w-14 flex-col items-center gap-1.5"
              >
                <span
                  style={{ backgroundColor: swatch }}
                  className={`flex size-10 items-center justify-center rounded-full text-white ${
                    on ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : ''
                  }`}
                >
                  {on && <Check size={18} aria-hidden="true" />}
                </span>
                <span className={`text-[12px] ${on ? 'font-semibold' : 'text-muted'}`}>{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Heading>Stress palette</Heading>
        <div role="radiogroup" aria-label="Stress palette" className="flex flex-col gap-2">
          {stressPalettes.map(({ id, label, colors }) => {
            const on = stress === id
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setStress(id)}
                className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-[14px] border px-3.5 py-2.5 text-left ${
                  on ? 'border-teal bg-teal-soft' : 'border-line bg-surface hover:border-teal'
                }`}
              >
                <span className={`text-[14px] ${on ? 'font-semibold' : ''}`}>{label}</span>
                <span className="flex gap-1.5" aria-hidden="true">
                  {colors.map((color, i) => (
                    <span
                      key={color}
                      style={{ backgroundColor: color }}
                      className="flex size-7 items-center justify-center rounded-full text-[12px] font-semibold text-white"
                    >
                      {i + 1}
                    </span>
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function PaletteDropdown() {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const { accent, stress } = useAppearance()
  const swatch = (accents.find((a) => a.id === accent) ?? accents[0]).swatch
  const colors = (stressPalettes.find((p) => p.id === stress) ?? stressPalettes[0]).colors

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex h-12 items-center gap-3 rounded-[14px] border border-line bg-surface px-4 text-left hover:border-teal"
      >
        <span className="flex-1 text-[15px] font-semibold">Palette</span>
        <span className="flex items-center gap-1" aria-hidden="true">
          <span style={{ backgroundColor: swatch }} className="size-4 rounded-full" />
          {colors.map((color) => (
            <span key={color} style={{ backgroundColor: color }} className="size-2.5 rounded-full" />
          ))}
        </span>
        <ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div id={panelId}>
          <AppearancePicker />
        </div>
      )}
    </div>
  )
}
