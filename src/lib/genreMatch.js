import { getArtistTags, isLastfmConfigured } from '../services/lastfm'
import { firstArtist } from './filters'

const GENRE_WORDS = {
  Pop: ['pop'],
  'Hip hop': ['hip hop', 'hip-hop', 'rap', 'trap', 'drill'],
  'R&B': ['r&b', 'rnb', 'rhythm and blues'],
  Rock: ['rock'],
  Indie: ['indie'],
  Alternative: ['alternative', 'alt'],
  Electronic: ['electronic', 'electronica', 'house', 'techno', 'synth'],
  EDM: ['edm', 'dubstep', 'big room'],
  'Lo-fi': ['lo-fi', 'lofi', 'lo fi'],
  Jazz: ['jazz'],
  Classical: ['classical', 'orchestral', 'baroque'],
  Folk: ['folk'],
  Country: ['country'],
  Metal: ['metal', 'metalcore'],
  'K-pop': ['k-pop', 'kpop'],
  Latin: ['latin', 'reggaeton', 'salsa', 'bachata'],
  Soul: ['soul', 'motown'],
  Ambient: ['ambient', 'drone'],
}

export const GENRE_TAGS = { 'Hip hop': 'hip-hop', 'R&B': 'rnb', 'K-pop': 'k-pop' }
export const genreTag = (genre) => GENRE_TAGS[genre] ?? genre.toLowerCase()

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const patterns = Object.fromEntries(
  Object.entries(GENRE_WORDS).map(([g, words]) => [g, words.map((w) => new RegExp(`(^|[\\s-])${escape(w)}($|[\\s-])`))])
)

export function matchGenre(names = [], genres = []) {
  return genres.find((g) => patterns[g]?.some((p) => names.some((n) => p.test(n.toLowerCase())))) ?? null
}

async function genreNames(song) {
  if (song.genres?.length) return song.genres
  if (!isLastfmConfigured()) return []
  const tags = await getArtistTags(firstArtist(song.artist)).catch(() => [])
  return tags.filter((t) => t.count >= 20).slice(0, 8).map((t) => t.name)
}

export async function checkGenres(songs, prefs) {
  if (!prefs.liked.length && !prefs.avoided.length) return songs.map(() => ({ avoided: false, liked: null }))
  const names = await Promise.all(songs.map(genreNames))
  return names.map((n) => ({ avoided: Boolean(matchGenre(n, prefs.avoided)), liked: matchGenre(n, prefs.liked) }))
}
