export default function Chip({ children, selected, onClick, className = '' }) {
  const style = selected
    ? 'bg-teal-soft border-teal font-semibold'
    : 'bg-white border-line hover:border-teal'

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex h-11 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-[15px] text-ink ${style} ${className}`}
    >
      {children}
    </button>
  )
}
