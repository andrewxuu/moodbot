/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: v('cream'),
        surface: v('surface'),
        line: v('line'),
        track: v('track'),
        ink: v('ink'),
        muted: v('muted'),
        hint: v('hint'),
        art: v('art'),
        teal: { DEFAULT: v('teal'), soft: v('teal-soft') },
        mood: {
          great: v('mood-great'),
          good: v('mood-good'),
          okay: v('mood-okay'),
          low: v('mood-low'),
          awful: v('mood-awful'),
        },
      },
      keyframes: {
        'sheet-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'sheet-in': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
      },
      animation: {
        'sheet-up': 'sheet-up 0.25s ease-out',
        'sheet-in': 'sheet-in 0.25s ease-out',
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
