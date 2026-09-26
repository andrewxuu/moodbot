import { useEffect, useState } from 'react'

const STORAGE_KEY = 'moodbot:genres'

export const genres = [
  'Pop', 'Hip hop', 'R&B', 'Rock', 'Indie', 'Alternative', 'Electronic', 'EDM', 'Lo-fi',
  'Jazz', 'Classical', 'Folk', 'Country', 'Metal', 'K-pop', 'Latin', 'Soul', 'Ambient',
]

export function loadGenrePrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return { liked: saved?.liked ?? [], avoided: saved?.avoided ?? [] }
  } catch {
    return { liked: [], avoided: [] }
  }
}

export function useGenrePrefs() {
  const [prefs, setPrefs] = useState(loadGenrePrefs)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    } catch {
      return
    }
  }, [prefs])

  const toggle = (list, genre) =>
    setPrefs((p) => {
      const other = list === 'liked' ? 'avoided' : 'liked'
      const on = p[list].includes(genre)
      return {
        [list]: on ? p[list].filter((g) => g !== genre) : [...p[list], genre],
        [other]: p[other].filter((g) => g !== genre),
      }
    })

  return { ...prefs, toggle }
}
