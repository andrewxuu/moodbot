export default function IconButton({ icon: Icon, label, size = 44, iconSize = 18, active, primary, onClick }) {
  const style = primary
    ? 'bg-teal text-white'
    : 'bg-surface border border-line text-teal hover:bg-teal-soft'

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      style={{ width: size, height: size }}
      className={`flex shrink-0 items-center justify-center rounded-full ${style}`}
    >
      <Icon size={iconSize} fill={active ? 'currentColor' : 'none'} />
    </button>
  )
}
