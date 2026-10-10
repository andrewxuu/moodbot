import { useEffect, useRef, useState } from 'react'
import { Heart, ListPlus, Music, RefreshCw, Send } from 'lucide-react'
import ChatDayPicker from '../components/chat/ChatDayPicker'
import ChatMessage from '../components/chat/ChatMessage'
import PlaylistCard from '../components/chat/PlaylistCard'
import Chip from '../components/ui/Chip'
import IconButton from '../components/ui/IconButton'
import SegmentedSwitch from '../components/ui/SegmentedSwitch'
import SongRow from '../components/songs/SongRow'
import SavedPanel from '../components/layout/SavedPanel'
import { useSpotify } from '../spotify/useSpotify'
import { detectMood, getPicks, pickSongs } from '../picks'
import { songs as sampleSongs } from '../data/data'
import { moodKey, useFeedback } from '../feedback'
import { chatDays, greetingText, loadChats, saveChat, todayKey } from '../data/sampleChats'
import { askMoodbot } from '../services/chatLLM'
import { buildMoodSongs } from '../lib/playlistMood'

const moods = ['Calm', 'Hype', 'Focus', 'Sad', 'Happy']
const SAMPLE_REASON = 'Sample picks. Connect Spotify to get picks from your own listening.'
const greeting = { id: 0, from: 'bot', text: greetingText }
const SPOTIFY_REASON = 'Picked from your recent Spotify listening.'
const wantsPlaylist = (text) => /\b(make|create|build|start|put together)\b.*\bplaylist\b/i.test(text)

export default function ChatPage({ savedSongs, isSaved, onSave, onNavigate, onOpenPlaylist }) {
  const { status, listening, liked, createPlaylist, addSongs } = useSpotify()
  const { forMood, ratingOf, rate } = useFeedback()
  const isSample = listening.length === 0
  const pool = isSample ? sampleSongs : listening

  const [messages, setMessages] = useState(() => loadChats()[todayKey()] ?? [greeting])
  const [draft, setDraft] = useState('')
  const [mode, setMode] = useState('Match my mood')
  const [viewDay, setViewDay] = useState(todayKey)
  const [building, setBuilding] = useState(false)
  const [savedOpen, setSavedOpen] = useState(false)
  const nextId = useRef(null)
  const shown = useRef({})
  const endRef = useRef(null)
  if (nextId.current === null) nextId.current = Math.max(0, ...messages.map((m) => m.id)) + 1

  const days = chatDays(pool, isSample ? SAMPLE_REASON : SPOTIFY_REASON)
  const isToday = viewDay === todayKey()
  const visible = isToday ? messages : (days.find((d) => d.key === viewDay)?.messages ?? [])

  useEffect(() => {
    saveChat(todayKey(), messages.filter((m) => !m.pending))
  }, [messages])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, viewDay])

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

  const botSay = (text) => setMessages((m) => [...m, { id: nextId.current++, from: 'bot', text }])

  const makePlaylist = async (mood) => {
    if (status !== 'connected') return botSay('Connect Spotify first, then I can make playlists for you.')
    if (building) return
    setBuilding(true)
    const id = nextId.current++
    setMessages((m) => [...m, { id, from: 'bot', pending: true }])
    const finish = (msg) => setMessages((m) => m.map((x) => (x.id === id ? { id, from: 'bot', ...msg } : x)))
    try {
      const songs = await buildMoodSongs({ mood, saved: savedSongs, listening })
      if (!songs.length) throw new Error(`I couldn’t find ${mood.toLowerCase()} songs yet. Try again in a bit.`)
      const playlist = await createPlaylist(`${mood} mix`)
      await addSongs(playlist.id, songs)
      finish({
        text: `Done. I made you a ${mood.toLowerCase()} mix.`,
        playlist: { id: playlist.id, name: playlist.name, image: playlist.image ?? null, count: songs.length },
      })
    } catch (err) {
      finish({ text: err.message || 'I couldn’t make that playlist. Try again.' })
    } finally {
      setBuilding(false)
    }
  }

  const send = async (text) => {
    const clean = text.trim()
    if (!clean) return
    setDraft('')
    const userMsg = { id: nextId.current++, from: 'user', text: clean }
    setMessages((m) => [...m, userMsg])

    if (wantsPlaylist(clean)) {
      const mood = detectMood(clean) || [...messages].reverse().find((m) => m.mood)?.mood
      if (!mood) return botSay('Happy to. How are you feeling? Tell me or pick a mood below, then ask again.')
      return makePlaylist(mood)
    }

    const llm = await askMoodbot([...messages, userMsg])
    if (!llm) return respond(detectMood(clean))

    const replyMsg = { id: nextId.current++, from: 'bot', text: llm.reply }
    if (!llm.song_queries.length) return setMessages((m) => [...m, replyMsg])
    respond(detectMood(llm.mood) || detectMood(clean), [], [replyMsg])
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
      <section className="flex min-w-0 flex-1 flex-col items-center gap-3.5 px-4 py-5 md:gap-[18px] md:px-8 md:py-8 xl:px-10">
        <div className="flex w-full items-center gap-3">
          <h1 className="font-serif text-[26px] font-semibold md:text-[30px]">Chat</h1>
          <ChatDayPicker days={days} value={viewDay} onChange={setViewDay} />
          <button
            type="button"
            onClick={() => setSavedOpen(true)}
            className="ml-auto flex h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-sm font-semibold hover:border-teal xl:hidden"
          >
            <Heart size={16} className="text-teal" />
            Saved songs
          </button>
        </div>

        <div className="flex w-full max-w-[700px] flex-1 flex-col gap-3.5 overflow-y-auto">
          {visible.map((msg) => {
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
            if (msg.playlist) {
              return (
                <ChatMessage key={msg.id} width={480} fill>
                  <p>{msg.text}</p>
                  <PlaylistCard playlist={msg.playlist} onOpen={onOpenPlaylist} />
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
                    slot={`chat-${viewDay}-${msg.id}`}
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
                  {isToday && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => moreLikeThis(msg)}
                        className="flex h-10 items-center gap-1.5 rounded-full border border-teal bg-surface px-3.5 text-sm font-semibold text-teal hover:bg-teal-soft"
                      >
                        <RefreshCw size={16} />
                        More like this
                      </button>
                      {msg.mood && (
                        <button
                          type="button"
                          onClick={() => makePlaylist(msg.mood)}
                          disabled={building}
                          className="flex h-10 items-center gap-1.5 rounded-full bg-teal px-3.5 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          <ListPlus size={16} />
                          Make a playlist
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </ChatMessage>
            )
          })}
          <div ref={endRef} />
        </div>

        {!isToday ? (
          <div className="flex w-full max-w-[700px] items-center justify-between gap-3 rounded-full border border-dashed border-line px-5 py-3">
            <p className="text-sm text-muted">This is a past chat, so you can only view it.</p>
            <button type="button" onClick={() => setViewDay(todayKey())} className="text-sm font-semibold text-teal hover:underline">
              Back to today
            </button>
          </div>
        ) : (
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
                className="h-[52px] flex-1 rounded-full border border-line bg-surface px-[18px] text-base outline-none placeholder:text-hint focus:border-teal"
              />
              <IconButton icon={Send} label="Send" primary onClick={() => send(draft)} />
            </div>
          </div>
        )}
      </section>

      <SavedPanel
        songs={savedSongs}
        onSeeAll={() => onNavigate('saved')}
        drawerOpen={savedOpen}
        onCloseDrawer={() => setSavedOpen(false)}
      />
    </div>
  )
}