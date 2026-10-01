import { getAudioFeatures } from './services/reccobeats'
import { searchTrack } from './spotify/api'
import { FILTERS, firstArtist, libraryProfile, passesLanguage, songKey } from './lib/filters'
import { getArtistTopTracks, getSimilarArtists, getSimilarTracks, getTagTopTracks, isLastfmConfigured } from './services/lastfm'
import { discoveryTags, scoreSongs } from './lib/moodTags'
import { checkGenres, genreTag, matchGenre } from './lib/genreMatch'
import { loadGenrePrefs } from './lib/genrePrefs'

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

const notAvoided = (prefs) => (song) => !(song.genres?.length && matchGenre(song.genres, prefs.avoided))
const likedFirst = (list, isLiked) => [...list.filter(isLiked), ...list.filter((x) => !isLiked(x))]

export function pickSongs(pool, mood, mode, exclude = [], prefs = loadGenrePrefs()) {
  const lifting = mode === 'Lift my mood' && mood
  const target = lifting ? liftTo[mood] : mood
  const keywords = target ? moodGenres[target] : []
  const genreOf = (song) => song.genres?.find((g) => keywords.some((k) => g.includes(k)))

  const available = pool.filter((s) => !exclude.includes(s.id)).filter(notAvoided(prefs))
  const liked = (s) => Boolean(s.genres?.length && matchGenre(s.genres, prefs.liked))
  const matches = likedFirst(shuffle(available.filter(genreOf)), liked)
  const rest = likedFirst(shuffle(available.filter((s) => !genreOf(s))), liked)
  const songs = [...matches, ...rest].slice(0, 3)
  const genre = matches.length ? genreOf(matches[0]) : null

  let reason = 'Picked from your recent Spotify listening.'
  if (genre && lifting) reason = `Lifting your mood with ${genre}, which you play a lot.`
  else if (genre) reason = `You asked for ${target.toLowerCase()} music, and you play a lot of ${genre}.`

  return { songs, reason }
}

export const targets = {
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

export const DIMS = ['energy', 'valence', 'danceability', 'acousticness', 'instrumentalness']

export function distance(features, target) {
  const keys = Object.keys(target).filter((k) => DIMS.includes(k) && typeof features?.[k] === 'number')
  if (!keys.length) return Infinity
  return Math.sqrt(keys.reduce((sum, k) => sum + (features[k] - target[k]) ** 2, 0) / keys.length)
}

const closest = (songs, features, target, n) =>
  [...songs].sort((a, b) => distance(features[a.id], target) - distance(features[b.id], target)).slice(0, n)

const FEEDBACK = {
  likedSeeds: 2,
  likedWeight: 1.5,
  dislikedChecked: 4,
  dislikePenalty: 1.5,
  tasteBlend: 0.35,
}

const TAGS = {
  sampleSize: 6,
  discoveryTags: 2,
  discoveryPages: 3,
  searched: 4,
  maxPicks: 1,
  tasteWeight: 0.3,
}

async function rankByTags(list, mood, n) {
  const sample = shuffle(list.slice(0, 25)).slice(0, TAGS.sampleSize)
  const scores = await scoreSongs(sample, mood)
  return sample
    .map((song, i) => ({ song, score: scores[i].score }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.song)
}

async function tagCandidates(mood, knownKeys, profile, likedGenres = []) {
  const moodTags = shuffle(discoveryTags(mood))
  const tags = likedGenres.length
    ? [...moodTags.slice(0, TAGS.discoveryTags - 1), genreTag(shuffle(likedGenres)[0])]
    : moodTags.slice(0, TAGS.discoveryTags)
  const pageFor = () => String(1 + Math.floor(Math.random() * TAGS.discoveryPages))
  const lists = await Promise.allSettled(tags.map((tag) => getTagTopTracks(tag, 50, pageFor())))
  const out = new Map()
  lists.forEach((r, i) => {
    if (r.status !== 'fulfilled') return
    r.value.forEach((t) => {
      if (!t.title || !t.artist) return
      const key = songKey(t.artist, t.title)
      if (out.has(key) || knownKeys.has(key) || !passesLanguage(t, profile)) return
      out.set(key, { ...t, score: 0, fromTag: tags[i] })
    })
  })
  return shuffle([...out.values()])
}

async function byTags(found, mood) {
  const scores = await scoreSongs(found.map((x) => x.song), mood)
  const top = Math.max(...found.map((x) => x.score), 1)
  const fits = found
    .map((x, i) => ({ ...x, tagScore: scores[i].score, tags: scores[i].matched }))
    .filter((x) => x.tagScore > 0)
  if (fits.length < 2) return null
  const rank = (x) => x.tagScore + TAGS.tasteWeight * (x.score / top)
  return fits.sort((a, b) => rank(b) - rank(a))
}

function chooseNew(ordered, n) {
  const out = []
  let fromTags = 0
  for (const x of ordered) {
    if (out.length === n) break
    if (x.fromTag && fromTags >= TAGS.maxPicks) continue
    if (x.fromTag) fromTags++
    out.push(x)
  }
  return out
}

function joinWords(words) {
  if (words.length < 2) return words[0] ?? ''
  return `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`
}

async function dislikePenalties(disliked) {
  const penalties = new Map()
  const lists = await Promise.allSettled(
    disliked.slice(0, FEEDBACK.dislikedChecked).map((s) => getSimilarTracks(firstArtist(s.artist), s.title, 30))
  )
  lists.forEach(
    (r) =>
      r.status === 'fulfilled' &&
      r.value.forEach((c) => {
        const key = songKey(c.artist, c.title)
        penalties.set(key, (penalties.get(key) ?? 0) + c.match * FEEDBACK.dislikePenalty)
      })
  )
  return penalties
}

async function findCandidates(seeds, knownKeys, profile, { boosted = new Set(), penalties = new Map() } = {}) {
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
  lists.forEach((r, i) => {
    const weight = boosted.has(seeds[i].id) ? FEEDBACK.likedWeight : 1
    if (r.status === 'fulfilled') r.value.forEach((c) => add(c, c.match * weight))
  })

  if (candidates.size < 15) {
    const artists = [...new Set(seeds.map((s) => firstArtist(s.artist)))].slice(0, 3)
    const similar = await Promise.allSettled(artists.map((a) => getSimilarArtists(a, 3)))
    const related = similar.flatMap((r) => (r.status === 'fulfilled' ? r.value : [])).slice(0, 6)
    const tops = await Promise.allSettled(related.map((a) => getArtistTopTracks(a.name, 3)))
    tops.forEach((r, i) => r.status === 'fulfilled' && r.value.forEach((t) => add(t, related[i].match * 0.5)))
  }

  return [...candidates.values()]
    .map((c) => ({ ...c, score: c.score - (penalties.get(songKey(c.artist, c.title)) ?? 0) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
}

async function resolveOnSpotify(candidates, knownIds, exclude) {
  const results = await Promise.allSettled(candidates.map((c) => searchTrack(c.title, c.artist)))
  const seen = new Set()
  return results
    .map((r, i) =>
      r.status === 'fulfilled' && r.value ? { song: r.value, score: candidates[i].score, fromTag: candidates[i].fromTag } : null
    )
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
    const top = Math.max(...fits.map((x) => x.score), 1)
    const rank = (x) => (Number.isFinite(x.mood) ? x.mood : 1) - 0.1 * (x.score / top)
    return fits.sort((a, b) => rank(a) - rank(b))
  } catch {
    return found
  }
}

function blend(target, taste, amount) {
  const out = { ...target }
  Object.keys(target).forEach((k) => {
    if (typeof taste[k] === 'number') out[k] = target[k] * (1 - amount) + taste[k] * amount
  })
  return out
}

export function averageOf(list) {
  const out = {}
  DIMS.forEach((k) => {
    const values = list.map((f) => f?.[k]).filter((v) => typeof v === 'number')
    if (values.length) out[k] = values.reduce((a, b) => a + b, 0) / values.length
  })
  return out
}

export async function getPicks({ top, library, pool, mood, mode, exclude = [], alreadyShown = [], feedback = { liked: [], disliked: [] } }) {
  const prefs = loadGenrePrefs()
  const allowed = notAvoided(prefs)
  top = top.filter(allowed)
  library = library.filter(allowed)
  pool = pool.filter(allowed)
  const likedHits = new Map()
  const withGenres = async (list, n) => {
    const checks = await checkGenres(list, prefs)
    const kept = list.filter((_, i) => !checks[i].avoided)
    list.forEach((s, i) => checks[i].liked && likedHits.set(s.id, checks[i].liked))
    return likedFirst(kept, (s) => likedHits.has(s.id)).slice(0, n)
  }
  const genreNote = (songs) => {
    const hits = [...new Set(songs.map((s) => likedHits.get(s.id)).filter(Boolean))]
    return hits.length ? ` Leaning toward ${joinWords(hits.map((g) => g.toLowerCase()))}, which you like.` : ''
  }

  const lifting = mode === 'Lift my mood' && Boolean(mood)
  const baseTarget = targetsFor(mood, lifting)
  const hasMood = Object.keys(baseTarget).length > 0
  const tagMood = mood ? (lifting ? liftTo[mood] : mood) : null
  const useTags = Boolean(tagMood) && isLastfmConfigured()
  const dislikedIds = new Set(feedback.disliked.map((s) => s.id))
  exclude = [...exclude, ...dislikedIds]
  const topSongs = top.slice(0, 40)
  const likedSongs = library.slice(0, 40)
  const everything = [...pool, ...library]
  const rated = [...feedback.liked, ...feedback.disliked, ...alreadyShown]
  const knownKeys = new Set([...everything, ...rated].map((s) => songKey(s.artist, s.title)))
  const knownIds = new Set([...everything, ...rated].map((s) => s.id))
  const profile = libraryProfile(everything)

  if (!topSongs.length && !likedSongs.length) {
    const familiar = pickSongs(pool, mood, mode, exclude, prefs)
    return { ...familiar, reason: `${familiar.reason} New finds need top tracks or liked songs.` }
  }

  const upvoted = feedback.liked.filter((s) => !dislikedIds.has(s.id))
  const shownKeys = new Set(alreadyShown.map((s) => songKey(s.artist, s.title)))
  const notShown = (s) => !shownKeys.has(songKey(s.artist, s.title))
  const fromFeedback = [...shuffle(upvoted.slice(0, 3)), ...shuffle(upvoted.slice(3, 12))].slice(0, FEEDBACK.likedSeeds)

  let features = {}
  try {
    features = await getAudioFeatures([...topSongs, ...likedSongs, ...upvoted.slice(0, 12)].map((s) => s.id))
  } catch {
    features = {}
  }
  const taste = averageOf(upvoted.slice(0, 12).map((s) => features[s.id]))
  const target = hasMood && Object.keys(taste).length ? blend(baseTarget, taste, FEEDBACK.tasteBlend) : baseTarget
  const useFeatures = hasMood && Object.values(features).some(Boolean)

  const pickForMood = async (list, n) => {
    const tagged = useTags ? await rankByTags(list, tagMood, n) : []
    const backup = useFeatures ? closest(list, features, target, n + tagged.length) : shuffle(list.slice(0, 20))
    return [...new Map([...tagged, ...backup].map((s) => [s.id, s])).values()].slice(0, n)
  }

  const perGroup = fromFeedback.length ? 2 : 3
  const usable = (list) => list.filter((s) => !dislikedIds.has(s.id))
  const [seedTop, seedLiked] = await Promise.all([pickForMood(usable(topSongs), perGroup), pickForMood(usable(likedSongs), perGroup)])
  const seeds = [...new Map([...fromFeedback, ...seedTop, ...seedLiked].map((s) => [s.id, s])).values()]
  const seedIds = seeds.map((s) => s.id)

  const familiarPool = [...new Map([...topSongs, ...likedSongs, ...upvoted].map((s) => [s.id, s])).values()].filter(
    (s) => !exclude.includes(s.id) && !seedIds.includes(s.id) && notShown(s)
  )
  const familiarOptions = await withGenres(await pickForMood(familiarPool, 8), 5)
  const familiar = shuffle(familiarOptions)[0]
  const familiarOnly = (reason) => {
    const songs = (
      familiar ? [familiar, ...familiarOptions.filter((s) => s.id !== familiar.id)] : pickSongs(pool, mood, mode, exclude, prefs).songs.filter(notShown)
    ).slice(0, 3)
    return { songs, reason: `${reason}${genreNote(songs)}` }
  }

  if (!isLastfmConfigured()) {
    return familiarOnly('Add your Last.fm API key to .env to get new finds. These are from your top tracks and liked songs.')
  }

  try {
    const penalties = feedback.disliked.length ? await dislikePenalties(feedback.disliked) : new Map()
    const [ranked, tagged] = await Promise.all([
      findCandidates(seeds, knownKeys, profile, { boosted: new Set(fromFeedback.map((s) => s.id)), penalties }),
      useTags ? tagCandidates(tagMood, knownKeys, profile, prefs.liked) : [],
    ])
    const similar = shuffle(ranked.slice(0, 16)).slice(0, tagged.length ? 10 - TAGS.searched : 10)
    const similarKeys = new Set(similar.map((c) => songKey(c.artist, c.title)))
    const fromTags = tagged.filter((c) => !similarKeys.has(songKey(c.artist, c.title))).slice(0, TAGS.searched)
    const toResolve = [...similar, ...fromTags]
    const resolved = await resolveOnSpotify(toResolve, knownIds, exclude)
    const checks = await checkGenres(resolved.map((x) => x.song), prefs)
    const found = resolved.filter((_, i) => !checks[i].avoided)
    resolved.forEach((x, i) => checks[i].liked && likedHits.set(x.song.id, checks[i].liked))
    console.debug('[moodbot] Last.fm picks', {
      candidates: ranked.length,
      fromTags: fromTags.length,
      searched: toResolve.length,
      onSpotify: resolved.length,
      afterGenres: found.length,
      feedbackSeeds: fromFeedback.length,
      penalized: penalties.size,
    })
    if (!found.length) throw new Error('No new songs found on Spotify.')

    let ordered = useTags ? await byTags(found, tagMood).catch(() => null) : null
    if (!ordered) ordered = hasMood ? await byMood(found, target) : [...found].sort((a, b) => b.score - a.score)
    ordered = likedFirst(ordered, (x) => likedHits.has(x.song.id))
    const chosen = chooseNew(ordered, 2)
    const newSongs = chosen.map((x) => ({ ...x.song, isNew: true }))

    const extraFamiliar = familiarOptions.filter((s) => s.id !== familiar?.id).slice(0, 2 - newSongs.length)
    const familiarSongs = familiar ? [familiar, ...extraFamiliar] : extraFamiliar
    const songs = [...newSongs, ...familiarSongs].slice(0, 3)
    const count = newSongs.length
    const knownCount = songs.length - count
    const how = hasMood ? (lifting ? ', picked to lift your mood' : `, tuned to feel ${feel[mood]}`) : ''
    const tagSource = chosen.find((x) => x.fromTag)?.fromTag
    const allFromTags = chosen.every((x) => x.fromTag)
    const source = !tagSource
      ? 'that fans of your top tracks and liked songs also play'
      : allFromTags
        ? `from Last.fm's top "${tagSource}" tracks`
        : `from fans of your top tracks and Last.fm's top "${tagSource}" tracks`
    const tagWords = [...new Set(chosen.flatMap((x) => (x.tags?.length ? x.tags : x.fromTag ? [x.fromTag] : [])))].slice(0, 3)
    const tagLine = tagWords.length ? ` Listeners tag ${count === 1 ? 'it' : 'them'} ${joinWords(tagWords)}.` : ''
    const knownLine = knownCount ? ` Plus ${knownCount} you already love.` : ''

    const shaped = feedback.liked.length || feedback.disliked.length
    const moodName = mood ? mood.toLowerCase() : 'no-mood'
    const note = shaped ? ` Shaped by your ratings on past ${moodName} picks.` : ''

    return {
      songs,
      reason: `${count} new ${count === 1 ? 'find' : 'finds'} ${source}${how}.${tagLine}${knownLine}${genreNote(songs)}${note}`,
    }
  } catch {
    return familiarOnly('Couldn’t find new songs this time, so these are from your top tracks and liked songs.')
  }
}