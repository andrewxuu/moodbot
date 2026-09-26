export const songs = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  title: '[Song title]',
  artist: '[Artist]',
  source: i % 2 ? 'spotify' : 'chat',
}))

export const playlists = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  name: '[Playlist name]',
  count: '[# songs]',
}))

export const moodLevels = ['great', 'good', 'okay', 'low', 'awful']