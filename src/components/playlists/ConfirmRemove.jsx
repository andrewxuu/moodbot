import { useEffect, useRef, useState } from 'react'
import SpotifyError from './SpotifyError'

export default function ConfirmRemove({ song, playlistName, copies, onConfirm, onCancel }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const cancelRef = useRef(null)

  useEffect(() => {
    const opener = document.activeElement
    cancelRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && !busy && onCancel()
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      opener?.focus?.()
    }
  }, [onCancel, busy])

  const confirm = async () => {
    setBusy(true)
    setError(null)
    try {
      await onConfirm()
    } catch (err) {
      setError(err)
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-title"
        className="flex w-full max-w-[400px] flex-col gap-4 rounded-[20px] bg-surface p-6"
      >
        <div className="flex flex-col gap-1.5">
          <h2 id="remove-title" className="font-serif text-[22px] font-semibold">
            Remove this song?
          </h2>
          <p className="text-[15px] text-muted">
            {song.title} will be removed from {playlistName} on Spotify.
            {copies > 1 && ` All ${copies} copies in this playlist will go.`}
          </p>
        </div>
        <SpotifyError error={error} />
        <div className="flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="h-10 rounded-full border border-line px-4 text-[15px] font-semibold hover:border-teal"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className="h-10 rounded-full bg-mood-awful px-4 text-[15px] font-semibold text-white disabled:opacity-60"
          >
            {busy ? 'Removing…' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  )
}
