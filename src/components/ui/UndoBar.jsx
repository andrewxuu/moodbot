import { useEffect } from 'react'

export default function UndoBar({ message, onUndo, onDismiss, seconds = 8 }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, seconds * 1000)
    return () => clearTimeout(timer)
  }, [message, onDismiss, seconds])

  return (
    <div
      role="status"
      className="fixed bottom-20 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-[420px] -translate-x-1/2 items-center gap-4 rounded-[12px] bg-ink px-4 py-3 text-surface shadow-lg md:bottom-6"
    >
      <p className="flex-1 text-sm">{message}</p>
      <button type="button" onClick={onUndo} className="text-sm font-semibold underline">
        Undo
      </button>
    </div>
  )
}
