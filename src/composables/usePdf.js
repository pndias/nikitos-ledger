import { PDFDocument } from 'pdf-lib'

/**
 * Mapeamento dos campos do PDF oficial D&D 5.5 (character-sheet.pdf do D&D Beyond).
 * Baseado na inspeção de coordenadas dos form fields.
 */

// Campos de texto da página 1 — mapeados por posição no PDF
const FIELD_MAP = {
  // Header
  characterName: 'Text1',       // x:27  y:758 — topo, nome grande
  classLevel: 'Text6',          // x:25  y:737
  background: 'Text7',          // x:151 y:737
  race: 'Text8',                // x:25  y:715
  alignment: 'Text9',           // x:151 y:715
  experiencePoints: 'Text11',   // x:266 y:741
  playerName: 'Text12',         // x:261 y:720

  // Ability scores (big numbers) — left column
  strScore: 'Text93',           // x:14  y:716
  dexScore: 'Text94',           // x:13  y:688
  conScore: 'Text95',           // x:13  y:660
  intScore: 'Text21',           // x:29  y:550
  wisScore: 'Text22',           // x:29  y:520 (approx)
  chaScore: 'Text23',           // x:29  y:490 (approx)

  // Ability modifiers
  strMod: 'Text19',             // x:43  y:619
  dexMod: 'Text20',             // x:138 y:628 — wait, need to recheck
  
  // Inspiration
  inspiration: 'Text13',        // x:326 y:729
  profBonus: 'Text14',          // x:384 y:716

  // AC, Initiative, Speed
  ac: 'Text26',                 // x:245 y:635
  initiative: 'Text27',         // x:338 y:635
  speed: 'Text28',              // x:437 y:634

  // HP
  hpMax: 'Text29',              // x:529 y:634
  hpCurrent: 'Text63',          // x:172 y:626 — actually this might be different

  // Hit dice
  hitDice: 'Text30',            // x:231 y:573

  // Personality section (page 1 right side)
  personalityTraits: 'Text96',  // x:418 y:686 — big box
  ideals: 'Text97',             // x:419 y:508
  bonds: 'Text100',             // x:419 y:482
  flaws: 'Text101',             // x:419 y:462 (approx)

  // Features & Traits (bottom left)
  featuresTraits: 'Text102',    // large text area

  // Equipment
  equipment: 'Text103',
}

// Skill checkboxes and modifiers — ordered as they appear on the sheet
// The skills section uses Check Box 11-38 for proficiency and Text69-92 for modifiers
const SKILL_FIELDS = {
  'Acrobatics':      { check: 'Check Box11', mod: 'Text69' },
  'Animal Handling': { check: 'Check Box12', mod: 'Text70' },
  'Arcana':          { check: 'Check Box13', mod: 'Text71' },
  'Athletics':       { check: 'Check Box14', mod: 'Text72' },
  'Deception':       { check: 'Check Box15', mod: 'Text73' },
  'History':         { check: 'Check Box16', mod: 'Text74' },
  'Insight':         { check: 'Check Box17', mod: 'Text75' },  // approx
  'Intimidation':    { check: 'Check Box18', mod: 'Text76' },
  'Investigation':   { check: 'Check Box19', mod: 'Text77' },
  'Medicine':        { check: 'Check Box20', mod: 'Text78' },
  'Nature':          { check: 'Check Box21', mod: 'Text79' },
  'Perception':      { check: 'Check Box22', mod: 'Text80' },
  'Performance':     { check: 'Check Box23', mod: 'Text81' },
  'Persuasion':      { check: 'Check Box24', mod: 'Text82' },
  'Religion':        { check: 'Check Box25', mod: 'Text83' },
  'Sleight of Hand': { check: 'Check Box26', mod: 'Text84' },
  'Stealth':         { check: 'Check Box27', mod: 'Text85' },
  'Survival':        { check: 'Check Box28', mod: 'Text86' },
}

// Saving throw checkboxes
const SAVE_FIELDS = {
  str: { check: 'Check Box29', mod: 'Text87' },
  dex: { check: 'Check Box30', mod: 'Text88' },
  con: { check: 'Check Box31', mod: 'Text89' },
  int: { check: 'Check Box32', mod: 'Text90' },
  wis: { check: 'Check Box33', mod: 'Text91' },
  cha: { check: 'Check Box34', mod: 'Text92' },
}

function safeSetText(form, fieldName, value) {
  try { form.getTextField(fieldName).setText(String(value ?? '')) } catch { /* field not found */ }
}

function safeCheck(form, fieldName, checked) {
  try { if (checked) form.getCheckBox(fieldName).check(); else form.getCheckBox(fieldName).uncheck() } catch { /* */ }
}

export async function usePdf(charData, imageBase64 = null) {
  const url = '/templates/dnd_5.5_official.pdf'
  let pdfDoc

  try {
    const existingPdfBytes = await fetch(url).then(r => {
      if (!r.ok) throw new Error('Template not found')
      return r.arrayBuffer()
    })
    pdfDoc = await PDFDocument.load(existingPdfBytes, { ignoreEncryption: true })
  } catch {
    // Fallback: create blank PDF if template missing
    pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([612, 792])
    page.drawText(`${charData.name} — ${charData.class}`, { x: 50, y: 740, size: 18 })
    page.drawText(`Race: ${charData.race} | Level: ${charData.level} | HP: ${charData.hp} | AC: ${charData.ac}`, { x: 50, y: 710, size: 11 })
    if (charData.backstory) page.drawText(charData.backstory.slice(0, 500), { x: 50, y: 680, size: 9, maxWidth: 500 })
    const pdfBytes = await pdfDoc.save()
    return downloadBlob(pdfBytes, `${charData.name || 'character'}.pdf`)
  }

  const form = pdfDoc.getForm()
  const c = charData

  // Header
  safeSetText(form, FIELD_MAP.characterName, c.name)
  safeSetText(form, FIELD_MAP.classLevel, c.class)
  safeSetText(form, FIELD_MAP.race, c.race)
  safeSetText(form, FIELD_MAP.background, c.background)
  safeSetText(form, FIELD_MAP.alignment, c.alignment)
  safeSetText(form, FIELD_MAP.profBonus, c.proficiencyBonusDisplay || `+${c.proficiencyBonus}`)

  // Ability scores & modifiers
  const abilityScoreFields = ['strScore', 'dexScore', 'conScore', 'intScore', 'wisScore', 'chaScore']
  const abilityModFields = ['strMod', 'dexMod']  // only 2 mapped with certainty
  const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha']

  // Set scores via the known large-number fields
  const scoreFieldNames = ['Text93', 'Text94', 'Text95', 'Text21', 'Text22', 'Text23']
  const modFieldNames = ['Text19', 'Text20', 'Text63', 'Text64', 'Text65', 'Text66']
  abilityKeys.forEach((k, i) => {
    safeSetText(form, scoreFieldNames[i], c.abilities[k]?.score)
    safeSetText(form, modFieldNames[i], c.abilities[k]?.display)
  })

  // Saving throws
  for (const [k, fields] of Object.entries(SAVE_FIELDS)) {
    if (c.savingThrows?.[k]) {
      safeSetText(form, fields.mod, c.savingThrows[k].display)
      safeCheck(form, fields.check, c.savingThrows[k].proficient)
    }
  }

  // Skills
  for (const [name, fields] of Object.entries(SKILL_FIELDS)) {
    if (c.skills?.[name]) {
      safeSetText(form, fields.mod, c.skills[name].display)
      safeCheck(form, fields.check, c.skills[name].proficient)
    }
  }

  // Combat stats
  safeSetText(form, FIELD_MAP.ac, c.ac)
  safeSetText(form, FIELD_MAP.initiative, c.initiative?.display)
  safeSetText(form, FIELD_MAP.speed, `${c.speed}ft`)
  safeSetText(form, FIELD_MAP.hpMax, c.hp)
  safeSetText(form, FIELD_MAP.hitDice, c.hitDie)

  // Passive Perception
  safeSetText(form, 'Text15', c.passivePerception)

  // Personality / Features
  const traitsText = (c.traits || []).map(t => `${t.name}: ${t.description}`).join('\n')
  safeSetText(form, FIELD_MAP.personalityTraits, traitsText)

  const featuresText = (c.features || []).map(f => `${f.name}: ${f.description}`).join('\n')
  safeSetText(form, FIELD_MAP.featuresTraits, featuresText)

  const equipText = (c.equipment || []).join(', ')
  safeSetText(form, FIELD_MAP.equipment, equipText)

  // Backstory on page 3 if exists
  safeSetText(form, 'Text116', c.backstory)

  // Embed character image
  if (imageBase64) {
    try {
      const isPng = imageBase64.startsWith('data:image/png') || imageBase64.includes('iVBOR')
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')
      const bytes = Uint8Array.from(atob(cleanBase64), ch => ch.charCodeAt(0))
      const image = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes)
      const page = pdfDoc.getPages()[0]
      page.drawImage(image, { x: 435, y: 610, width: 130, height: 160 })
    } catch (e) {
      console.warn('Failed to embed image:', e)
    }
  }

  const pdfBytes = await pdfDoc.save()
  downloadBlob(pdfBytes, `${c.name || 'character'}.pdf`)
}

function downloadBlob(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}
