import { stressNames } from '../../lib/moodMonth'

const BLOB = 'M0 -40C22 -44 42 -24 40 0C38 26 18 42 -6 40C-30 38 -42 16 -40 -8C-38 -28 -20 -38 0 -40Z'

const tone = {
  great: 'text-mood-great',
  good: 'text-mood-good',
  okay: 'text-mood-okay',
  low: 'text-mood-low',
  awful: 'text-mood-awful',
}

function Features({ mood }) {
  const line = { stroke: '#fff', strokeWidth: 3.5, fill: 'none', strokeLinecap: 'round' }
  const eyes = (y) => (
    <>
      <circle cx="-11" cy={y} r="4.5" fill="#fff" />
      <circle cx="11" cy={y} r="4.5" fill="#fff" />
    </>
  )
  if (mood === 'great') {
    return (
      <>
        <path d="M-17 -3Q-11 -9 -5 -3M5 -3Q11 -9 17 -3" {...line} />
        <path d="M-11 11Q0 22 11 11" {...line} />
      </>
    )
  }
  if (mood === 'good') {
    return (
      <>
        {eyes(-4)}
        <path d="M-8 10Q0 17 8 10" {...line} />
      </>
    )
  }
  if (mood === 'okay') {
    return (
      <>
        {eyes(-4)}
        <path d="M-8 13H8" {...line} />
      </>
    )
  }
  if (mood === 'low') {
    return (
      <>
        {eyes(-4)}
        <path d="M-8 16Q0 9 8 16" {...line} />
      </>
    )
  }
  return (
    <>
      <path d="M-18 -14L-6 -9M18 -14L6 -9" {...line} />
      {eyes(-1)}
      <path d="M-11 19Q0 8 11 19" {...line} />
    </>
  )
}

export default function StressFace({ mood, size = 24, ring = false, dim = false, className = '' }) {
  const label = mood ? stressNames[mood] : 'No stress logged'
  return (
    <svg
      viewBox="-52 -52 104 104"
      width={size}
      height={size}
      role="img"
      aria-label={label}
      className={`shrink-0 ${mood ? tone[mood] : 'text-hint'} ${dim ? 'opacity-45' : ''} ${className}`}
    >
      <title>{label}</title>
      {ring && <path d={BLOB} transform="scale(1.2)" fill="none" stroke="currentColor" strokeWidth="3" />}
      {mood ? (
        <>
          <path d={BLOB} fill="currentColor" />
          <circle cx="18" cy="-20" r="8" fill="#fff" fillOpacity="0.4" />
          <Features mood={mood} />
        </>
      ) : (
        <path d={BLOB} fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="8 7" />
      )}
    </svg>
  )
}
