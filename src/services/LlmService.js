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
