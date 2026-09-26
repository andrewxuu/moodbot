import { getArtistTags, getTrackTags } from '../services/lastfm'
import { firstArtist } from './filters'

export const MOOD_TAGS = {
  Calm: ['chill', 'chillout', 'mellow', 'relaxing', 'calm', 'soft', 'peaceful', 'dreamy', 'ambient', 'lo-fi', 'acoustic'],
  Hype: ['energetic', 'party', 'workout', 'hype', 'upbeat', 'dance', 'banger', 'aggressive', 'gym', 'pump up'],
  Focus: ['instrumental', 'study', 'focus', 'concentration', 'ambient', 'lo-fi', 'post-rock', 'minimal', 'piano', 'soundtrack'],
  Sad: ['sad', 'melancholy', 'melancholic', 'depressing', 'heartbreak', 'breakup', 'emotional', 'lonely', 'bittersweet', 'crying'],
  Happy: ['happy', 'feel good', 'upbeat', 'fun', 'summer', 'uplifting', 'cheerful', 'good vibes', 'sunshine', 'joyful'],
}

const OPPOSITE = { Calm: 'Hype', Hype: 'Calm', Sad: 'Happy', Happy: 'Sad', Focus: 'Hype' }
const OPPOSITE_WEIGHT = 0.5
const ARTIST_WEIGHT = 0.5
const MIN_TRACK_TAGS = 3

export const discoveryTags = (mood) => MOOD_TAGS[mood].slice(0, 5)

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const patterns = Object.fromEntries(
  Object.entries(MOOD_TAGS).map(([mood, tags]) => [mood, tags.map((t) => new RegExp(`(^|[\\s-])${escape(t)}($|[\\s-])`))])
)

function matchTags(tags, mood) {
  let total = 0
  const hits = []
  tags.forEach((t) => {
    if (patterns[mood].some((p) => p.test(t.name))) {
      total += t.count / 100
      if (!hits.includes(t.name)) hits.push(t.name)
    }
  })
  return { total, hits }
}

export function scoreTags(tags, mood) {
  const good = matchTags(tags, mood)
  const bad = matchTags(tags, OPPOSITE[mood])
  return { score: good.total - OPPOSITE_WEIGHT * bad.total, matched: good.hits.slice(0, 3) }
}

async function tagsFor({ artist, title }) {
  const name = firstArtist(artist)
  const track = await getTrackTags(name, title).catch(() => [])
  if (track.filter((t) => t.count >= 10).length >= MIN_TRACK_TAGS) return track
  const fromArtist = await getArtistTags(name).catch(() => [])
  return [...track, ...fromArtist.map((t) => ({ ...t, count: t.count * ARTIST_WEIGHT }))]
}

export async function scoreSongs(songs, mood) {
  const tags = await Promise.all(songs.map(tagsFor))
  return tags.map((t) => scoreTags(t, mood))
}
