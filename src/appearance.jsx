import { createContext, useContext, useEffect, useState } from 'react'
import { cloudPush } from './lib/cloudSync'
import { APPEARANCE_KEY, loadAppearance } from './lib/appearanceData'
import { useAccount } from './account'

const AppearanceContext = createContext(null)

export function AppearanceProvider({ children }) {
  const { user } = useAccount()
  const [appearance, setAppearance] = useState(loadAppearance)
  const userId = user?.id ?? null
  const [syncedFor, setSyncedFor] = useState(userId)

  if (userId !== syncedFor) {
    setSyncedFor(userId)
    if (userId) setAppearance(loadAppearance())
  }

  useEffect(() => {
    const root = document.documentElement
    root.dataset.accent = appearance.accent
    root.dataset.stress = appearance.stress
    try {
      localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance))
    } catch {
      return
    }
    cloudPush('appearance', appearance)
  }, [appearance])

  const setAccent = (accent) => setAppearance((a) => ({ ...a, accent }))
  const setStress = (stress) => setAppearance((a) => ({ ...a, stress }))

  return <AppearanceContext.Provider value={{ ...appearance, setAccent, setStress }}>{children}</AppearanceContext.Provider>
}

export function useAppearance() {
  const value = useContext(AppearanceContext)
  if (!value) throw new Error('useAppearance must be used inside AppearanceProvider')
  return value
}
