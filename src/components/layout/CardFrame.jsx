import Logo from '../ui/Logo'

export default function CardFrame({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream p-4">
      <div className="flex w-full max-w-[520px] flex-col items-center gap-5">
        <div className="flex items-center gap-2.5">
          <Logo size={36} className="shrink-0" />
          <p className="font-serif text-[22px] font-semibold">Muse</p>
        </div>
        <div className="flex w-full flex-col gap-5 rounded-[20px] border border-line bg-surface p-6 sm:p-9">{children}</div>
      </div>
    </div>
  )
}
