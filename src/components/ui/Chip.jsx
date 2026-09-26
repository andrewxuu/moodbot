const sizes = {
  md: 'h-11 px-4 text-[15px]',
  sm: 'h-9 px-3 text-sm',
}

export default function Chip({ children, selected, onClick, size = 'md', dim = false, className = '' }) {
  const style = selected
    ? 'bg-teal-soft border-teal font-semibold'
    : 'bg-white border-line hover:border-teal'

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border ${sizes[size]} ${dim ? 'text-hint' : 'text-ink'} ${style} ${className}`}
    >
      {children}
    </button>
  )
}
