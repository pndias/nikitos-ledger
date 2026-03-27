/**
 * Serviço de geração via Gemini Flash 2.5.
 * Suporta geração de PCs e NPCs.
 */

const BASE_SCHEMA = `{
  "name": "string",
  "race": "string",
  "class": [{"name": "string", "level": number}],
  "level": number,
  "background": "string",
  "alignment": "string",
  "abilities": {"str": number, "dex": number, "con": number, "int": number, "wis": number, "cha": number},
  "hp": number,
  "ac": number,
  "speed": number,
  "proficiencyBonus": number,
  "skills": ["string"],
  "savingThrows": ["string"],
  "traits": [{"name": "string", "description": "string"}],
  "features": [{"name": "string", "description": "string"}],
  "equipment": ["string"],
  "spells": [{"name": "string", "level": number}],
  "backstory": "string",
  "theme": {
    "accentColor": "hex color fitting the character",
    "symbol": "single unicode emoji representing this character"
  }
}`

const PC_PROMPT = `You are a D&D 5.5 (2024 revised rules) player character generator. Return ONLY valid JSON with this schema:
${BASE_SCHEMA}
Use official D&D 5.5 rules. Calculate stats correctly. Be creative with backstory.
If an image is provided, use it as visual reference and incorporate details into backstory/traits.
The "theme" should reflect class, race, and personality.`

const NPC_PROMPT = `You are a D&D 5.5 (2024 revised rules) NPC generator for Dungeon Masters. Return ONLY valid JSON with this schema:
${BASE_SCHEMA.replace('"backstory": "string"', '"backstory": "string",\n  "dmNotes": "string — secret motivations, plot hooks, and tactical notes for the DM",\n  "roleplaying": {"voice": "string", "mannerisms": "string", "ideals": "string", "bonds": "string", "flaws": "string"},\n  "crRating": "string"')}
Create a memorable, useful NPC. Include DM-facing notes with secret motivations, plot hooks, and how to roleplay them.
NPCs can be any CR — commoners, merchants, villains, monsters with humanoid stats, etc.
If an image is provided, use it as visual reference.
The "theme" should reflect the NPC's role and personality.`

async function callGemini(systemPrompt, userPrompt, imageBase64) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY não configurada no .env')

  const parts = [{ text: userPrompt }]
  if (imageBase64) {
    const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/)
    if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } })
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`,
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

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message ?? `Gemini API error ${res.status}`)
  }

  const json = await res.json()
  return JSON.parse(json.candidates[0].content.parts[0].text)
}

export function generateCharacterFromPrompt(userPrompt, imageBase64 = null) {
  return callGemini(PC_PROMPT, userPrompt, imageBase64)
}

export function generateNpcFromPrompt(userPrompt, imageBase64 = null) {
  return callGemini(NPC_PROMPT, userPrompt, imageBase64)
}
