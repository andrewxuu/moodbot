import { supabase } from './supabase'

const FIELDS = { genres: 'moodbot:genres', saved: 'moodbot:saved-songs' }
const EMPTY = { genres: { liked: [], avoided: [] }, saved: [] }
const timers = {}
let userId = null

const readJson = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key))
  } catch {
    return null
  }
}

export const setSyncUser = (id) => {
  userId = id
}

export async function pushAll(id) {
  if (!supabase) return
  const row = { user_id: id, updated_at: new Date().toISOString() }
  for (const [field, key] of Object.entries(FIELDS)) row[field] = readJson(key) ?? EMPTY[field]
  const { error } = await supabase.from('user_data').upsert(row)
  if (error) throw error
}

export async function pullCloud(id) {
  if (!supabase) return
  const { data, error } = await supabase.from('user_data').select('genres, saved').eq('user_id', id).maybeSingle()
  if (error) throw error
  if (!data) return pushAll(id)
  for (const [field, key] of Object.entries(FIELDS)) {
    if (data[field] != null) localStorage.setItem(key, JSON.stringify(data[field]))
  }
}

export function cloudPush(field, value) {
  if (!supabase || !userId) return
  clearTimeout(timers[field])
  timers[field] = setTimeout(() => {
    supabase.from('user_data').upsert({ user_id: userId, [field]: value, updated_at: new Date().toISOString() }).then(() => {})
  }, 600)
}
