export default function ChatMessage({ from = 'bot', width = 480, fill, children }) {
  const isUser = from === 'user'

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : ''}`}>
      <div
        style={{ width: fill ? width : undefined, maxWidth: width }}
        className={`flex flex-col gap-1.5 px-4 py-3.5 text-base ${
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
