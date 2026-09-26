import { getAudioFeatures } from './reccobeats'
import { searchTrack } from './spotify/api'
import { FILTERS, firstArtist, libraryProfile, passesLanguage, songKey } from './filters'
import { getArtistTopTracks, getSimilarArtists, getSimilarTracks, isLastfmConfigured } from './lastfm'

const moodWords = {
  Calm: ['calm', 'chill', 'relax', 'tired', 'long day', 'peace', 'slow'],
  Hype: ['hype', 'pump', 'energy', 'party', 'workout', 'gym', 'excited'],
  Focus: ['focus', 'study', 'concentrate', 'homework', 'work'],
  Sad: ['sad', 'down', 'low', 'cry', 'lonely', 'upset', 'heartbroken'],
  Happy: ['happy', 'good', 'great', 'joy', 'fun'],
}

const moodGenres = {
  Calm: ['ambient', 'acoustic', 'chill', 'folk', 'lo-fi', 'piano', 'jazz', 'soul', 'bedroom'],
  Hype: ['hip hop', 'rap', 'edm', 'dance', 'rock', 'metal', 'trap', 'house', 'drill', 'punk'],
  Focus: ['lo-fi', 'ambient', 'classical', 'instrumental', 'piano', 'post-rock', 'soundtrack'],
  Sad: ['emo', 'sad', 'singer-songwriter', 'folk', 'slowcore', 'acoustic', 'indie'],
  Happy: ['pop', 'funk', 'disco', 'dance', 'k-pop', 'reggae', 'afrobeats'],
}

const liftTo = { Sad: 'Happy', Calm: 'Happy', Focus: 'Focus', Hype: 'Hype', Happy: 'Happy' }

export function detectMood(text) {
  const t = text.toLowerCase()
  return Object.keys(moodWords).find((m) => moodWords[m].some((w) => t.includes(w))) ?? null
}

const shuffle = (list) => [...list].sort(() => Math.random() - 0.5)

export function pickSongs(pool, mood, mode, exclude = []) {
  const lifting = mode === 'Lift my mood' && mood
  const target = lifting ? liftTo[mood] : mood
  const keywords = target ? moodGenres[target] : []
  const genreOf = (song) => song.genres?.find((g) => keywords.some((k) => g.includes(k)))

  const available = pool.filter((s) => !exclude.includes(s.id))
  const matches = shuffle(available.filter(genreOf))
  const rest = shuffle(available.filter((s) => !genreOf(s)))
  const songs = [...matches, ...rest].slice(0, 3)
  const genre = matches.length ? genreOf(matches[0]) : null

  let reason = 'Picked from your recent Spotify listening.'
  if (genre && lifting) reason = `Lifting your mood with ${genre}, which you play a lot.`
  else if (genre) reason = `You asked for ${target.toLowerCase()} music, and you play a lot of ${genre}.`

  return { songs, reason }
}

const targets = {
  Calm: { energy: 0.3, valence: 0.5, acousticness: 0.6 },
  Hype: { energy: 0.85, danceability: 0.75, valence: 0.65 },
  Focus: { energy: 0.4, instrumentalness: 0.6, speechiness: 0.05 },
  Sad: { energy: 0.3, valence: 0.2 },
  Happy: { energy: 0.7, valence: 0.85, danceability: 0.7 },
}

const feel = { Calm: 'calm', Hype: 'high-energy', Focus: 'focused', Sad: 'sad', Happy: 'happy' }

function targetsFor(mood, lifting) {
  if (!mood) return {}
  const t = { ...targets[mood] }
  if (lifting) {
    t.valence = Math.min(1, (t.valence ?? 0.5) + 0.3)
    t.energy = Math.min(1, (t.energy ?? 0.5) + 0.15)
  }
  return t
}

const DIMS = ['energy', 'valence', 'danceability', 'acousticness', 'instrumentalness']

function distance(features, target) {
  const keys = Object.keys(target).filter((k) => DIMS.includes(k) && typeof features?.[k] === 'number')
  if (!keys.length) return Infinity
  return Math.sqrt(keys.reduce((sum, k) => sum + (features[k] - target[k]) ** 2, 0) / keys.length)
}

const closest = (songs, features, target, n) =>
  [...songs].sort((a, b) => distance(features[a.id], target) - distance(features[b.id], target)).slice(0, n)

async function findCandidates(seeds, knownKeys, profile) {
  const candidates = new Map()
  const add = (c, weight) => {
    if (!c.title || !c.artist) return
    const key = songKey(c.artist, c.title)
    if (knownKeys.has(key) || !passesLanguage({ title: c.title, artist: c.artist }, profile)) return
    const current = candidates.get(key) ?? { ...c, score: 0 }
    current.score += weight
    candidates.set(key, current)
  }

  const lists = await Promise.allSettled(seeds.map((s) => getSimilarTracks(firstArtist(s.artist), s.title, 30)))
  lists.forEach((r) => r.status === 'fulfilled' && r.value.forEach((c) => add(c, c.match)))

  if (candidates.size < 15) {
    const artists = [...new Set(seeds.map((s) => firstArtist(s.artist)))].slice(0, 3)
    const similar = await Promise.allSettled(artists.map((a) => getSimilarArtists(a, 3)))
    const related = similar.flatMap((r) => (r.status === 'fulfilled' ? r.value : [])).slice(0, 6)
    const tops = await Promise.allSettled(related.map((a) => getArtistTopTracks(a.name, 3)))
    tops.forEach((r, i) => r.status === 'fulfilled' && r.value.forEach((t) => add(t, related[i].match * 0.5)))
  }

  return [...candidates.values()].sort((a, b) => b.score - a.score)
}

async function resolveOnSpotify(candidates, knownIds, exclude) {
  const results = await Promise.allSettled(candidates.map((c) => searchTrack(c.title, c.artist)))
  const seen = new Set()
  return results
    .map((r, i) => (r.status === 'fulfilled' && r.value ? { song: r.value, score: candidates[i].score } : null))
    .filter((x) => {
      if (!x || knownIds.has(x.song.id) || exclude.includes(x.song.id) || seen.has(x.song.id)) return false
      seen.add(x.song.id)
      return true
    })
}

async function byMood(found, target) {
  try {
    const features = await getAudioFeatures(found.map((x) => x.song.id))
    const scored = found.map((x) => ({ ...x, mood: distance(features[x.song.id], target) }))
    const strict = scored.filter((x) => x.mood <= FILTERS.maxMoodDistance)
    const relaxed = scored.filter((x) => x.mood <= FILTERS.maxMoodDistance + FILTERS.relaxBy)
    const fits = strict.length >= 2 ? strict : relaxed.length ? relaxed : scored
    return fits.sort((a, b) => a.mood - b.mood)
  } catch {
    return found
  }
}

export async function getPicks({ top, library, pool, mood, mode, exclude = [] }) {
  const lifting = mode === 'Lift my mood' && Boolean(mood)
  const target = targetsFor(mood, lifting)
  const hasMood = Object.keys(target).length > 0
  const topSongs = top.slice(0, 40)
  const likedSongs = library.slice(0, 40)
  const everything = [...pool, ...library]
  const knownKeys = new Set(everything.map((s) => songKey(s.artist, s.title)))
  const knownIds = new Set(everything.map((s) => s.id))
  const profile = libraryProfile(everything)

  if (!topSongs.length && !likedSongs.length) {
    const familiar = pickSongs(pool, mood, mode, exclude)
    return { ...familiar, reason: `${familiar.reason} New finds need top tracks or liked songs.` }
  }

  let features = {}
  try {
    features = await getAudioFeatures([...topSongs, ...likedSongs].map((s) => s.id))
  } catch {
    features = {}
  }
  const useFeatures = hasMood && Object.values(features).some(Boolean)

  const seedTop = useFeatures ? closest(topSongs, features, target, 3) : shuffle(topSongs.slice(0, 15)).slice(0, 3)
  const seedLiked = useFeatures ? closest(likedSongs, features, target, 3) : shuffle(likedSongs.slice(0, 20)).slice(0, 3)
  const seeds = [...new Map([...seedTop, ...seedLiked].map((s) => [s.id, s])).values()]
  const seedIds = seeds.map((s) => s.id)

  const familiarPool = [...topSongs, ...likedSongs].filter((s) => !exclude.includes(s.id) && !seedIds.includes(s.id))
  const familiarOptions = useFeatures ? closest(familiarPool, features, target, 5) : familiarPool.slice(0, 20)
  const familiar = shuffle(familiarOptions)[0]
  const familiarOnly = (reason) => ({
    songs: (familiar ? [familiar, ...familiarOptions.filter((s) => s.id !== familiar.id)] : pickSongs(pool, mood, mode, exclude).songs).slice(0, 3),
    reason,
  })

  if (!isLastfmConfigured()) {
    return familiarOnly('Add your Last.fm API key to .env to get new finds. These are from your top tracks and liked songs.')
  }

  try {
    const ranked = await findCandidates(seeds, knownKeys, profile)
    const toResolve = shuffle(ranked.slice(0, 16)).slice(0, 10)
    const found = await resolveOnSpotify(toResolve, knownIds, exclude)
    console.debug('[moodbot] Last.fm picks', { candidates: ranked.length, searched: toResolve.length, onSpotify: found.length })
    if (!found.length) throw new Error('No new songs found on Spotify.')

    const ordered = hasMood ? await byMood(found, target) : [...found].sort((a, b) => b.score - a.score)
    const newSongs = ordered.slice(0, 2).map((x) => ({ ...x.song, isNew: true }))

    const extraFamiliar = familiarOptions.filter((s) => s.id !== familiar?.id).slice(0, 2 - newSongs.length)
    const familiarSongs = familiar ? [familiar, ...extraFamiliar] : extraFamiliar
    const songs = [...newSongs, ...familiarSongs].slice(0, 3)
    const count = newSongs.length
    const knownCount = songs.length - count
    const how = hasMood ? (lifting ? ', picked to lift your mood' : `, tuned to feel ${feel[mood]}`) : ''
    const tail = knownCount ? `, plus ${knownCount} you already love.` : '.'

    return {
      songs,
      reason: `${count} new ${count === 1 ? 'find' : 'finds'} that fans of your top tracks and liked songs also play${how}${tail}`,
    }
  } catch {
    return familiarOnly('Couldn’t find new songs this time, so these are from your top tracks and liked songs.')
  }
}
