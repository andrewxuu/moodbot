import { useState } from 'react'
import { Music, RefreshCw, Send, ThumbsDown, ThumbsUp } from 'lucide-react'
import ChatMessage from '../components/ChatMessage'
import Chip from '../components/Chip'
import IconButton from '../components/IconButton'
import SegmentedSwitch from '../components/SegmentedSwitch'
import SongRow from '../components/SongRow'
import SavedPanel from '../components/SavedPanel'
import { songs } from '../data'

const moods = ['Calm', 'Hype', 'Focus', 'Sad', 'Happy']

export default function ChatPage({ liked, onLike, onNavigate }) {
  const [messages, setMessages] = useState([
    { from: 'user', text: 'Long day at work. I want something calm.' },
  ])
  const [draft, setDraft] = useState('')
  const [mood, setMood] = useState(null)
  const [mode, setMode] = useState('Match my mood')
  const [rating, setRating] = useState(null)
  const picks = songs.slice(0, 3)

  const send = () => {
    const text = draft.trim()
    if (!text) return
    setMessages((m) => [...m, { from: 'user', text }])
    setDraft('')
  }

  return (
    <div className="flex h-full">
      <section className="flex min-w-0 flex-1 flex-col items-center gap-[18px] px-10 py-8">
        <h1 className="self-start font-serif text-[30px] font-semibold">Chat</h1>

        <div className="flex w-full max-w-[700px] flex-1 flex-col gap-3.5 overflow-y-auto">
          <ChatMessage width={480}>Hi! How are you feeling? Tell me and I'll find music for it.</ChatMessage>
          <ChatMessage from="user" width={400}>{messages[0].text}</ChatMessage>

          <ChatMessage width={540}>
            <p>Here are some calm picks based on your mood and your Spotify listening:</p>
            {picks.map((song) => (
              <SongRow key={song.id} song={song} liked={liked.has(song.id)} onLike={onLike} />
            ))}
            <div className="mt-1 flex flex-col gap-2.5">
              <p className="flex items-center gap-1.5 text-[13px] text-muted">
                <Music size={14} />
                Because you said "calm" and you play a lot of indie.
              </p>
              <div className="flex gap-2">
                <IconButton icon={ThumbsUp} label="Good picks" size={40} active={rating === 'up'} onClick={() => setRating('up')} />
                <IconButton icon={ThumbsDown} label="Not for me" size={40} active={rating === 'down'} onClick={() => setRating('down')} />
                <button
                  type="button"
                  className="flex h-10 items-center gap-1.5 rounded-full border border-teal bg-white px-3.5 text-sm font-semibold text-teal"
                >
                  <RefreshCw size={16} />
                  More like this
                </button>
              </div>
            </div>
          </ChatMessage>

          {messages.slice(1).map((m, i) => (
            <ChatMessage key={i} from="user" width={400}>{m.text}</ChatMessage>
          ))}
        </div>

        <div className="flex w-full max-w-[700px] flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {moods.map((m) => (
              <Chip key={m} selected={mood === m} onClick={() => setMood(mood === m ? null : m)}>
                {m}
              </Chip>
            ))}
          </div>
          <SegmentedSwitch options={['Match my mood', 'Lift my mood']} value={mode} onChange={setMode} />
          <div className="flex items-center gap-2.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Tell me how you feel"
              className="h-[52px] flex-1 rounded-full border border-line bg-white px-[18px] text-base outline-none placeholder:text-hint focus:border-teal"
            />
            <IconButton icon={Send} label="Send" primary onClick={send} />
          </div>
        </div>
      </section>

      <SavedPanel songs={songs} onSeeAll={() => onNavigate('saved')} />
    </div>
  )
}
