import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import { pullCloud, pushAll, setSyncUser } from './lib/cloudSync'
import { DONE_KEY, GUEST_KEY, STEP_KEY, SYNCED_KEYS, readKey, removeKey, writeKey } from './lib/storageKeys'

const AccountContext = createContext(null)

export function AccountProvider({ children }) {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(!supabase)
  const [guest, setGuest] = useState(() => readKey(GUEST_KEY) === '1')
  const [onboarded, setOnboarded] = useState(() => readKey(DONE_KEY) === '1')
  const [replay, setReplay] = useState(false)

  useEffect(() => {
    if (!supabase) return
    let live = true

    const start = async () => {
      let current = null
      try {
        const { data } = await supabase.auth.getSession()
        current = data.session
        if (current) {
          await pullCloud(current.user.id).catch(() => {})
          setSyncUser(current.user.id)
        }
      } finally {
        if (live) {
          setSession(current)
          setReady(true)
        }
      }
    }
    start()

    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'SIGNED_OUT') setSession(null)
      if (event === 'TOKEN_REFRESHED') setSession(next)
    })
    return () => {
      live = false
      data.subscription.unsubscribe()
    }
  }, [])

  const signUp = useCallback(async ({ name, email, password }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: name.trim() },
        emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
      },
    })
    if (error) throw error
    if (!data.session) return { needsConfirm: true }
    setSyncUser(data.user.id)
    await pushAll(data.user.id).catch(() => {})
    removeKey(GUEST_KEY)
    setGuest(false)
    setSession(data.session)
    return { needsConfirm: false }
  }, [])

  const signIn = useCallback(async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    await pullCloud(data.user.id).catch(() => {})
    setSyncUser(data.user.id)
    writeKey(DONE_KEY, '1')
    removeKey(STEP_KEY)
    removeKey(GUEST_KEY)
    setOnboarded(true)
    setGuest(false)
    setSession(data.session)
  }, [])

  const signOut = useCallback(async () => {
    if (supabase && session) {
      await supabase.auth.signOut()
      SYNCED_KEYS.forEach(removeKey)
    }
    setSyncUser(null)
    removeKey(GUEST_KEY)
    window.location.assign(import.meta.env.BASE_URL)
  }, [session])

  const continueAsGuest = useCallback(() => {
    writeKey(GUEST_KEY, '1')
    setGuest(true)
  }, [])

  const finishOnboarding = useCallback(() => {
    writeKey(DONE_KEY, '1')
    removeKey(STEP_KEY)
    setOnboarded(true)
    setReplay(false)
  }, [])

  const startReplay = useCallback(() => {
    removeKey(STEP_KEY)
    setReplay(true)
  }, [])

  const user = session?.user ?? null
  const value = useMemo(
    () => ({
      ready,
      enabled: Boolean(supabase),
      user,
      name: user?.user_metadata?.name ?? null,
      guest,
      onboarded,
      replay,
      signUp,
      signIn,
      signOut,
      continueAsGuest,
      finishOnboarding,
      startReplay,
    }),
    [ready, user, guest, onboarded, replay, signUp, signIn, signOut, continueAsGuest, finishOnboarding, startReplay]
  )

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount() {
  return useContext(AccountContext)
}
