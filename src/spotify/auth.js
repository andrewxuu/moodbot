const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID
const REDIRECT_URI = `${window.location.origin}${import.meta.env.BASE_URL}callback`
const SCOPES = [
  'user-library-read',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-modify-private',
  'user-top-read',
  'user-read-recently-played',
].join(' ')

const TOKEN_KEY = 'moodbot:spotify-token'
const VERIFIER_KEY = 'moodbot:spotify-verifier'
const STATE_KEY = 'moodbot:spotify-state'

export class ReconnectError extends Error {
  constructor() {
    super('Your Spotify login expired. Reconnect to keep syncing.')
    this.name = 'ReconnectError'
  }
}

const readToken = () => {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY))
  } catch {
    return null
  }
}

function randomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const values = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(values, (v) => chars[v % chars.length]).join('')
}

async function sha256Base64Url(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function saveToken(data, previous) {
  const token = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? previous?.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token))
  return token
}

async function requestToken(body) {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, ...body }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const error = new Error(data.error_description || 'Spotify login failed. Try again.')
    error.code = data.error
    throw error
  }
  return data
}

export const isConfigured = () => Boolean(CLIENT_ID) && CLIENT_ID !== 'your-client-id-here'
export const hasToken = () => Boolean(readToken())
export const logout = () => localStorage.removeItem(TOKEN_KEY)

export async function login() {
  if (!isConfigured()) {
    throw new Error('Add your Spotify Client ID to .env, then restart npm run dev.')
  }
  const verifier = randomString(64)
  const state = randomString(16)
  localStorage.setItem(VERIFIER_KEY, verifier)
  localStorage.setItem(STATE_KEY, state)

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state,
    code_challenge_method: 'S256',
    code_challenge: await sha256Base64Url(verifier),
  })
  window.location.assign(`https://accounts.spotify.com/authorize?${params}`)
}

let callbackPromise = null

export function handleCallback() {
  callbackPromise ??= (async () => {
    const params = new URLSearchParams(window.location.search)
    const error = params.get('error')
    if (error) {
      throw new Error(error === 'access_denied' ? 'Spotify access wasn’t allowed.' : `Spotify login failed: ${error}`)
    }
    if (params.get('state') !== localStorage.getItem(STATE_KEY)) {
      throw new Error('Spotify login couldn’t be verified. Try connecting again.')
    }
    const data = await requestToken({
      grant_type: 'authorization_code',
      code: params.get('code'),
      redirect_uri: REDIRECT_URI,
      code_verifier: localStorage.getItem(VERIFIER_KEY),
    })
    localStorage.removeItem(VERIFIER_KEY)
    localStorage.removeItem(STATE_KEY)
    saveToken(data)
  })()
  return callbackPromise
}

let refreshPromise = null

export async function getAccessToken() {
  const token = readToken()
  if (!token) return null
  if (token.expiresAt - 60_000 > Date.now()) return token.accessToken

  if (!token.refreshToken) {
    logout()
    throw new ReconnectError()
  }

  refreshPromise ??= requestToken({ grant_type: 'refresh_token', refresh_token: token.refreshToken })
    .then((data) => saveToken(data, token).accessToken)
    .catch((err) => {
      if (err.code === 'invalid_grant') {
        logout()
        throw new ReconnectError()
      }
      throw err
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}
