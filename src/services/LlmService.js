/**
 * Serviço de geração via LLM — Gemini → Groq → OpenRouter (fallback em 429/503/529).
 * Usa regras do Player's Handbook 2024 (D&D 5.5).
 * Prod: chama /api/generate (keys server-side). Dev: chamadas diretas com VITE_ keys.
 * Provider primário em dev via VITE_LLM_PROVIDER (gemini | groq). Timeout de 30s + 1 retry.
 */

import { validateSpells } from './Dnd5eApi.js'

const TIMEOUT_MS = 20000        // per-provider, direct dev calls
const PROXY_TIMEOUT_MS = 75000  // /api/generate orchestrates the whole fallback chain — wait it out

// fetch with AbortController timeout — keeps a hung request from freezing the UI on "Invocando..."
async function fetchWithTimeout(url, opts, label, timeoutMs = TIMEOUT_MS) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal })
  } catch (e) {
    if (e.name === 'AbortError') {
      const err = new Error(`${label} timeout após ${timeoutMs / 1000}s`)
      err.status = 504 // timeout → skip to next provider, no same-provider retry
      throw err
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}

const BASE_SCHEMA = `{
  "name": "string",
  "species": "string — Aasimar, Dragonborn, Dwarf, Elf, Gnome, Goliath, Halfling, Human, Orc, Tiefling",
  "class": [{"name": "string", "level": number, "subclass": "string or null if below level 3"}],
  "level": number,
  "background": "string — one of: Acolyte, Artisan, Charlatan, Criminal, Entertainer, Farmer, Guard, Guide, Hermit, Merchant, Noble, Sage, Sailor, Scribe, Soldier, Wayfarer",
  "originFeat": "string — the feat granted by the background",
  "alignment": "string — LG, NG, CG, LN, N, CN, LE, NE, CE",
  "size": "string — S, M, L",
  "abilities": {"str": number, "dex": number, "con": number, "int": number, "wis": number, "cha": number},
  "hp": number,
  "ac": number,
  "armor": "string — Unarmored, Padded Armor, Leather Armor, Studded Leather Armor, Hide Armor, Chain Shirt, Scale Mail, Breastplate, Half Plate, Ring Mail, Chain Mail, Splint Armor, or Plate Armor",
  "shield": boolean,
  "speed": number,
  "proficiencyBonus": number,
  "skills": ["string"],
  "savingThrows": ["string"],
  "languages": ["string — always include Common plus two others"],
  "weapons": [{"name": "string — exact PHB weapon name", "quantity": number}],
  "traits": [{"name": "string", "description": "string"}],
  "features": [{"name": "string", "description": "string"}],
  "equipment": ["string"],
  "spells": [{"name": "string", "level": number}],
  "backstory": "string",
  "personality": "string",
  "ideals": "string",
  "bonds": "string",
  "flaws": "string",
  "theme": {
    "accentColor": "hex color fitting the character",
    "symbol": "single unicode emoji representing this character"
  }
}`

const PC_PROMPT = `You are a D&D 2024 Player's Handbook character generator. Return ONLY valid JSON with this schema:
${BASE_SCHEMA}
STRICT 2024 PHB RULES:
- "Race" is now "Species": Aasimar, Dragonborn, Dwarf, Elf, Gnome, Goliath, Halfling, Human, Orc, Tiefling.
- Species grant NO ability score increases. ASI comes from Background: +2/+1 or +1/+1/+1 to the background's three eligible scores.
- Standard array: 15, 14, 13, 12, 10, 8. Apply background ASI on top.
- Each Background grants an Origin Feat, two skill proficiencies, one tool proficiency.
- Subclasses at level 3 for ALL classes.
- Common + two languages of choice.
- 16 backgrounds: Acolyte, Artisan, Charlatan, Criminal, Entertainer, Farmer, Guard, Guide, Hermit, Merchant, Noble, Sage, Sailor, Scribe, Soldier, Wayfarer.
- Background→Feat: Acolyte→Magic Initiate(Cleric), Artisan→Crafter, Charlatan→Skilled, Criminal→Alert, Entertainer→Musician, Farmer→Tough, Guard→Alert, Guide→Magic Initiate(Druid), Hermit→Healer, Merchant→Lucky, Noble→Skilled, Sage→Magic Initiate(Wizard), Sailor→Tavern Brawler, Scribe→Skilled, Soldier→Savage Attacker, Wayfarer→Lucky.
- Background→Ability Scores: Acolyte→INT/WIS/CHA, Artisan→STR/DEX/CON, Charlatan→DEX/CON/CHA, Criminal→DEX/CON/INT, Entertainer→STR/DEX/CHA, Farmer→STR/CON/WIS, Guard→STR/CON/WIS, Guide→DEX/CON/WIS, Hermit→CON/WIS/CHA, Merchant→CON/INT/CHA, Noble→STR/INT/CHA, Sage→CON/INT/WIS, Sailor→STR/DEX/WIS, Scribe→DEX/INT/WIS, Soldier→STR/DEX/CON, Wayfarer→DEX/WIS/CHA.
- Class saving throws: Barbarian→STR/CON, Bard→DEX/CHA, Cleric→WIS/CHA, Druid→INT/WIS, Fighter→STR/CON, Monk→STR/DEX, Paladin→WIS/CHA, Ranger→STR/DEX, Rogue→DEX/INT, Sorcerer→CON/CHA, Warlock→WIS/CHA, Wizard→INT/WIS.
- Warlock uses Pact Magic (short-rest slots), not standard spell slots.
- HP at level 1 = max hit die + CON mod. Subsequent levels = (die/2 + 1) + CON mod each.
- Use exact PHB weapon names for the "weapons" array.
Be creative with backstory. If an image is provided, use it as visual reference.
The "theme" should reflect class, species, and personality.`

const NPC_PROMPT = `You are a D&D 2024 Player's Handbook NPC generator for Dungeon Masters. Return ONLY valid JSON with this schema:
${BASE_SCHEMA.replace('"backstory": "string"', '"backstory": "string",\n  "dmNotes": "string — secret motivations, plot hooks, and tactical notes for the DM",\n  "roleplaying": {"voice": "string", "mannerisms": "string", "ideals": "string", "bonds": "string", "flaws": "string"},\n  "crRating": "string"')}
Use 2024 PHB rules. Species grant NO ability score increases — ASI comes from Background (+2/+1 or +1/+1/+1).
Class saving throws: Barbarian→STR/CON, Bard→DEX/CHA, Cleric→WIS/CHA, Druid→INT/WIS, Fighter→STR/CON, Monk→STR/DEX, Paladin→WIS/CHA, Ranger→STR/DEX, Rogue→DEX/INT, Sorcerer→CON/CHA, Warlock→WIS/CHA, Wizard→INT/WIS.
Create a memorable NPC with DM-facing notes: secret motivations, plot hooks, roleplay guidance.
NPCs can be any CR. If an image is provided, use it as visual reference.
The "theme" should reflect the NPC's role and personality.`

// ── LLM call (serverless proxy in prod, direct in local dev) ──

async function callLlm(systemPrompt, userPrompt, imageBase64) {
  if (import.meta.env.PROD || !import.meta.env.VITE_GEMINI_API_KEY) {
    const res = await fetchWithTimeout('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt, userPrompt, imageBase64 }),
    }, 'API', PROXY_TIMEOUT_MS)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `API error ${res.status}`)
    }
    return res.json()
  }

  // Local dev — direct calls with VITE_ keys, primary → fallback
  const SAME_RETRY = new Set([429, 503, 529])        // fast rate-limit → retry same provider once
  const FALLTHROUGH = new Set([429, 503, 529, 504])  // advance to fallback provider (504 = timeout)

  async function callGroq() {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY
    if (!apiKey) throw new Error('VITE_GROQ_API_KEY não configurada no .env')
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: imageBase64
        ? [{ type: 'text', text: userPrompt }, { type: 'image_url', image_url: { url: imageBase64 } }]
        : userPrompt },
    ]
    const model = imageBase64 ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile'
    const res = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, response_format: { type: 'json_object' }, temperature: 0.8 }),
    }, 'Groq')
    if (!res.ok) {
      const e = await res.json().catch(() => ({}))
      const err = new Error(e.error?.message ?? `Groq ${res.status}`)
      err.status = res.status
      throw err
    }
    const json = await res.json()
    return JSON.parse(json.choices[0].message.content)
  }

  async function callGemini() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) throw new Error('VITE_GEMINI_API_KEY não configurada no .env')
    const parts = [{ text: userPrompt }]
    if (imageBase64) {
      const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/)
      if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } })
    }
    const res = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
    if (!res.ok) {
      const e = await res.json().catch(() => ({}))
      const msg = e.error?.message ?? `Gemini ${res.status}`
      const err = new Error(
        (res.status === 429 || /overload/i.test(msg))
          ? 'Gemini sobrecarregado. Tente novamente ou configure VITE_LLM_PROVIDER=groq no .env'
          : msg
      )
      err.status = res.status
      throw err
    }
    const json = await res.json()
    return JSON.parse(json.candidates[0].content.parts[0].text)
  }

  const primary = (import.meta.env.VITE_LLM_PROVIDER || 'gemini').toLowerCase()
  const [callPrimary, callFallback] = primary === 'groq'
    ? [callGroq, callGemini]
    : [callGemini, callGroq]

  // one retry on the same provider before falling through — a transient rate-limit often clears.
  // timeouts (504) are NOT retried: fall straight through to the fallback provider.
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  async function withRetry(fn) {
    try {
      return await fn()
    } catch (e) {
      if (!SAME_RETRY.has(e.status)) throw e
      await sleep(800)
      return fn()
    }
  }

  try {
    return await withRetry(callPrimary)
  } catch (primaryErr) {
    if (!FALLTHROUGH.has(primaryErr.status)) throw primaryErr
    try {
      return await callFallback()
    } catch (fallbackErr) {
      throw new Error(`${primaryErr.message} | Fallback também falhou: ${fallbackErr.message}`)
    }
  }
}

/** Enriquece spells com dados do 5etools (XPHB 2024). */
async function enrichSpells(character) {
  if (!character.spells?.length) return character
  const validated = await validateSpells(character.spells)
  character.spells = validated.map(s => ({
    name: s.name,
    level: s.level,
    ...(s.school && { school: s.school }),
    ...(s.castingTime && { castingTime: s.castingTime }),
    ...(s.range && { range: s.range }),
    ...(s.duration && { duration: s.duration }),
    ...(s.concentration !== undefined && { concentration: s.concentration }),
    ...(s.description && { description: s.description }),
    valid: s.valid,
  }))
  return character
}

export async function generateCharacterFromPrompt(userPrompt, imageBase64 = null) {
  const raw = await callLlm(PC_PROMPT, userPrompt, imageBase64)
  return enrichSpells(raw)
}

export async function generateNpcFromPrompt(userPrompt, imageBase64 = null) {
  const raw = await callLlm(NPC_PROMPT, userPrompt, imageBase64)
  return enrichSpells(raw)
}
