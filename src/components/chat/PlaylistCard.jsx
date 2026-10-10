import { ArrowRight } from 'lucide-react'

export default function PlaylistCard({ playlist, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(playlist.id)}
      className="mt-1 flex items-center gap-3 rounded-[12px] border border-line bg-surface p-2.5 text-left hover:border-teal"
    >
      {playlist.image ? (
        <img src={playlist.image} alt="" className="size-14 shrink-0 rounded-[10px] object-cover" />
      ) : (
        <div className="size-14 shrink-0 rounded-[10px] bg-art" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold">{playlist.name}</p>
        <p className="text-[13px] text-muted">{playlist.count} songs</p>
      </div>
      <span className="flex items-center gap-1 pr-1 text-sm font-semibold text-teal">
        Open
        <ArrowRight size={16} />
      </span>
    </button>
  )
}
