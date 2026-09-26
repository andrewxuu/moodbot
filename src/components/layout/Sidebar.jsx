import { Heart, House, List, MessageCircle, Music, Smile } from 'lucide-react'
import { useSpotify } from '../../spotify/useSpotify'

const links = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'mood', label: 'Wellbeing', icon: Smile },
  { id: 'saved', label: 'Saved songs', icon: Heart },
  { id: 'playlists', label: 'Playlists', icon: List },
]

export default function Sidebar({ page, onNavigate, onOpenSettings }) {
  const { profile } = useSpotify()
  const name = profile?.name ?? 'Guest'

  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col gap-7 overflow-y-auto border-r border-line bg-surface px-[18px] py-7">
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-full bg-teal text-white">
          <Music size={18} />
        </div>
        <p className="font-serif text-[22px] font-semibold">Moodbot</p>
      </div>

      <nav className="flex flex-col gap-1.5">
        {links.map(({ id, label, icon: Icon }) => {
          const on = page === id
          return (
            <button
              key={id}
              type="button"
              aria-current={on ? 'page' : undefined}
              onClick={() => onNavigate(id)}
              className={`flex h-11 items-center gap-3 rounded-[14px] px-3.5 text-left text-[15px] ${
                on ? 'bg-teal-soft font-semibold text-teal' : 'text-muted hover:bg-cream'
              }`}
            >
              <Icon size={20} />
              {label}
            </button>
          )
        })}
      </nav>

      <div className="flex-1" />

      <button
        type="button"
        onClick={onOpenSettings}
        aria-haspopup="dialog"
        className="-mx-2 flex items-center gap-2.5 rounded-[14px] px-2 py-1.5 text-left hover:bg-cream"
      >
        {profile?.image ? (
          <img src={profile.image} alt="" className="size-9 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-teal-soft text-sm font-semibold text-teal">
            {name[0].toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="mt-1 text-[13px] text-muted">Settings</p>
        </div>
      </button>
    </aside>
  )
}
