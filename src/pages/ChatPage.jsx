import { useEffect, useRef, useState } from 'react'
import { Music, RefreshCw, Send, ThumbsDown, ThumbsUp } from 'lucide-react'
import ChatMessage from '../components/ChatMessage'
import Chip from '../components/Chip'
import IconButton from '../components/IconButton'
import SegmentedSwitch from '../components/SegmentedSwitch'
import SongRow from '../components/SongRow'
import SavedPanel from '../components/SavedPanel'
import { useSpotify } from '../spotify/useSpotify'
import { detectMood, pickSongs } from '../picks'
import { songs as sampleSongs } from '../data'

const moods = ['Calm', 'Hype', 'Focus', 'Sad', 'Happy']
const greeting = { id: 0, from: 'bot', text: "Hi! How are you feeling? Tell me and I'll find music for it." }

export default function ChatPage({ savedSongs, isSaved, onSave, onNavigate }) {
  const { listening } = useSpotify()
  const isSample = listening.length === 0
  const pool = isSample ? sampleSongs : listening

  const [messages, setMessages] = useState([greeting])
  const [draft, setDraft] = useState('')
  const [mode, setMode] = useState('Match my mood')
  const [ratings, setRatings] = useState({})
  const nextId = useRef(1)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  const makeReply = (mood, exclude = []) => {
    const { songs, reason } = pickSongs(pool, mood, mode, exclude)
    return {
      id: nextId.current++,
      from: 'bot',
      mood,
      songs,
      reason: isSample ? 'Sample picks. Connect Spotify to get picks from your own listening.' : reason,
    }
  }

  const send = (text) => {
    const clean = text.trim()
    if (!clean) return
    const userMessage = { id: nextId.current++, from: 'user', text: clean }
    const reply = makeReply(detectMood(clean))
    setMessages((m) => [...m, userMessage, reply])
    setDraft('')
  }

  const moreLikeThis = (msg) => {
    const reply = makeReply(msg.mood, msg.songs.map((s) => s.id))
    setMessages((m) => [...m, reply])
  }

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
            if (!msg.songs) {
              return <ChatMessage key={msg.id}>{msg.text}</ChatMessage>
            }
            if (!msg.songs.length) {
              return (
                <ChatMessage key={msg.id}>
                  I couldn’t find new songs in your listening history. Try syncing Spotify again later.
                </ChatMessage>
              )
            }
            return (
              <ChatMessage key={msg.id} width={540} fill>
                <p>{intro(msg)}</p>
                {msg.songs.map((song) => (
                  <SongRow key={song.id} song={song} slot={`chat-${msg.id}`} saved={isSaved(song.id)} onSave={onSave} />
                ))}
                <div className="mt-1 flex flex-col gap-2.5">
                  <p className="flex items-center gap-1.5 text-[13px] text-muted">
                    <Music size={14} className="shrink-0" />
                    {msg.reason}
                  </p>
                  <div className="flex gap-2">
                    <IconButton
                      icon={ThumbsUp}
                      label="Good picks"
                      size={40}
                      active={ratings[msg.id] === 'up'}
                      onClick={() => setRatings((r) => ({ ...r, [msg.id]: 'up' }))}
                    />
                    <IconButton
                      icon={ThumbsDown}
                      label="Not for me"
                      size={40}
                      active={ratings[msg.id] === 'down'}
                      onClick={() => setRatings((r) => ({ ...r, [msg.id]: 'down' }))}
                    />
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
