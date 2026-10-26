export const accents = [
  { id: 'ocean', label: 'Ocean', swatch: '#187482', logo: { tile: '#DDF1F4', blob: '#1D8A9B', face: '#FFFFFF' } },
  { id: 'sunset', label: 'Sunset', swatch: '#C94E3E', logo: { tile: '#FFE8D6', blob: '#FF6B5A', face: '#2B2D42' } },
  { id: 'lilac', label: 'Lilac', swatch: '#6D4EE0', logo: { tile: '#EAE4FF', blob: '#7B61FF', face: '#FFFFFF' } },
  { id: 'forest', label: 'Forest', swatch: '#2E7D52', logo: { tile: '#E0F1E6', blob: '#3E9B68', face: '#FFFFFF' } },
  { id: 'rose', label: 'Rose', swatch: '#BE3670', logo: { tile: '#FCE4EE', blob: '#E86AA6', face: '#FFFFFF' } },
  { id: 'night', label: 'Night', swatch: '#373E78', logo: { tile: '#E4E6F5', blob: '#373E78', face: '#FFFFFF' } },
]

export const stressPalettes = [
  { id: 'default', label: 'Default', colors: ['#1C4A86', '#4A8AE0', '#84817A', '#D97A22', '#B3322A'] },
  { id: 'traffic', label: 'Traffic light', colors: ['#2E8C5A', '#709C28', '#B0800A', '#D2641E', '#C43830'] },
  { id: 'dusk', label: 'Dusk', colors: ['#2478A8', '#4662C8', '#7050D2', '#963CAA', '#602482'] },
  { id: 'warm', label: 'Warm', colors: ['#B4780A', '#C8641E', '#D25032', '#BE3232', '#8C1E28'] },
  { id: 'mono', label: 'Mono', colors: ['#6A7885', '#586673', '#465360', '#34404C', '#1F2A33'] },
]

export const DEFAULT_APPEARANCE = { accent: 'ocean', stress: 'default' }
export const APPEARANCE_KEY = 'moodbot:appearance'

export function loadAppearance() {
  try {
    const saved = JSON.parse(localStorage.getItem(APPEARANCE_KEY))
    return {
      accent: accents.some((a) => a.id === saved?.accent) ? saved.accent : DEFAULT_APPEARANCE.accent,
      stress: stressPalettes.some((p) => p.id === saved?.stress) ? saved.stress : DEFAULT_APPEARANCE.stress,
    }
  } catch {
    return DEFAULT_APPEARANCE
  }
}
