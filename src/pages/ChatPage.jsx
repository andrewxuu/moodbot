import { useEffect, useRef, useState } from 'react'
import { Heart, ListMusic, ListPlus, RefreshCw, Send } from 'lucide-react'
import ChatDayPicker from '../components/chat/ChatDayPicker'
import ChatMessage, { TypingDots } from '../components/chat/ChatMessage'
import PlaylistCard from '../components/chat/PlaylistCard'
import IconButton from '../components/ui/IconButton'
import SegmentedSwitch from '../components/ui/SegmentedSwitch'
import SongRow from '../components/songs/SongRow'
import SavedPanel from '../components/layout/SavedPanel'
import { useSpotify } from '../spotify/useSpotify'
import { detectMood, getPicks, pickSongs } from '../picks'
import { requestPicks, topArtists } from '../lib/requestPicks'
import { songs as sampleSongs } from '../data/data'
import { moodKey, useFeedback } from '../feedback'
import { chatDays, greetingText, loadChats, saveChat, todayKey } from '../data/sampleChats'
import { askMuse } from '../services/chatLLM'
import { checkInFor } from '../data/sampleMoods'
import { sampleDataOn } from '../lib/devMode'
import { buildMoodSongs, isGoodMatch, matchPercent, profilePlaylists, rankProfiles } from '../lib/playlistMood'
import { MODES, canonMood, mixName, stateFor, targetFor } from '../lib/moodTags'
import StressFace from '../components/ui/StressFace'
import { ratingMood, stressLabel, stressValue, useRatings } from '../ratings'

const SAMPLE_REASON = 'Sample picks. Connect Spotify to get picks from your own listening.'
const wait = () => new Promise((resolve) => setTimeout(resolve, 1200 + Math.random() * 800))

const greeting = { id: 0, from: 'bot', text: greetingText }
const SPOTIFY_REASON = 'Picked from your recent Spotify listening.'
const wantsPlaylist = (text) => /\b(make|create|build|start|put together)\b.*\bplaylist\b/i.test(text)
const asksForPlaylists = (text) => /\b(recommend|suggest|show|find|pick|which|any)\b.*\bplaylists?\b/i.test(text)

const isRecent = (at) => Date.now() - new Date(at).getTime() < 3 * 60 * 1000

export default function ChatPage({ savedSongs, isSaved, onSave, onOpenPlaylist, onOpenLiked }) {
  const { status, profile, playlists, listening, liked, createPlaylist, addSongs } = useSpotify()
  const { forMood, ratingOf, rate } = useFeedback()
  const { ratings, addRating, removeRating } = useRatings()
  const todayRatings = ratings.filter((r) => new Date(r.at).toDateString() === new Date().toDateString())
  const state = todayRatings.length ? stateFor({ stress: stressValue(todayRatings[0].rating), recent: todayRatings.map((r) => stressValue(r.rating)).reverse() }) : null
  const stressOf = (date) => checkInFor(date)?.mood ?? null
  const stateIf = (mood) => (state?.mood === mood ? state : undefined)
  const noMusic = listening.length === 0
  const isSample = noMusic && sampleDataOn()
  const pool = isSample ? sampleSongs : listening

  const [messages, setMessages] = useState(() => loadChats()[todayKey()] ?? [greeting])
  const [draft, setDraft] = useState('')
  const [mode, setMode] = useState(MODES.match)
  const [viewDay, setViewDay] = useState(todayKey)
  const [building, setBuilding] = useState(false)
  const [thinking, setThinking] = useState(false)
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
  }, [messages, viewDay, thinking])

  const respond = async (mood, exclude = [], before = [], request = null) => {
    const id = nextId.current++
    if (noMusic && !isSample) {
      const text = 'Connect Spotify in settings so I can find songs for you.'
      setThinking(true)
      await wait()
      setThinking(false)
      return setMessages((m) => [...m, ...before, { id, from: 'bot', text }])
    }
    setMessages((m) => [...m, ...before, { id, from: 'bot', pending: true }])

    const minimum = wait()
    const key = moodKey(mood)
    const alreadyShown = [...(shown.current[key]?.values() ?? [])]
    const feedback = forMood(mood)
    const skip = [...exclude, ...alreadyShown.map((s) => s.id), ...feedback.disliked.map((s) => s.id)]
    const asked =
      request && !isSample
        ? await requestPicks({
            request,
            mood,
            state: stateIf(mood),
            mode,
            taste: topArtists(listening.filter((s) => s.top).concat(liked)),
            avoid: [...alreadyShown, ...feedback.disliked],
            skip: new Set(skip),
          }).catch(() => [])
        : []
    const picks = asked.length
      ? { songs: asked, reason: '' }
      : isSample
      ? { ...pickSongs(sampleSongs, mood, mode, skip), reason: SAMPLE_REASON }
      : await getPicks({
          top: listening.filter((s) => s.top),
          library: liked,
          pool: listening,
          mood,
          mode,
          state: stateIf(mood),
          exclude: skip,
          alreadyShown,
          feedback,
        })

    await minimum
    shown.current[key] ??= new Map()
    picks.songs.forEach((s) => shown.current[key].set(s.id, s))

    setMessages((m) => m.map((msg) => (msg.id === id ? { id, from: 'bot', mood, request: asked.length ? request : null, ...picks } : msg)))
  }

  const applyStress = (level) => {
    if (!Number.isInteger(level) || level < 1 || level > 5) return null
    const last = todayRatings[0]
    if (last?.rating === level) return null
    if (last && isRecent(last.at)) return null
    const ratingId = addRating(level, { note: 'From chat', source: 'chat' })
    return { id: nextId.current++, from: 'bot', stressNote: { ratingId, level, backTo: last?.rating ?? null, undone: false } }
  }

  const undoStress = (msg) => {
    removeRating(msg.stressNote.ratingId)
    setMessages((m) => m.map((x) => (x.id === msg.id ? { ...x, stressNote: { ...x.stressNote, undone: true } } : x)))
  }

  const botSay = async (text) => {
    setThinking(true)
    await wait()
    setThinking(false)
    setMessages((m) => [...m, { id: nextId.current++, from: 'bot', text }])
  }

  const makePlaylist = async (mood) => {
    if (status !== 'connected') return botSay('Connect Spotify first, then I can make playlists for you.')
    if (building) return
    setBuilding(true)
    const id = nextId.current++
    setMessages((m) => [...m, { id, from: 'bot', pending: true }])
    const finish = (msg) => setMessages((m) => m.map((x) => (x.id === id ? { id, from: 'bot', ...msg } : x)))
    try {
      const songs = await buildMoodSongs({ mood, state: stateIf(mood), mode, saved: savedSongs, listening })
      if (!songs.length) throw new Error('I couldn’t find enough songs yet. Try again in a bit.')
      const playlist = await createPlaylist(mixName(mood))
      await addSongs(playlist.id, songs)
      finish({
        text: `Done. Your ${mixName(mood)} is ready.`,
        playlist: { id: playlist.id, name: playlist.name, image: playlist.image ?? null, count: songs.length },
      })
    } catch (err) {
      finish({ text: err.message || 'I couldn’t make that playlist. Try again.' })
    } finally {
      setBuilding(false)
    }
  }

  const recommendPlaylists = async (mood) => {
    if (status !== 'connected' || !profile?.id) return botSay('Connect Spotify first, then I can look through your playlists.')
    const id = nextId.current++
    setMessages((m) => [...m, { id, from: 'bot', pending: true }])
    const minimum = wait()
    const finish = async (msg) => {
      await minimum
      setMessages((m) => m.map((x) => (x.id === id ? { id, from: 'bot', ...msg } : x)))
    }
    try {
      const profiles = await profilePlaylists(playlists, profile.id)
      const fits = rankProfiles(profiles, targetFor(mood, mode === MODES.lift, stateIf(mood)))
        .filter((p) => isGoodMatch(p.distance))
        .slice(0, 3)
      if (!fits.length) return finish({ text: 'None of your playlists fit that well. Say “make a playlist” and I’ll build one.' })
      finish({
        text: fits.length === 1 ? 'This one of yours fits best:' : 'These playlists of yours fit best:',
        playlists: fits.map(({ playlist, distance }) => ({
          id: playlist.id,
          name: playlist.name,
          image: playlist.image ?? null,
          count: playlist.count,
          match: matchPercent(distance),
        })),
      })
    } catch {
      finish({ text: 'I couldn’t look through your playlists. Try again.' })
    }
  }

  const send = async (text) => {
    const clean = text.trim()
    if (!clean) return
    setDraft('')
    const userMsg = { id: nextId.current++, from: 'user', text: clean }
    setMessages((m) => [...m, userMsg])

    const wantsMake = wantsPlaylist(clean)
    if (wantsMake || asksForPlaylists(clean)) {
      const mood = detectMood(clean) || [...messages].reverse().find((m) => m.mood)?.mood || state?.mood
      if (!mood) return botSay('Happy to. How are you feeling? Tell me or pick a mood below, then ask again.')
      return wantsMake ? makePlaylist(mood) : recommendPlaylists(mood)
    }

    setThinking(true)
    const llm = await askMuse([...messages, userMsg]).finally(() => setThinking(false))
    if (!llm) {
      const known = detectMood(clean) || [...messages].reverse().find((m) => m.mood)?.mood || state?.mood
      if (!known) return botSay('How are you feeling right now, or what are you in the mood for? Tell me or pick a mood below.')
      return respond(known, [], [], clean)
    }

    const replyMsg = { id: nextId.current++, from: 'bot', text: llm.reply }
    const noteMsg = applyStress(llm.stress)
    const lead = noteMsg ? [replyMsg, noteMsg] : [replyMsg]
    if (!llm.song_queries.length) return setMessages((m) => [...m, ...lead])
    respond(detectMood(llm.mood) || detectMood(clean), [], lead, clean)
  }

  const moreLikeThis = (msg) => respond(msg.mood, msg.songs.map((s) => s.id), [], msg.request)

  const saveFromChat = (msg, song) => {
    if (!isSaved(song.id)) rate(msg.mood, song, 'up')
    onSave(song)
  }

  const downNote = (msg) => `Won’t be picked again${msg.mood ? ` for ${msg.mood.toLowerCase()}` : ''}`

  const intro = (msg) => {
    const kind = canonMood(msg.mood) ? ` for feeling ${canonMood(msg.mood).toLowerCase()}` : ''
    if (msg.request) return `Matched to what you asked${kind}:`
    const basis = isSample ? 'your mood' : msg.mood ? 'your mood and your Spotify listening' : 'your Spotify listening'
    return `Here are some picks${kind} based on ${basis}:`
  }

  return (
    <div className="flex h-full">
      <section className="flex min-w-0 flex-1 flex-col items-center gap-3.5 px-4 py-5 md:gap-[18px] md:px-8 md:py-8 xl:px-10">
        <div className="flex w-full items-center gap-3">
          <h1 className="font-serif text-[26px] font-semibold md:text-[30px]">Chat</h1>
          <ChatDayPicker days={days} value={viewDay} onChange={setViewDay} stressOf={stressOf} />
          <button
            type="button"
            onClick={() => setSavedOpen(true)}
            className="ml-auto flex h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-sm font-semibold hover:border-teal xl:hidden"
          >
            <Heart size={16} className="text-teal" />
            Saved songs
          </button>
        </div>

        <div className="flex w-full max-w-[700px] flex-1 flex-col gap-3.5 overflow-y-auto no-scrollbar">
          {visible.map((msg) => {
            if (msg.from === 'user') {
              return (
                <ChatMessage key={msg.id} from="user" width={400}>
                  {msg.text}
                </ChatMessage>
              )
            }
            if (msg.stressNote) {
              const n = msg.stressNote
              const canUndo = isToday && !n.undone && ratings.some((r) => r.id === n.ratingId)
              return (
                <p key={msg.id} role="status" className="flex items-center gap-2 px-1 text-[13px] text-muted">
                  <StressFace mood={n.undone && !n.backTo ? null : ratingMood(n.undone ? n.backTo : n.level)} size={22} />
                  {n.undone
                    ? n.backTo
                      ? `Back to ${stressLabel(n.backTo)}`
                      : 'Stress update removed'
                    : `Stress updated to ${stressLabel(n.level)}`}
                  {canUndo && (
                    <button type="button" onClick={() => undoStress(msg)} className="font-semibold text-teal hover:underline">
                      Undo
                    </button>
                  )}
                </p>
              )
            }
            if (msg.pending) {
              return (
                <ChatMessage key={msg.id}>
                  <TypingDots label="Finding songs" />
                </ChatMessage>
              )
            }
            if (msg.playlists) {
              return (
                <ChatMessage key={msg.id} width={480} fill>
                  <p>{msg.text}</p>
                  {msg.playlists.map((p) => (
                    <PlaylistCard key={p.id} playlist={p} onOpen={onOpenPlaylist} />
                  ))}
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
                    queue={msg.songs}
                    saved={isSaved(song.id)}
                    onSave={(s) => saveFromChat(msg, s)}
                    rating={ratingOf(msg.mood, song.id)}
                    onRate={(value) => rate(msg.mood, song, value)}
                    downNote={downNote(msg)}
                  />
                ))}
                <div className="mt-1 flex flex-col gap-2.5">
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
                          onClick={() => recommendPlaylists(msg.mood)}
                          className="flex h-10 items-center gap-1.5 rounded-full border border-teal bg-surface px-3.5 text-sm font-semibold text-teal hover:bg-teal-soft"
                        >
                          <ListMusic size={16} />
                          Find a playlist
                        </button>
                      )}
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
          {thinking && isToday && (
            <ChatMessage>
              <TypingDots />
            </ChatMessage>
          )}
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
            <SegmentedSwitch options={[MODES.match, MODES.lift]} value={mode} onChange={setMode} />
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
        onSeeAll={onOpenLiked}
        drawerOpen={savedOpen}
        onCloseDrawer={() => setSavedOpen(false)}
      />
    </div>
  )
}