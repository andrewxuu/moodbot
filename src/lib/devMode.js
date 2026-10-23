import { useSyncExternalStore } from 'react'

const KEY = 'moodbot:dev-mode'
const listeners = new Set()

const read = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY))
    return { on: Boolean(saved?.on), sample: saved?.sample !== false }
  } catch {
    return { on: false, sample: true }
  }
}

let state = read()

const write = (next) => {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // storage unavailable
  }
  listeners.forEach((fn) => fn())
}

const subscribe = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export const sampleDataOn = () => state.on && state.sample
export const setDevMode = (on) => write({ ...state, on })
export const setSampleData = (sample) => write({ ...state, sample })
export const useDevMode = () => useSyncExternalStore(subscribe, () => state)
