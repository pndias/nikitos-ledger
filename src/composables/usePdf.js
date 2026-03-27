import { PDFDocument } from 'pdf-lib'

/**
 * Field mapping for Old Dungeon Master's 5.5 Character Sheet v4.
 *
 * Skills grid (9 rows × 2 cols):
 *   Col 0: Acrobatics, Animal Handling, Arcana, Athletics, Deception, History, Insight, Intimidation, Investigation
 *   Col 1: Medicine, Nature, Perception, Performance, Persuasion, Religion, Sleight of Hand, Stealth, Survival
 *
 * Spells: "0-.X" = cantrips, "1-.X" = 1st level, … "9-.X" = 9th level
 */

const SKILL_GRID = [
  ['Acrobatics',      'Medicine'],
  ['Animal Handling', 'Nature'],
  ['Arcana',          'Perception'],
  ['Athletics',       'Performance'],
  ['Deception',       'Persuasion'],
  ['History',         'Religion'],
  ['Insight',         'Sleight of Hand'],
  ['Intimidation',    'Stealth'],
  ['Investigation',   'Survival'],
]

const SAVE_FIELDS = {
  str: { check: 'STR_Prof',  mod: 'STR Save' },
  dex: { check: 'DEX Prof',  mod: 'DEX Save' },
  con: { check: 'CON Prof',  mod: 'CON Save' },
  int: { check: 'INT Prof',  mod: 'INT Save' },
  wis: { check: 'WIS Prof',  mod: 'WIS Save' },
  cha: { check: 'CHA Prof',  mod: 'CHA Save' },
}

// Alignment abbreviation map for the dropdown
const ALIGNMENT_MAP = {
  'lawful good': 'LG', 'neutral good': 'NG', 'chaotic good': 'CG',
  'lawful neutral': 'LN', 'neutral': 'N', 'true neutral': 'N', 'chaotic neutral': 'CN',
  'lawful evil': 'LE', 'neutral evil': 'NE', 'chaotic evil': 'CE',
}

function safeSet(form, name, value) {
  try { form.getTextField(name).setText(String(value ?? '')) } catch { /* */ }
}

function safeCheck(form, name, checked) {
  try { if (checked) form.getCheckBox(name).check(); else form.getCheckBox(name).uncheck() } catch { /* */ }
}

function safeSelect(form, name, value) {
  try {
    const dd = form.getDropdown(name)
    const opts = dd.getOptions().map(o => o.toLowerCase())
    const val = String(value ?? '').toLowerCase()
    const idx = opts.findIndex(o => o === val || o.includes(val) || val.includes(o))
    if (idx >= 0) dd.select(dd.getOptions()[idx])
  } catch { /* */ }
}

export async function usePdf(charData, imageBase64 = null) {
  const url = '/templates/dnd_5.5_official.pdf'
  let pdfDoc

  try {
    const bytes = await fetch(url).then(r => { if (!r.ok) throw new Error(); return r.arrayBuffer() })
    pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  } catch {
    pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([612, 792])
    page.drawText(`${charData.name} — ${charData.class}`, { x: 50, y: 740, size: 18 })
    page.drawText(`Race: ${charData.race} | Level: ${charData.level} | HP: ${charData.hp} | AC: ${charData.ac}`, { x: 50, y: 710, size: 11 })
    if (charData.backstory) page.drawText(charData.backstory.slice(0, 500), { x: 50, y: 680, size: 9, maxWidth: 500 })
    return downloadBlob(await pdfDoc.save(), `${charData.name || 'character'}.pdf`)
  }

  const form = pdfDoc.getForm()
  const c = charData

  // === PAGE 1: Header ===
  safeSet(form, 'Name', c.name)
  safeSet(form, 'Level', c.level)
  safeSet(form, 'PLAYER NAME', "Nikito's Ledger")
  safeSet(form, 'BONUS', c.proficiencyBonusDisplay || `+${c.proficiencyBonus}`)
  safeSet(form, 'Date', new Date().toLocaleDateString('pt-BR'))
  safeSet(form, 'Size', c.size || 'M')
  safeSet(form, 'Speed', `${c.speed}ft`)

  // Dropdowns
  const primaryClass = c.classes?.[0]?.name || ''
  safeSelect(form, 'CLASS', primaryClass)
  safeSelect(form, 'Species', c.race)
  safeSelect(form, 'Bckground', c.background)
  const alignAbbr = ALIGNMENT_MAP[c.alignment?.toLowerCase()] || c.alignment || ''
  safeSelect(form, 'Alignmant', alignAbbr)

  // === Ability scores & modifiers ===
  const scoreFields = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']
  const modFields = ['StrMod', 'DexMod', 'ConMod', 'IntMod', 'WisMod', 'ChaMod']
  const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha']
  abilityKeys.forEach((k, i) => {
    safeSet(form, scoreFields[i], c.abilities[k]?.score)
    safeSet(form, modFields[i], c.abilities[k]?.display)
  })

  // === Saving throws ===
  for (const [k, fields] of Object.entries(SAVE_FIELDS)) {
    if (c.savingThrows?.[k]) {
      safeSet(form, fields.mod, c.savingThrows[k].display)
      safeCheck(form, fields.check, c.savingThrows[k].proficient)
    }
  }

  // === Skills ===
  for (let row = 0; row < SKILL_GRID.length; row++) {
    for (let col = 0; col < 2; col++) {
      const name = SKILL_GRID[row][col]
      const sk = c.skills?.[name]
      if (sk) {
        safeSet(form, `Skill_Mod.${row}.${col}`, sk.display)
        safeSet(form, `Skill_Status.${row}.${col}`, sk.proficient ? 'P' : '')
      }
    }
  }

  // === Combat ===
  safeSet(form, 'AC.Base', c.ac)
  safeSet(form, 'Initiative', c.initiative?.display)
  safeSet(form, 'HP-Max', c.hp)
  safeSet(form, 'HP-Current', c.hp)
  safeSet(form, 'HD-Type', c.hitDie?.replace(/^\d+/, '') || '')
  safeSet(form, 'HD-Max', c.level)
  safeSet(form, 'Passive Wisdom Perception', c.passivePerception)

  // Armor & Shield dropdowns
  safeSelect(form, 'ARMOR', c.armor || 'Unarmored')
  safeSelect(form, 'SHIELD', c.shield ? 'Shield' : 'No Shield')

  // === Weapons (up to 5) ===
  if (c.weapons?.length) {
    c.weapons.slice(0, 5).forEach((w, i) => {
      safeSelect(form, `WEAPONS.${i}`, w.name)
      safeSet(form, `ATK1.Wpn.${i}`, w.attackBonus)
      safeSet(form, `DD.Wpn.${i}`, w.damage)
      safeSet(form, `Type.Wpn.${i}`, w.type)
      safeSet(form, `Range.Wpn.${i}`, w.range)
      if (w.quantity > 1) safeSet(form, `WEP.Quan.${i === 0 ? '0.0' : i}`, w.quantity)
    })
  }

  // === Carrying capacity ===
  safeSet(form, 'Carry', c.carry)
  safeSet(form, 'Lift', c.lift)

  // === Personality (page 2 fields) ===
  safeSet(form, 'Text29', c.personality)  // Personality Traits
  safeSet(form, 'Text30', c.ideals)       // Ideals
  safeSet(form, 'Text31', c.bonds)        // Bonds
  safeSet(form, 'Text32', c.flaws)        // Flaws

  // Languages
  safeSet(form, 'Languages', (c.languages || []).join(', '))

  // === Features, Traits, Feats ===
  const featuresText = (c.features || []).map(f => `${f.name}: ${f.description}`).join('\n')
  safeSet(form, 'Features and Traits', featuresText)
  const traitsText = (c.traits || []).map(t => `${t.name}: ${t.description}`).join('\n')
  safeSet(form, 'Feats', traitsText)

  // Advantages/Disadvantages from traits
  const advantages = (c.traits || []).filter(t => /advantage|resist/i.test(t.description)).map(t => t.name).join(', ')
  if (advantages) safeSet(form, 'Advantages', advantages)

  // === Equipment (gear slots) ===
  if (c.equipment?.length) {
    c.equipment.slice(0, 29).forEach((eq, i) => safeSet(form, `Gear.Quan.${i}`, eq))
  }

  // === Backstory (page 3) ===
  safeSet(form, 'Text Notes', c.backstory)
  safeSet(form, 'Page1Notes', c.backstory?.slice(0, 200) || '')

  // === PAGE 4: Spellcasting ===
  if (c.spellcasting) {
    safeSet(form, 'Spell_Ability', c.spellcasting.ability.toUpperCase())
    safeSet(form, 'Atk Mod', c.spellcasting.attackBonusDisplay)
    safeSet(form, 'SS Mod', c.spellcasting.saveDC)
  }

  // Spell slots
  const slotFields = ['SS-1st', 'SS-2dn', 'SS-3rd', 'SS-4th', 'SS-5th', 'SS-6th', 'SS-7th', 'SS-8th', 'SS-9th']
  if (c.spellSlots?.length) {
    c.spellSlots.forEach((count, i) => {
      if (i < slotFields.length) safeSet(form, slotFields[i], count)
    })
  }

  // Spells by level
  if (c.spells?.length) {
    const byLevel = {}
    for (const sp of c.spells) {
      const lv = sp.level ?? 0
      if (!byLevel[lv]) byLevel[lv] = []
      byLevel[lv].push(sp.name)
    }
    for (const [lv, names] of Object.entries(byLevel)) {
      names.forEach((name, i) => safeSet(form, `${lv}-.${i}`, name))
    }
  }

  // === Portrait in SKETCH area (bottom-right page 1) ===
  if (imageBase64) {
    try {
      const isPng = imageBase64.startsWith('data:image/png') || imageBase64.includes('iVBOR')
      const clean = imageBase64.replace(/^data:image\/\w+;base64,/, '')
      const bytes = Uint8Array.from(atob(clean), ch => ch.charCodeAt(0))
      const image = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes)
      const dims = image.scaleToFit(83, 123)
      pdfDoc.getPages()[0].drawImage(image, {
        x: 487 + (83 - dims.width) / 2,
        y: 41 + (123 - dims.height) / 2,
        width: dims.width,
        height: dims.height,
      })
    } catch (e) {
      console.warn('Failed to embed image:', e)
    }
  }

  downloadBlob(await pdfDoc.save(), `${c.name || 'character'}.pdf`)
}

function downloadBlob(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}
