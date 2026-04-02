/**
 * Serviço de geração via LLM — suporta Gemini e Groq.
 * Usa regras do Player's Handbook 2024 (D&D 5.5).
 * Provider selecionado via VITE_LLM_PROVIDER (gemini | groq).
 */

import { validateSpells } from './Dnd5eApi.js'

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
IMPORTANT 2024 RULES:
- "Race" is now called "Species". Use only: Aasimar, Dragonborn, Dwarf, Elf, Gnome, Goliath, Halfling, Human, Orc, Tiefling.
- Species NO LONGER grant ability score increases. Ability score bonuses come from Background (+2/+1 or +1/+1/+1 to the background's three eligible scores).
- Each Background grants an Origin Feat, two skill proficiencies, and one tool proficiency.
- Subclasses are gained at level 3 for ALL classes.
- Characters know Common plus two languages of their choice.
- Use the 16 official 2024 backgrounds: Acolyte, Artisan, Charlatan, Criminal, Entertainer, Farmer, Guard, Guide, Hermit, Merchant, Noble, Sage, Sailor, Scribe, Soldier, Wayfarer.
- Background→Feat mapping: Acolyte→Magic Initiate(Cleric), Artisan→Crafter, Charlatan→Skilled, Criminal→Alert, Entertainer→Musician, Farmer→Tough, Guard→Alert, Guide→Magic Initiate(Druid), Hermit→Healer, Merchant→Lucky, Noble→Skilled, Sage→Magic Initiate(Wizard), Sailor→Tavern Brawler, Scribe→Skilled, Soldier→Savage Attacker, Wayfarer→Lucky.
Calculate stats correctly. Be creative with backstory.
If an image is provided, use it as visual reference and incorporate details into backstory/traits.
The "theme" should reflect class, species, and personality.`

const NPC_PROMPT = `You are a D&D 2024 Player's Handbook NPC generator for Dungeon Masters. Return ONLY valid JSON with this schema:
${BASE_SCHEMA.replace('"backstory": "string"', '"backstory": "string",\n  "dmNotes": "string — secret motivations, plot hooks, and tactical notes for the DM",\n  "roleplaying": {"voice": "string", "mannerisms": "string", "ideals": "string", "bonds": "string", "flaws": "string"},\n  "crRating": "string"')}
IMPORTANT: Use 2024 PHB rules. Species (not race) no longer grant ability score increases — those come from Background.
Create a memorable, useful NPC. Include DM-facing notes with secret motivations, plot hooks, and how to roleplay them.
NPCs can be any CR — commoners, merchants, villains, monsters with humanoid stats, etc.
If an image is provided, use it as visual reference.
The "theme" should reflect the NPC's role and personality.`

// ── LLM call (serverless proxy in prod, direct in local dev) ──

async function callLlm(systemPrompt, userPrompt, imageBase64) {
  if (import.meta.env.PROD || !import.meta.env.VITE_GEMINI_API_KEY) {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt, userPrompt, imageBase64 }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `API error ${res.status}`)
    }
    return res.json()
  }

  // Local dev — direct calls with VITE_ keys
  const provider = (import.meta.env.VITE_LLM_PROVIDER || 'gemini').toLowerCase()

  if (provider === 'groq') {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY
    if (!apiKey) throw new Error('VITE_GROQ_API_KEY não configurada no .env')
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: imageBase64
        ? [{ type: 'text', text: userPrompt }, { type: 'image_url', image_url: { url: imageBase64 } }]
        : userPrompt },
    ]
    const model = imageBase64 ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile'
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, response_format: { type: 'json_object' }, temperature: 0.8 }),
    })
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message ?? `Groq ${res.status}`) }
    const json = await res.json()
    return JSON.parse(json.choices[0].message.content)
  }

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  const parts = [{ text: userPrompt }]
  if (imageBase64) {
    const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/)
    if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } })
  }
  const res = await fetch(
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
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message ?? `Gemini ${res.status}`) }
  const json = await res.json()
  return JSON.parse(json.candidates[0].content.parts[0].text)
}

/** Enriquece spells com dados do SRD (validação via dnd5eapi.co). */
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
