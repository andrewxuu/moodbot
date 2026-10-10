import { supabase } from '../lib/supabase'
import { searchTrack } from '../spotify/api'

export async function llmSongs(mood, count, have = []) {
  if (!supabase) return []
  const ask = count + 8
  const avoid = have.map((s) => ({ title: s.title, artist: s.artist }))
  const { data, error } = await supabase.functions.invoke('chat', {
    body: { mode: 'songs', mood, count: ask, avoid },
  })
  if (error || !Array.isArray(data?.songs)) return []

  const results = await Promise.allSettled(data.songs.map((s) => searchTrack(s.title, s.artist)))
  return results.flatMap((r) => (r.status === 'fulfilled' && r.value ? [r.value] : []))
}
