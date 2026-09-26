import { useSpotify } from '../spotify/useSpotify'
import { daysBetween, sampleCheckIn } from '../data/sampleMoods'
import { useState } from 'react'
import { CircleCheck } from 'lucide-react'
import { moodBg, moodLabel, scoreMood } from '../lib/moodMonth'
import { ratingMood, stressLabel, useRatings } from '../ratings'

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
        {aside && <p className="text-[13px] text-muted">{aside}</p>}
      </div>
      {children}
    </section>
  )
}

function SongPlaceholder() {
  return (
    <div className="flex items-center gap-3">
      <div className="size-10 shrink-0 rounded-lg bg-art" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold">[Song title]</p>
        <p className="mt-0.5 truncate text-[13px] text-muted">[Artist]</p>
      </div>
    </div>
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
      <div role="radiogroup" aria-label="Stress from 1, very stressed, to 10, calm" className="grid grid-cols-10 gap-1.5">
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
        <span>Very stressed</span>
        <span>Calm</span>
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

function WeekSnapshot() {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)
  const days = daysBetween(start, today).map((date) => ({ date, checkIn: sampleCheckIn(date, today) }))
  const scores = days.filter((d) => d.checkIn).map((d) => d.checkIn.score)
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null
  const avgMood = avg ? scoreMood[Math.round(avg)] : null

  return (
    <Section title="This week" aside={avgMood ? `Avg ${moodLabel(avgMood)} ${avg.toFixed(1)}` : 'No check-ins yet'}>
      <div className="flex h-[110px] items-end gap-1.5">
        {days.map(({ date, checkIn }) =>
          checkIn ? (
            <span
              key={date.toISOString()}
              style={{ height: checkIn.score * 20 }}
              className={`flex-1 rounded-b-[2px] rounded-t-[4px] ${moodBg[checkIn.mood]}`}
            />
          ) : (
            <span key={date.toISOString()} className="h-5 flex-1 rounded-[4px] border border-dashed border-line" />
          )
        )}
      </div>
      <div className="flex gap-1.5 text-center text-[11px] text-muted">
        {days.map(({ date }) => (
          <span key={date.toISOString()} className="flex-1">
            {date.toLocaleDateString('en-US', { weekday: 'narrow' })}
          </span>
        ))}
      </div>
      <p className="text-xs text-muted">Sample data</p>
    </Section>
  )
}

function Picks() {
  return (
    <Section title="Picks for you">
      <div className="flex flex-col gap-3">
        <SongPlaceholder />
        <SongPlaceholder />
        <SongPlaceholder />
      </div>
    </Section>
  )
}

function RecentlySaved() {
  return (
    <Section title="Recently saved">
      <div className="grid gap-3 sm:grid-cols-2">
        <SongPlaceholder />
        <SongPlaceholder />
        <SongPlaceholder />
        <SongPlaceholder />
      </div>
      <h3 className="mt-2 text-[15px] font-semibold">Your playlists</h3>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i}>
            <div className="aspect-square rounded-[12px] bg-art" />
            <p className="mt-2 truncate text-sm font-semibold">[Playlist name]</p>
            <p className="mt-0.5 text-xs text-muted">[# songs]</p>
          </div>
        ))}
      </div>
    </Section>
  )
}

export default function HomePage() {
  const { profile } = useSpotify()
  const firstName = profile?.name?.split(' ')[0]
  const greeting = greetingFor(new Date().getHours())

  return (
    <section className="flex flex-col gap-5 px-10 py-8">
      <div>
        <h1 className="font-serif text-[30px] font-semibold">{firstName ? `${greeting}, ${firstName}` : greeting}</h1>
        <p className="mt-1 text-[15px] text-muted">How are you feeling right now?</p>
      </div>

      <MoodRating />

      <div className="grid gap-5 lg:grid-cols-2">
        <WeekSnapshot />
        <Picks />
      </div>

      <RecentlySaved />
    </section>
  )
}
