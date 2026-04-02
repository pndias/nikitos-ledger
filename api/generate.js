export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.GEMINI_API_KEY
  const groqKey = process.env.GROQ_API_KEY
  const provider = (process.env.LLM_PROVIDER || 'gemini').toLowerCase()

  if (provider === 'gemini' && !apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })
  if (provider === 'groq' && !groqKey) return res.status(500).json({ error: 'GROQ_API_KEY not configured' })

  const { systemPrompt, userPrompt, imageBase64 } = req.body
  if (!systemPrompt || !userPrompt) return res.status(400).json({ error: 'Missing systemPrompt or userPrompt' })

  try {
    let result
    if (provider === 'groq') {
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: imageBase64
          ? [{ type: 'text', text: userPrompt }, { type: 'image_url', image_url: { url: imageBase64 } }]
          : userPrompt
        },
      ]
      const model = imageBase64 ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile'
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
        body: JSON.stringify({ model, messages, response_format: { type: 'json_object' }, temperature: 0.8 }),
      })
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error?.message || `Groq ${r.status}`) }
      const json = await r.json()
      result = JSON.parse(json.choices[0].message.content)
    } else {
      const parts = [{ text: userPrompt }]
      if (imageBase64) {
        const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/)
        if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } })
      }
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      )
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error?.message || `Gemini ${r.status}`) }
      const json = await r.json()
      result = JSON.parse(json.candidates[0].content.parts[0].text)
    }

    res.status(200).json(result)
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
}
