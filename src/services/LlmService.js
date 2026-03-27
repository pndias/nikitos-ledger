/**
 * Serviço de geração via Gemini Flash 2.5.
 * Suporta geração de PCs e NPCs.
 * Usa regras do Player's Handbook 2024 (D&D 5.5).
 */

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
