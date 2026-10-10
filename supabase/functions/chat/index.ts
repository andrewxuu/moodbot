// @ts-nocheck
import { SYSTEM_PROMPT } from './personality.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const fallback = { reply: 'Sorry, I lost my train of thought. Try that again?', mood: '', song_queries: [] }

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

async function songs({ mood, count, avoid }: { mood: string; count: number; avoid: { title: string; artist: string }[] }, model: string) {
  const n = Math.min(Math.max(Number(count) || 15, 1), 30)
  const skip = (Array.isArray(avoid) ? avoid : []).map((s) => `${s.title} by ${s.artist}`).join('; ')
  const prompt = `List ${n} real, popular songs that fit a ${String(mood).slice(0, 20)} mood. Mix artists and eras. Do not repeat these: ${skip || 'none'}. Reply with only JSON: {"songs":[{"title":"","artist":""}]}`

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': Deno.env.get('GEMINI_API_KEY')!, 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 2048, responseMimeType: 'application/json' },
    }),
  })
  if (!res.ok) return json({ songs: [] })

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  try {
    const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
    const list = (Array.isArray(parsed.songs) ? parsed.songs : []).filter((s: { title?: string; artist?: string }) => s?.title && s?.artist)
    return json({ songs: list.map((s: { title: string; artist: string }) => ({ title: String(s.title), artist: String(s.artist) })) })
  } catch {
    return json({ songs: [] })
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const body = await req.json()
  const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.6-flash'

  if (body.mode === 'songs') return songs(body, model)

  const { messages } = body
  if (!Array.isArray(messages) || !messages.length) return json({ error: 'No messages' }, 400)

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': Deno.env.get('GEMINI_API_KEY')!,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: messages.map((m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      generationConfig: { maxOutputTokens: 2048, responseMimeType: 'application/json' },
    }),
  })

  if (!res.ok) return json(fallback)

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  try {
    const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
    return json({
      reply: String(parsed.reply ?? fallback.reply),
      mood: String(parsed.mood ?? ''),
      song_queries: Array.isArray(parsed.song_queries) ? parsed.song_queries : [],
    })
  } catch {
    const partial = text.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)/)
    return json({ ...fallback, reply: partial ? partial[1].replace(/\\n/g, ' ').replace(/\\"/g, '"') : fallback.reply })
  }
})
