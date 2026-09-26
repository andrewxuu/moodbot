export default function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 ${
        checked ? 'bg-teal' : 'bg-line'
      }`}
    >
      <span
        className={`absolute top-1 size-5 rounded-full bg-white shadow transition-[left] ${checked ? 'left-6' : 'left-1'}`}
      />
    </button>
  )
}
