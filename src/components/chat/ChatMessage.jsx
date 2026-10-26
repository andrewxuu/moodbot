export default function ChatMessage({ from = 'bot', width = 480, fill, children }) {
  const isUser = from === 'user'

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : ''}`}>
      <div
        style={{ maxWidth: width }}
        className={`flex min-w-0 flex-col gap-1.5 px-4 py-3.5 text-base ${fill ? 'w-full' : ''} ${
          isUser
            ? 'rounded-[14px] rounded-br-[4px] bg-teal text-white'
            : 'rounded-[14px] rounded-bl-[4px] border border-line bg-surface'
        }`}
      >
        {children}
      </div>
    </div>
  )
}

export function TypingDots({ label = 'Muse is thinking' }) {
  return (
    <div role="status" className="flex h-6 items-center gap-1.5 text-teal">
      <span className="sr-only">{label}</span>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{ animationDelay: `${i * 0.15}s` }}
          className="typing-dot size-2 rounded-full bg-current"
        />
      ))}
    </div>
  )
}
