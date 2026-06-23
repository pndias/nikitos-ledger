const RETRYABLE = new Set([429, 503, 529])
const TIMEOUT_MS = 30000
const RETRY_DELAY_MS = 800
const OPENROUTER_MODEL = 'qwen/qwen3-next-80b-a3b-instruct:free'

const sleep = ms => new Promise(r => setTimeout(r, ms))

// fetch with AbortController timeout — prevents a hung request from pinning the function
async function fetchWithTimeout(url, opts, label) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal })
  } catch (e) {
    if (e.name === 'AbortError') {
      const err = new Error(`${label} timeout após ${TIMEOUT_MS / 1000}s`)
      err.status = 503 // treat timeout as retryable → next provider
      throw err
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}

async function tryGroq(key, systemPrompt, userPrompt, imageBase64) {
  const model = imageBase64 ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile'
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: imageBase64
      ? [{ type: 'text', text: userPrompt }, { type: 'image_url', image_url: { url: imageBase64 } }]
      : userPrompt
    },
  ]
  const r = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, response_format: { type: 'json_object' }, temperature: 0.8 }),
  }, 'Groq')
  if (!r.ok) {
    const e = await r.json().catch(() => ({}))
    const err = new Error(e.error?.message || `Groq ${r.status}`)
    err.status = r.status
    throw err
  }
  const json = await r.json()
  return JSON.parse(json.choices[0].message.content)
}

async function tryGemini(key, systemPrompt, userPrompt, imageBase64) {
  const parts = [{ text: userPrompt }]
  if (imageBase64) {
    const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/)
    if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } })
  }
  const r = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    },
    'Gemini'
  )
  if (!r.ok) {
    const e = await r.json().catch(() => ({}))
    const err = new Error(e.error?.message || `Gemini ${r.status}`)
    err.status = r.status
    throw err
  }
  const json = await r.json()
  return JSON.parse(json.candidates[0].content.parts[0].text)
}

async function tryOpenRouter(key, systemPrompt, userPrompt) {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]
  const r = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: OPENROUTER_MODEL, messages, response_format: { type: 'json_object' }, temperature: 0.8 }),
  }, 'OpenRouter')
  if (!r.ok) {
    const e = await r.json().catch(() => ({}))
    const err = new Error(e.error?.message || `OpenRouter ${r.status}`)
    err.status = r.status
    throw err
  }
  const json = await r.json()
  const raw = json.choices[0].message.content
  try { return typeof raw === 'object' ? raw : JSON.parse(raw) } catch { return raw }
}

// one retry on the same provider before falling through — a transient 503 often clears
async function callWithRetry(fn) {
  try {
    return await fn()
  } catch (e) {
    if (!RETRYABLE.has(e.status)) throw e
    await sleep(RETRY_DELAY_MS)
    return fn()
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { systemPrompt, userPrompt, imageBase64 } = req.body
  if (!systemPrompt || !userPrompt) return res.status(400).json({ error: 'Missing systemPrompt or userPrompt' })

  const groqKey = process.env.GROQ_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY
  const openrouterKey = process.env.OPENROUTER_API_KEY
  const primary = (process.env.LLM_PROVIDER || 'gemini').toLowerCase()

  const ALL_PROVIDERS = [
    { name: 'groq', key: groqKey, fn: () => tryGroq(groqKey, systemPrompt, userPrompt, imageBase64) },
    { name: 'gemini', key: geminiKey, fn: () => tryGemini(geminiKey, systemPrompt, userPrompt, imageBase64) },
    { name: 'openrouter', key: openrouterKey, fn: () => tryOpenRouter(openrouterKey, systemPrompt, userPrompt) },
  ]

  const primaryEntry = ALL_PROVIDERS.find(p => p.name === primary)
  const rest = ALL_PROVIDERS.filter(p => p.name !== primary)
  const chain = primaryEntry ? [primaryEntry, ...rest] : ALL_PROVIDERS
  const providers = chain.filter(p => p.key)

  if (providers.length === 0) return res.status(500).json({ error: 'No provider API keys configured' })

  let lastError = null
  let lastProvider = null

  for (const provider of providers) {
    lastProvider = provider.name
    try {
      const result = await callWithRetry(provider.fn)
      res.setHeader('X-Provider-Used', provider.name)
      return res.status(200).json(result)
    } catch (e) {
      lastError = e
      if (!RETRYABLE.has(e.status)) break // non-retryable (400/401/etc) → fail fast, no fallback
    }
  }

  res.status(502).json({ error: lastError?.message || 'All providers failed', provider: lastProvider })
}
