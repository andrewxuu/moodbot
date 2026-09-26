/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#f4f1ea',
        line: '#d9d4c7',
        track: '#eae5d8',
        ink: '#1e1d1a',
        muted: '#5b5850',
        hint: '#8a8a8a',
        art: '#d6dee8',
        teal: { DEFAULT: '#2f6f6a', soft: '#e6efec' },
        mood: {
          great: '#c8642a',
          good: '#e0a45e',
          okay: '#a8a69c',
          low: '#5f7fa8',
          awful: '#3b4a6b',
        },
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
