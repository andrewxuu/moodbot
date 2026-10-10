import { ChartColumn, Heart, House, List, MessageCircle, Music } from 'lucide-react'
import { useSpotify } from '../../spotify/useSpotify'
import { useAccount } from '../../account'

const links = [
  { id: 'home', label: 'Home', short: 'Home', icon: House },
  { id: 'chat', label: 'Chat', short: 'Chat', icon: MessageCircle },
  { id: 'mood', label: 'Stats', short: 'Stats', icon: ChartColumn },
  { id: 'saved', label: 'Saved songs', short: 'Saved', icon: Heart },
  { id: 'playlists', label: 'Playlists', short: 'Lists', icon: List },
]

export default function Sidebar({ page, onNavigate, onOpenSettings }) {
  const { profile } = useSpotify()
  const { name: accountName } = useAccount()
  const name = profile?.name ?? accountName ?? 'Guest'

  const avatar = (size) =>
    profile?.image ? (
      <img src={profile.image} alt="" className={`${size} shrink-0 rounded-full object-cover`} />
    ) : (
      <div className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-teal-soft text-sm font-semibold text-teal`}>
        {name[0].toUpperCase()}
      </div>
    )

  return (
    <>
      <aside className="hidden h-full w-[72px] shrink-0 flex-col gap-7 overflow-y-auto border-r border-line bg-surface px-3 py-7 md:flex lg:w-[248px] lg:px-[18px]">
        <div className="flex items-center justify-center gap-2.5 lg:justify-start">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-teal text-white">
            <Music size={18} />
          </div>
          <p className="hidden font-serif text-[22px] font-semibold lg:block">Moodbot</p>
        </div>

        <nav className="flex flex-col gap-1.5">
          {links.map(({ id, label, icon: Icon }) => {
            const on = page === id
            return (
              <button
                key={id}
                type="button"
                title={label}
                aria-label={label}
                aria-current={on ? 'page' : undefined}
                onClick={() => onNavigate(id)}
                className={`flex h-11 items-center justify-center gap-3 rounded-[14px] text-left text-[15px] lg:justify-start lg:px-3.5 ${
                  on ? 'bg-teal-soft font-semibold text-teal' : 'text-muted hover:bg-cream'
                }`}
              >
                <Icon size={20} className="shrink-0" />
                <span className="hidden lg:inline">{label}</span>
              </button>
            )
          })}
        </nav>

        <div className="flex-1" />

        <button
          type="button"
          onClick={onOpenSettings}
          aria-haspopup="dialog"
          aria-label="Settings"
          title="Settings"
          className="flex items-center justify-center gap-2.5 rounded-[14px] py-1.5 text-left hover:bg-cream lg:-mx-2 lg:justify-start lg:px-2"
        >
          {avatar('size-9')}
          <div className="hidden min-w-0 lg:block">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="mt-1 text-[13px] text-muted">Settings</p>
          </div>
        </button>
      </aside>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {links.map(({ id, label, short, icon: Icon }) => {
          const on = page === id
          return (
            <button
              key={id}
              type="button"
              aria-label={label}
              aria-current={on ? 'page' : undefined}
              onClick={() => onNavigate(id)}
              className={`flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] ${
                on ? 'font-semibold text-teal' : 'text-muted'
              }`}
            >
              <Icon size={20} />
              {short}
            </button>
          )
        })}
        <button
          type="button"
          onClick={onOpenSettings}
          aria-haspopup="dialog"
          aria-label="Settings"
          className="flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] text-muted"
        >
          {avatar('size-5')}
          Settings
        </button>
      </nav>
    </>
  )
}
