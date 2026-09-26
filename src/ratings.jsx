import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'moodbot:ratings'
const RatingsContext = createContext(null)

export const ratingMood = (rating) => ['awful', 'low', 'okay', 'good', 'great'][Math.min(4, Math.floor((rating - 1) / 2))]
export const stressLabel = (rating) =>
  ['Very stressed', 'Stressed', 'Some stress', 'Relaxed', 'Calm'][Math.min(4, Math.floor((rating - 1) / 2))]

const load = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []
  } catch {
    return []
  }
}

export function RatingsProvider({ children }) {
  const [ratings, setRatings] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ratings))
    } catch {
      return
    }
  }, [ratings])

  const addRating = useCallback((rating) => {
    const entry = { id: crypto.randomUUID(), rating, note: '', at: new Date().toISOString() }
    setRatings((prev) => [entry, ...prev])
    return entry.id
  }, [])

  const updateRating = useCallback((id, changes) => {
    setRatings((prev) => prev.map((r) => (r.id === id ? { ...r, ...changes } : r)))
  }, [])

  return <RatingsContext.Provider value={{ ratings, addRating, updateRating }}>{children}</RatingsContext.Provider>
}

export function useRatings() {
  const value = useContext(RatingsContext)
  if (!value) throw new Error('useRatings must be used inside RatingsProvider')
  return value
}
