// @ts-nocheck
import { SYSTEM_PROMPT } from './personality.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const fallback = { reply: 'Sorry, I lost my train of thought. Try that again?', mood: '', song_queries: [] }

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const { messages } = await req.json()
  if (!Array.isArray(messages) || !messages.length) return json({ error: 'No messages' }, 400)

  const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.6-flash'

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
