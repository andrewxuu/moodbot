import { Music, Plus } from 'lucide-react'
import { playlists } from '../data'

export default function PlaylistsPage() {
  return (
    <section className="flex flex-col gap-6 px-10 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-[30px] font-semibold">Playlists</h1>
        <div className="flex gap-3">
          <button
            type="button"
            className="flex h-11 items-center gap-1.5 rounded-full border border-line bg-white px-[18px] text-[15px] hover:border-teal"
          >
            <Music size={18} className="text-teal" />
            Sync to Spotify
          </button>
          <button
            type="button"
            className="flex h-11 items-center gap-1.5 rounded-full bg-teal px-[18px] text-[15px] text-white"
          >
            <Plus size={18} />
            New playlist
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,260px)] gap-6">
        {playlists.map((p) => (
          <button key={p.id} type="button" className="text-left">
            <div className="h-[220px] rounded-[14px] bg-art" />
            <p className="mt-2 text-base font-semibold">{p.name}</p>
            <p className="mt-2 text-[13px] text-muted">{p.count}</p>
          </button>
        ))}
      </div>
    </section>
  )
}
