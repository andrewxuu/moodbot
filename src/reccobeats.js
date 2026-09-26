const BASE = import.meta.env.DEV ? '/reccobeats/v1' : 'https://api.reccobeats.com/v1'

const spotifyIdFrom = (href) => href?.match(/open\.spotify\.com\/track\/([A-Za-z0-9]+)/)?.[1] ?? null

const featureCache = new Map()

export async function getAudioFeatures(ids) {
  const unique = [...new Set(ids)]
  const missing = unique.filter((id) => !featureCache.has(id))

  for (let i = 0; i < missing.length; i += 40) {
    const batch = missing.slice(i, i + 40)
    const res = await fetch(`${BASE}/audio-features?ids=${batch.join(',')}`)
    if (!res.ok) throw new Error(`ReccoBeats audio features failed (${res.status}).`)
    const data = await res.json()
    ;(data.content ?? []).forEach((f, index) => {
      featureCache.set(spotifyIdFrom(f.href) ?? batch[index], f)
    })
    batch.forEach((id) => !featureCache.has(id) && featureCache.set(id, null))
  }

  return Object.fromEntries(unique.map((id) => [id, featureCache.get(id)]))
}
