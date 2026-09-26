import { useEffect, useState } from 'react'
import { handleCallback } from '../spotify/auth'

const goHome = (onDone) => {
  window.history.replaceState(null, '', '/')
  onDone()
}

export default function CallbackPage({ onDone }) {
  const [error, setError] = useState(null)

  useEffect(() => {
    handleCallback()
      .then(() => goHome(onDone))
      .catch((err) => setError(err.message))
  }, [onDone])

  return (
    <div className="flex h-screen items-center justify-center bg-cream px-6 text-center">
      {error ? (
        <div>
          <p className="text-[15px]">{error}</p>
          <button
            type="button"
            onClick={() => goHome(onDone)}
            className="mt-4 h-11 rounded-full bg-teal px-5 text-[15px] text-white"
          >
            Back to Moodbot
          </button>
        </div>
      ) : (
        <p role="status" className="text-[15px] text-muted">Connecting to Spotify…</p>
      )}
    </div>
  )
}
