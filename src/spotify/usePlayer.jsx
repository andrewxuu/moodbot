import { createContext, useCallback, useContext, useState } from 'react'

const PlayerContext = createContext(null)

export function PlayerProvider({ children }) {
  const [openKey, setOpenKey] = useState(null)
  const open = useCallback((key) => setOpenKey(key), [])
  const close = useCallback(() => setOpenKey(null), [])

  return <PlayerContext.Provider value={{ openKey, open, close }}>{children}</PlayerContext.Provider>
}

export function usePlayer() {
  const value = useContext(PlayerContext)
  if (!value) throw new Error('usePlayer must be used inside PlayerProvider')
  return value
}
