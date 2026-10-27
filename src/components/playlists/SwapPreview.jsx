import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Minus, Plus } from 'lucide-react'
import AlbumArt from '../songs/AlbumArt'
import SpotifyError from './SpotifyError'
import { matchPercent, swapFit } from '../../lib/playlistMood'

function Row({ song, d, tag, icon: Icon, tone }) {
  const fit = matchPercent(d)
  return (
    <div className="flex items-center gap-2.5">
      <AlbumArt song={song} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {song.title}
          {tag && (
            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] font-normal ${tag === 'new' ? 'bg-teal-soft text-teal' : 'bg-cream text-muted'}`}>{tag}</span>
          )}
        </p>
        <p className="truncate text-[13px] text-muted">{song.artist}</p>
      </div>
      <span className={`flex items-center gap-1 text-[13px] tabular-nums ${tone}`}>
        <Icon size={13} aria-hidden="true" />
        {fit}%
      </span>
    </div>
  )
}

export default function SwapPreview({ plan, moodLabel, onApply, onCancel }) {
  const [chosen, setChosen] = useState(() => new Set(plan.pairs.map((p) => p.id)))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const cancelRef = useRef(null)
  const fit = useMemo(() => swapFit(plan, chosen), [plan, chosen])

  useEffect(() => {
    const opener = document.activeElement
    cancelRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && !busy && onCancel()
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      opener?.focus?.()
    }
  }, [onCancel, busy])

  const toggle = (id) =>
    setChosen((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })

  const apply = async () => {
    setBusy(true)
    setError(null)
    try {
      await onApply(plan.pairs.filter((p) => chosen.has(p.id)))
    } catch (err) {
      setError(err)
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="swap-title"
        className="flex max-h-[90vh] w-full max-w-[760px] flex-col gap-4 overflow-y-auto rounded-[20px] bg-surface p-5 sm:p-6"
      >
        <div className="flex flex-col gap-1.5">
          <h2 id="swap-title" className="font-serif text-[22px] font-semibold">
            {moodLabel}: swap {chosen.size} of {plan.scored.length} songs
          </h2>
          <p className="text-[15px] text-muted">Uncheck any pair to keep that song. Nothing changes on Spotify until you apply.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1 rounded-[14px] border border-line p-3">
            <p className="mb-1 text-[13px] text-muted">Leaving</p>
            {plan.pairs.map((p) => (
              <div key={p.id} className="flex items-center gap-2.5 border-t border-line py-2 first:border-t-0">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={chosen.has(p.id)}
                  aria-label={`Swap ${p.out.song.title}`}
                  onClick={() => toggle(p.id)}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${chosen.has(p.id) ? 'border-teal bg-teal text-white' : 'border-line bg-surface'}`}
                >
                  {chosen.has(p.id) && <Check size={13} aria-hidden="true" />}
                </button>
                <div className={`min-w-0 flex-1 ${chosen.has(p.id) ? '' : 'opacity-50'}`}>
                  <Row song={p.out.song} d={p.out.d} icon={Minus} tone="text-danger" />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1 rounded-[14px] border border-line p-3">
            <p className="mb-1 text-[13px] text-muted">Coming in</p>
            {plan.pairs.map((p) => (
              <div key={p.id} className={`border-t border-line py-2 first:border-t-0 ${chosen.has(p.id) ? '' : 'opacity-50'}`}>
                <Row song={p.inn.song} d={p.inn.d} tag={p.inn.tag} icon={Plus} tone="text-teal" />
              </div>
            ))}
          </div>
        </div>

        <SpotifyError error={error} />

        <div className="flex flex-wrap items-center justify-end gap-3">
          <p className="mr-auto text-[13px] text-muted">
            Playlist fit goes from {fit.before}% to {fit.after}%
          </p>
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="h-10 rounded-full border border-line px-4 text-[15px] font-semibold hover:border-teal"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={busy || !chosen.size}
            className="h-10 rounded-full bg-teal px-4 text-[15px] font-semibold text-white disabled:opacity-60"
          >
            {busy ? 'Updating…' : 'Apply swap'}
          </button>
        </div>
      </div>
    </div>
  )
}
