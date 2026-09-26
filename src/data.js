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

export const week = [
  { day: 'Thu', mood: 'okay' },
  { day: 'Fri', mood: 'good' },
  { day: 'Sat', mood: 'great' },
  { day: 'Sun', mood: 'good' },
  { day: 'Mon', mood: 'low' },
  { day: 'Tue', mood: 'okay' },
  { day: 'Wed', mood: 'low' },
]

export const checkIns = [
  { id: 1, mood: 'low', note: '[What you told Moodbot]', when: 'Today', count: '[#] songs' },
  { id: 2, mood: 'okay', note: '[What you told Moodbot]', when: 'Tue', count: '[#] songs' },
  { id: 3, mood: 'low', note: '[What you told Moodbot]', when: 'Mon', count: '[#] songs' },
  { id: 4, mood: 'good', note: '[What you told Moodbot]', when: 'Sun', count: '[#] songs' },
]
