import { Check, X } from 'lucide-react'
import { genres, useGenrePrefs } from '../../lib/genrePrefs'

const styles = {
  liked: { on: 'border-teal bg-teal-soft font-semibold text-teal', icon: Check },
  avoided: { on: 'border-mood-awful bg-mood-awful/10 font-semibold text-mood-awful', icon: X },
}

function GenreList({ title, detail, list, selected, onToggle }) {
  const { on, icon: Icon } = styles[list]
  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <div>
        <p className="text-[15px] font-semibold">{title}</p>
        <p className="mt-0.5 text-[13px] text-muted">{detail}</p>
      </div>
      <div role="group" aria-label={title} className="flex flex-wrap gap-1.5">
        {genres.map((g) => {
          const picked = selected.includes(g)
          return (
            <button
              key={g}
              type="button"
              aria-pressed={picked}
              onClick={() => onToggle(list, g)}
              className={`flex h-8 items-center gap-1 rounded-full border px-3 text-[13px] ${
                picked ? on : 'border-line bg-surface text-ink hover:border-teal'
              }`}
            >
              {picked && <Icon size={13} aria-hidden="true" />}
              {g}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function GenrePrefs() {
  const { liked, avoided, toggle } = useGenrePrefs()
  return (
    <div className="divide-y divide-line overflow-hidden rounded-[14px] border border-line">
      <GenreList title="Genres you like" detail="Picks lean toward these" list="liked" selected={liked} onToggle={toggle} />
      <GenreList title="Genres to avoid" detail="Never picked, even if they match your mood" list="avoided" selected={avoided} onToggle={toggle} />
    </div>
  )
}
