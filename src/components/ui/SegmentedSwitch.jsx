const sizes = {
  md: { track: 'h-10 p-1 gap-1', item: 'h-8 px-3.5 text-sm' },
  sm: { track: 'h-9 p-[3px] gap-[3px]', item: 'h-[30px] px-3.5 text-[13px]' },
}

export default function SegmentedSwitch({ options, value, onChange, size = 'md' }) {
  const s = sizes[size]

  return (
    <div role="radiogroup" className={`inline-flex rounded-full bg-track ${s.track}`}>
      {options.map((opt) => {
        const on = opt === value
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(opt)}
            className={`flex items-center justify-center rounded-full ${s.item} ${
              on ? 'border border-line bg-white font-semibold text-ink' : 'text-muted'
            }`}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}
