export const FILTERS = {
  maxMoodDistance: 0.2,
  relaxBy: 0.08,
}

export const normalize = (text = '') =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s*[([].*?[)\]]/g, '')
    .replace(/\s+-\s+.*$/, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

export const firstArtist = (artist = '') => artist.split(', ')[0]
export const songKey = (artist, title) => `${normalize(firstArtist(artist))}|${normalize(title)}`

const scripts = {
  hangul: /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/,
  kana: /[\u3040-\u30FF]/,
  han: /[\u4E00-\u9FFF]/,
  cyrillic: /[\u0400-\u04FF]/,
  arabic: /[\u0600-\u06FF]/,
  hebrew: /[\u0590-\u05FF]/,
  thai: /[\u0E00-\u0E7F]/,
  devanagari: /[\u0900-\u097F]/,
  greek: /[\u0370-\u03FF]/,
}

const latinLanguages = {
  spanish: {
    chars: /[ñ¿¡áíóú]/,
    words: ['el', 'los', 'las', 'del', 'que', 'mi', 'quiero', 'contigo', 'sin', 'yo', 'eres', 'noche', 'vida', 'baila', 'mía', 'todo', 'corazón', 'amor', 'te', 'y', 'la', 'de'],
  },
  portuguese: {
    chars: /[ãõ]/,
    words: ['não', 'você', 'meu', 'minha', 'coração', 'saudade', 'pra', 'eu', 'com', 'amor', 'de'],
  },
  french: {
    chars: /[èêëîœ]/,
    words: ['le', 'les', 'je', 'moi', 'toi', 'pas', 'est', 'une', 'des', 'dans', 'avec', 'pour', 'amour', 'et', 'tu'],
  },
  german: {
    chars: /[ßäöü]/,
    words: ['ich', 'und', 'nicht', 'du', 'mein', 'liebe', 'der', 'die', 'das', 'ein', 'mit'],
  },
  italian: {
    chars: /[ìò]/,
    words: ['il', 'che', 'non', 'sei', 'mio', 'amore', 'cuore', 'della', 'per', 'ti', 'tu'],
  },
}

const englishWords = new Set(['the', 'you', 'me', 'my', 'i', 'love', 'your', 'and', 'in', 'of', 'to', 'it', 'on', 'we', 'is', 'be', 'all', 'for'])

export function scriptsIn(text) {
  return Object.keys(scripts).filter((name) => scripts[name].test(text))
}

export function latinLanguageOf(title) {
  const lower = title.toLowerCase()
  const words = [...new Set(lower.split(/[^\p{L}']+/u).filter(Boolean))]
  if (words.some((w) => englishWords.has(w))) return null

  let best = null
  let bestScore = 0
  for (const [name, { chars, words: markers }] of Object.entries(latinLanguages)) {
    const score = (chars.test(lower) ? 2 : 0) + words.filter((w) => markers.includes(w)).length
    if (score > bestScore) {
      best = name
      bestScore = score
    }
  }
  return bestScore >= 2 ? best : null
}

export function libraryProfile(songs) {
  const scriptCounts = {}
  const languageCounts = {}
  const artists = new Set()

  songs.forEach((s) => {
    scriptsIn(`${s.title} ${s.artist}`).forEach((sc) => (scriptCounts[sc] = (scriptCounts[sc] ?? 0) + 1))
    const lang = latinLanguageOf(s.title)
    if (lang) languageCounts[lang] = (languageCounts[lang] ?? 0) + 1
    s.artist.split(', ').forEach((a) => artists.add(a.toLowerCase()))
  })

  const min = Math.max(2, Math.round(songs.length * 0.02))
  return {
    scripts: new Set(Object.keys(scriptCounts).filter((k) => scriptCounts[k] >= min)),
    languages: new Set(Object.keys(languageCounts).filter((k) => languageCounts[k] >= min)),
    artists,
  }
}

export function passesLanguage(rec, profile) {
  if (scriptsIn(`${rec.title} ${rec.artist}`).some((sc) => !profile.scripts.has(sc))) return false
  const lang = latinLanguageOf(rec.title)
  return !lang || profile.languages.has(lang)
}
