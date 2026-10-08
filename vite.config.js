import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/moodbot/' : '/',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/lastfm': {
        target: 'https://ws.audioscrobbler.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/lastfm/, ''),
      },
      '/reccobeats': {
        target: 'https://api.reccobeats.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/reccobeats/, ''),
      },
    },
  },
}))
