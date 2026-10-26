import { useAppearance } from '../../appearance'
import { accents } from '../../lib/appearanceData'

export default function Logo({ size = 36, className = '' }) {
  const { accent } = useAppearance()
  const { blob, face } = (accents.find((a) => a.id === accent) ?? accents[0]).logo

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="110 108 292 294"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Muse"
    >
      <g transform="translate(256 256) scale(3.2)">
        <path d="M0 -40C22 -44 42 -24 40 0C38 26 18 42 -6 40C-30 38 -42 16 -40 -8C-38 -28 -20 -38 0 -40Z" fill={blob} />
        <circle cx="18" cy="-20" r="8" fill="#FFFFFF" fillOpacity="0.4" />
        <circle cx="-11" cy="-4" r="4.5" fill={face} />
        <circle cx="11" cy="-4" r="4.5" fill={face} />
        <path d="M-8 10Q0 17 8 10" stroke={face} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  )
}
