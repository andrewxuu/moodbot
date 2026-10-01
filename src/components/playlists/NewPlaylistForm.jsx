import { useState } from 'react'
import SpotifyError from './SpotifyError'

export default function NewPlaylistForm({ onCreate, onCancel, submitLabel = 'Create' }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || busy) return
    setBusy(true)
    setError(null)
    try {
      await onCreate(trimmed)
    } catch (err) {
      setError(err)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={100}
        placeholder="Playlist name"
        aria-label="Playlist name"
        className="h-11 rounded-[14px] border border-line bg-surface px-3.5 text-[15px] outline-none placeholder:text-hint focus:border-teal"
      />
      <SpotifyError error={error} />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="h-10 rounded-full px-4 text-[15px] text-muted hover:text-ink">
          Cancel
        </button>
        <button
          type="submit"
          disabled={!name.trim() || busy}
          className="h-10 rounded-full bg-teal px-5 text-[15px] text-white disabled:opacity-50"
        >
          {busy ? 'Creating…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
