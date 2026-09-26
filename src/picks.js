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
