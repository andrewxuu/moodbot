import { useEffect, useRef, useState } from 'react'
import { Music, RefreshCw, Send } from 'lucide-react'
import ChatMessage from '../components/ChatMessage'
import Chip from '../components/Chip'
import IconButton from '../components/IconButton'
import SegmentedSwitch from '../components/SegmentedSwitch'
import SongRow from '../components/SongRow'
import SavedPanel from '../components/SavedPanel'
import { useSpotify } from '../spotify/useSpotify'
import { detectMood, getPicks, pickSongs } from '../picks'
import { songs as sampleSongs } from '../data'
import { moodKey, useFeedback } from '../feedback'

const moods = ['Calm', 'Hype', 'Focus', 'Sad', 'Happy']
const SAMPLE_REASON = 'Sample picks. Connect Spotify to get picks from your own listening.'
const greeting = { id: 0, from: 'bot', text: "Hi! How are you feeling? Tell me and I'll find music for it." }

export default function ChatPage({ savedSongs, isSaved, onSave, onNavigate }) {
  const { listening, liked } = useSpotify()
  const { forMood, ratingOf, rate } = useFeedback()
  const isSample = listening.length === 0
  const pool = isSample ? sampleSongs : listening

  const [messages, setMessages] = useState([greeting])
  const [draft, setDraft] = useState('')
  const [mode, setMode] = useState('Match my mood')
  const nextId = useRef(1)
  const shown = useRef({})
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  const respond = async (mood, exclude = [], before = []) => {
    const id = nextId.current++
    setMessages((m) => [...m, ...before, { id, from: 'bot', pending: true }])

    const key = moodKey(mood)
    const alreadyShown = [...(shown.current[key]?.values() ?? [])]
    const feedback = forMood(mood)
    const skip = [...exclude, ...alreadyShown.map((s) => s.id), ...feedback.disliked.map((s) => s.id)]
    const picks = isSample
      ? { ...pickSongs(sampleSongs, mood, mode, skip), reason: SAMPLE_REASON }
      : await getPicks({
          top: listening.filter((s) => s.top),
          library: liked,
          pool: listening,
          mood,
          mode,
          exclude: skip,
          alreadyShown,
          feedback,
        })

    shown.current[key] ??= new Map()
    picks.songs.forEach((s) => shown.current[key].set(s.id, s))

    setMessages((m) => m.map((msg) => (msg.id === id ? { id, from: 'bot', mood, ...picks } : msg)))
  }

  const send = (text) => {
    const clean = text.trim()
    if (!clean) return
    setDraft('')
    respond(detectMood(clean), [], [{ id: nextId.current++, from: 'user', text: clean }])
  }

  const moreLikeThis = (msg) => respond(msg.mood, msg.songs.map((s) => s.id))

  const saveFromChat = (msg, song) => {
    if (!isSaved(song.id)) rate(msg.mood, song, 'up')
    onSave(song)
  }

  const downNote = (msg) => `Won’t be picked again${msg.mood ? ` for ${msg.mood.toLowerCase()}` : ''}`

  const intro = (msg) => {
    const kind = msg.mood ? `${msg.mood.toLowerCase()} ` : ''
    const basis = isSample ? 'your mood' : msg.mood ? 'your mood and your Spotify listening' : 'your Spotify listening'
    return `Here are some ${kind}picks based on ${basis}:`
  }

  return (
    <div className="flex h-full">
      <section className="flex min-w-0 flex-1 flex-col items-center gap-[18px] px-10 py-8">
        <h1 className="self-start font-serif text-[30px] font-semibold">Chat</h1>

        <div className="flex w-full max-w-[700px] flex-1 flex-col gap-3.5 overflow-y-auto">
          {messages.map((msg) => {
            if (msg.from === 'user') {
              return (
                <ChatMessage key={msg.id} from="user" width={400}>
                  {msg.text}
                </ChatMessage>
              )
            }
            if (msg.pending) {
              return (
                <ChatMessage key={msg.id}>
                  <p role="status" className="text-muted">Finding songs…</p>
                </ChatMessage>
              )
            }
            if (!msg.songs) {
              return <ChatMessage key={msg.id}>{msg.text}</ChatMessage>
            }
            if (!msg.songs.length) {
              return (
                <ChatMessage key={msg.id}>
                  I’ve run out of songs I haven’t shown you for this mood. Refresh the page to start fresh, or try another mood.
                </ChatMessage>
              )
            }
            return (
              <ChatMessage key={msg.id} width={540} fill>
                <p>{intro(msg)}</p>
                {msg.songs.map((song) => (
                  <SongRow
                    key={song.id}
                    song={song}
                    slot={`chat-${msg.id}`}
                    saved={isSaved(song.id)}
                    onSave={(s) => saveFromChat(msg, s)}
                    rating={ratingOf(msg.mood, song.id)}
                    onRate={(value) => rate(msg.mood, song, value)}
                    downNote={downNote(msg)}
                  />
                ))}
                <div className="mt-1 flex flex-col gap-2.5">
                  <p className="flex items-center gap-1.5 text-[13px] text-muted">
                    <Music size={14} className="shrink-0" />
                    {msg.reason}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => moreLikeThis(msg)}
                      className="flex h-10 items-center gap-1.5 rounded-full border border-teal bg-white px-3.5 text-sm font-semibold text-teal hover:bg-teal-soft"
                    >
                      <RefreshCw size={16} />
                      More like this
                    </button>
                  </div>
                </div>
              </ChatMessage>
            )
          })}
          <div ref={endRef} />
        </div>

        <div className="flex w-full max-w-[700px] flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {moods.map((m) => (
              <Chip key={m} onClick={() => send(m)}>
                {m}
              </Chip>
            ))}
          </div>
          <SegmentedSwitch options={['Match my mood', 'Lift my mood']} value={mode} onChange={setMode} />
          <div className="flex items-center gap-2.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send(draft)}
              placeholder="Tell me how you feel"
              className="h-[52px] flex-1 rounded-full border border-line bg-white px-[18px] text-base outline-none placeholder:text-hint focus:border-teal"
            />
            <IconButton icon={Send} label="Send" primary onClick={() => send(draft)} />
          </div>
        </div>
      </section>

      <SavedPanel songs={savedSongs} onSeeAll={() => onNavigate('saved')} />
    </div>
  )
}