import { dayKey, seeded } from './sampleMoods'

const STORAGE_KEY = 'moodbot:chats'
const DAYS_BACK = 14

export const greetingText = "Hi! How are you feeling? Tell me and I'll find music for it."

const prompts = {
  Calm: ['Long day, I need to wind down', 'Want something calm before bed', 'Stressed about exams, help me relax'],
  Hype: ['Heading to the gym, hype me up', 'Need energy for a night out', 'Pump me up for this run'],
  Focus: ['Studying for midterms, need focus music', 'Got a lot of work to get through', 'Help me focus on this essay'],
  Sad: ['Feeling kind of down today', 'Missing home a bit', 'Rough day, something sad'],
  Happy: ['Great day, give me something happy', 'Just got good news', 'Feeling good, keep it going'],
}
const moods = Object.keys(prompts)

export const todayKey = () => dayKey(new Date())

export function loadChats() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {}
  } catch {
    return {}
  }
}

export function saveChat(key, messages) {
  try {
    const all = loadChats()
    all[key] = messages
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    return
  }
}

const pickFrom = (rand, list) => list[Math.floor(rand() * list.length)]

function sampleChat(date, pool, reason) {
  const rand = seeded(`chat-${dayKey(date)}`)
  if (rand() < 0.3) return null
  const messages = [{ id: 0, from: 'bot', text: greetingText }]
  const turns = rand() < 0.35 ? 2 : 1
  let id = 1
  for (let t = 0; t < turns; t++) {
    const mood = pickFrom(rand, moods)
    const songs = [...pool].sort(() => rand() - 0.5).slice(0, 3)
    messages.push({ id: id++, from: 'user', text: pickFrom(rand, prompts[mood]) })
    messages.push({ id: id++, from: 'bot', mood, songs, reason })
  }
  return messages
}

export function chatDays(pool, reason) {
  const saved = loadChats()
  const now = new Date()
  const days = []
  for (let back = 0; back <= DAYS_BACK; back++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back)
    const key = dayKey(date)
    const messages = saved[key] ?? (back === 0 ? null : sampleChat(date, pool, reason))
    if (back === 0 || messages) days.push({ key, date, messages })
  }
  return days
}

export function dayName(date) {
  const now = new Date()
  const diff = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - date) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
