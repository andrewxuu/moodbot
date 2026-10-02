import { Music } from 'lucide-react'

export default function CardFrame({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream p-4">
      <div className="flex w-full max-w-[520px] flex-col items-center gap-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-full bg-teal text-white">
            <Music size={18} />
          </div>
          <p className="font-serif text-[22px] font-semibold">Moodbot</p>
        </div>
        <div className="flex w-full flex-col gap-5 rounded-[20px] border border-line bg-surface p-6 sm:p-9">{children}</div>
      </div>
    </div>
  )
}
