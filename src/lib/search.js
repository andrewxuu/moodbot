const clean = (text = '') =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

export function matchesSearch(query, ...fields) {
  const words = clean(query).split(' ').filter(Boolean)
  if (!words.length) return true
  const haystack = clean(fields.filter(Boolean).join(' '))
  return words.every((w) => haystack.includes(w))
}
