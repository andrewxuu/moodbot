export const GUEST_KEY = 'moodbot:guest'
export const DONE_KEY = 'moodbot:onboarded'
export const STEP_KEY = 'moodbot:onboarding-step'
export const SYNCED_KEYS = ['moodbot:genres', 'moodbot:saved-songs']

export const readKey = (key) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export const writeKey = (key, value) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    return
  }
}

export const removeKey = (key) => {
  try {
    localStorage.removeItem(key)
  } catch {
    return
  }
}
