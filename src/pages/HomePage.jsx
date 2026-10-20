import { useSpotify } from '../spotify/useSpotify'
import { useState } from 'react'
import { CircleCheck } from 'lucide-react'
import { moodBg } from '../lib/moodMonth'
import { ratingMood, stressLabel, useRatings } from '../ratings'
import SongRow from '../components/songs/SongRow'
import PlaylistDetail from './PlaylistDetail'
import PlaylistPick from '../components/playlists/PlaylistPick'
import { moodForStress } from '../lib/playlistMood'

function greetingFor(hour) {
  if (hour < 5) return 'Up late'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function Section({ title, aside, children, className = '' }) {
  return (
    <section className={`flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-4 ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {aside && <div className="text-[13px] text-muted">{aside}</div>}
      </div>
      {children}
    </section>
  )
}

const timeOf = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
const isToday = (iso) => new Date(iso).toDateString() === new Date().toDateString()

function MoodRating() {
  const { ratings, addRating, updateRating } = useRatings()
  const [currentId, setCurrentId] = useState(null)
  const [draft, setDraft] = useState('')
  const [noteSaved, setNoteSaved] = useState(false)

  const current = ratings.find((r) => r.id === currentId)
  const earlier = ratings.filter((r) => r.id !== currentId && isToday(r.at))

  const pick = (rating) => {
    if (current) {
      updateRating(current.id, { rating })
    } else {
      setCurrentId(addRating(rating))
      setDraft('')
      setNoteSaved(false)
    }
  }

  const saveNote = () => {
    updateRating(current.id, { note: draft.trim() })
    setNoteSaved(true)
  }

  const logAnother = () => {
    setCurrentId(null)
    setDraft('')
    setNoteSaved(false)
  }

  return (
    <Section title="Rate your stress">
      <div role="radiogroup" aria-label="Stress from 1, calm, to 10, very stressed" className="grid grid-cols-10 gap-1.5">
        {Array.from({ length: 10 }, (_, i) => {
          const value = i + 1
          const on = current?.rating === value
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${value} out of 10, ${stressLabel(value)}`}
              onClick={() => pick(value)}
              className={`h-11 rounded-[10px] border text-[15px] font-semibold ${
                on ? `border-transparent text-white ${moodBg[ratingMood(value)]}` : 'border-line bg-surface hover:border-teal'
              }`}
            >
              {value}
            </button>
          )
        })}
      </div>
      <div className="flex justify-between text-xs text-muted">
        <span>Calm</span>
        <span>Very stressed</span>
      </div>

      {current && (
        <div className="flex flex-col gap-2.5 border-t border-line pt-3">
          <p role="status" className="flex flex-wrap items-center gap-x-1.5 text-sm">
            <CircleCheck size={16} className="text-teal" aria-hidden="true" />
            <span className="font-semibold">
              Logged {current.rating}/10 ({stressLabel(current.rating)})
            </span>
            at {timeOf(current.at)}
            <span className="text-muted">· Tap another number to change it</span>
          </p>
          <textarea
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              setNoteSaved(false)
            }}
            rows={2}
            placeholder="Anything on your mind? (optional)"
            aria-label="Note for this check-in"
            className="w-full resize-none rounded-[10px] border border-line bg-surface px-3 py-2 text-sm outline-none placeholder:text-hint focus:border-teal"
          />
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={logAnother} className="text-sm font-semibold text-teal underline">
              Log another check-in
            </button>
            {noteSaved ? (
              <span className="text-sm text-muted">Note saved</span>
            ) : (
              <button
                type="button"
                onClick={saveNote}
                disabled={!draft.trim()}
                className="h-9 rounded-full bg-teal px-4 text-sm text-white disabled:opacity-40"
              >
                Save note
              </button>
            )}
          </div>
        </div>
      )}

      {earlier.length > 0 && (
        <p className="text-xs text-muted">
          {current ? 'Earlier today' : 'Today'}:{' '}
          {earlier
            .slice()
            .reverse()
            .map((r) => `${r.rating} at ${timeOf(r.at)}`)
            .join(', ')}
        </p>
      )}
    </Section>
  )
}

function SeeAll({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="text-[13px] font-semibold text-teal hover:underline">
      See all
    </button>
  )
}

function RecentlySaved({ savedSongs, isSaved, onSave, onOpenLiked }) {
  const { status } = useSpotify()
  const songs = savedSongs.slice(0, 4)

  return (
    <Section title="Recently saved" aside={songs.length > 0 && <SeeAll onClick={onOpenLiked} />}>
      {songs.length ? (
        <div className="flex flex-col gap-3">
          {songs.map((song) => (
            <SongRow key={`${song.source}-${song.id}`} song={song} slot="home" saved={isSaved(song.id)} onSave={onSave} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">
          {status === 'syncing' ? 'Loading your saved songs…' : 'Save songs in chat or connect Spotify to fill this list.'}
        </p>
      )}
    </Section>
  )
}

function YourPlaylists({ onNavigate, onOpenPlaylist }) {
  const { status, playlists } = useSpotify()
  const lists = playlists.slice(0, 4)
  const needsSpotify = status === 'disconnected' || status === 'expired'

  const empty =
    status === 'syncing'
      ? 'Loading your playlists…'
      : needsSpotify
        ? 'Connect Spotify to see your playlists here.'
        : 'Your Spotify account doesn’t have any playlists yet.'

  return (
    <Section title="Your playlists" aside={lists.length > 0 && <SeeAll onClick={() => onNavigate('playlists')} />}>
      {lists.length ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {lists.map((p) => (
            <button key={p.id} type="button" onClick={() => onOpenPlaylist(p.id)} className="block min-w-0 text-left">
              {p.image ? (
                <img src={p.image} alt="" className="aspect-square w-full rounded-[12px] object-cover" />
              ) : (
                <div className="aspect-square rounded-[12px] bg-art" />
              )}
              <p className="mt-2 truncate text-sm font-semibold">{p.name}</p>
              {p.count !== null && <p className="mt-0.5 text-xs text-muted">{p.count} songs</p>}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">{empty}</p>
      )}
    </Section>
  )
}

export default function HomePage({ savedSongs, isSaved, onSave, onNavigate, onOpenLiked }) {
  const { profile, playlists } = useSpotify()
  const { ratings } = useRatings()
  const [openPlaylistId, setOpenPlaylistId] = useState(null)
  const openPlaylist = playlists.find((p) => p.id === openPlaylistId)
  const firstName = profile?.name?.split(' ')[0]
  const greeting = greetingFor(new Date().getHours())
  const todays = ratings.find((r) => isToday(r.at))
  const mood = todays ? moodForStress(todays.rating) : null

  if (openPlaylist) {
    return <PlaylistDetail playlist={openPlaylist} onBack={() => setOpenPlaylistId(null)} isSaved={isSaved} onSave={onSave} />
  }

  return (
    <section className="mx-auto flex w-full max-w-[640px] flex-col gap-5 px-4 py-5 md:px-8 md:py-10">
      <div>
        <h1 className="font-serif text-[30px] font-semibold">{firstName ? `${greeting}, ${firstName}` : greeting}</h1>
        <p className="mt-1 text-[15px] text-muted">How are you feeling right now?</p>
      </div>

      <MoodRating />

      <Section title="Playlist for your mood" aside={mood && `For ${mood.toLowerCase()}`}>
        <PlaylistPick mood={mood} savedSongs={savedSongs} onOpen={setOpenPlaylistId} />
      </Section>

      <RecentlySaved savedSongs={savedSongs} isSaved={isSaved} onSave={onSave} onOpenLiked={onOpenLiked} />

      <YourPlaylists onNavigate={onNavigate} onOpenPlaylist={setOpenPlaylistId} />
    </section>
  )
}
