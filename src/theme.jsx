import { createContext, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'moodbot:theme'
const ThemeContext = createContext(null)
const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

const loadTheme = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return ['light', 'dark', 'system'].includes(saved) ? saved : 'light'
  } catch {
    return 'light'
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(loadTheme)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      return
    }
  }, [theme])

  useEffect(() => {
    const media = darkQuery()
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches)
      document.documentElement.classList.toggle('dark', dark)
    }
    apply()
    if (theme !== 'system') return
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used inside ThemeProvider')
  return value
}
