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
          great: '#1c4a86',
          good: '#4a8ae0',
          okay: '#84817a',
          low: '#d97a22',
          awful: '#b3322a',
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