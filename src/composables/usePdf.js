import { PDFDocument } from 'pdf-lib'

/**
 * Field mapping for Old Dungeon Master's 5.5 Character Sheet v4.
 * Source: https://olddungeonmaster.com
 *
 * Skills are laid out in a 9×2 grid:
 *   Column 0 (left):  Acrobatics, Animal Handling, Arcana, Athletics, Deception, History, Insight, Intimidation, Investigation
 *   Column 1 (right): Medicine, Nature, Perception, Performance, Persuasion, Religion, Sleight of Hand, Stealth, Survival
 *
 * Spells: "0-.X" = cantrips, "1-.X" = 1st level, … "9-.X" = 9th level
 */

// Skills ordered by position in the PDF grid
const SKILL_GRID = [
  ['Acrobatics',      'Medicine'],        // row 0
  ['Animal Handling', 'Nature'],          // row 1
  ['Arcana',          'Perception'],      // row 2
  ['Athletics',       'Performance'],     // row 3
  ['Deception',       'Persuasion'],      // row 4
  ['History',         'Religion'],        // row 5
  ['Insight',         'Sleight of Hand'], // row 6
  ['Intimidation',    'Stealth'],         // row 7
  ['Investigation',   'Survival'],        // row 8
]

const SAVE_FIELDS = {
  str: { check: 'STR_Prof',  mod: 'STR Save' },
  dex: { check: 'DEX Prof',  mod: 'DEX Save' },
  con: { check: 'CON Prof',  mod: 'CON Save' },
  int: { check: 'INT Prof',  mod: 'INT Save' },
  wis: { check: 'WIS Prof',  mod: 'WIS Save' },
  cha: { check: 'CHA Prof',  mod: 'CHA Save' },
}

function safeSet(form, name, value) {
  try { form.getTextField(name).setText(String(value ?? '')) } catch { /* field not found */ }
}

function safeCheck(form, name, checked) {
  try { if (checked) form.getCheckBox(name).check(); else form.getCheckBox(name).uncheck() } catch { /* */ }
}

export async function usePdf(charData, imageBase64 = null) {
  const url = '/templates/dnd_5.5_official.pdf'
  let pdfDoc

  try {
    const bytes = await fetch(url).then(r => { if (!r.ok) throw new Error(); return r.arrayBuffer() })
    pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  } catch {
    // Fallback: blank PDF
    pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([612, 792])
    page.drawText(`${charData.name} — ${charData.class}`, { x: 50, y: 740, size: 18 })
    page.drawText(`Race: ${charData.race} | Level: ${charData.level} | HP: ${charData.hp} | AC: ${charData.ac}`, { x: 50, y: 710, size: 11 })
    if (charData.backstory) page.drawText(charData.backstory.slice(0, 500), { x: 50, y: 680, size: 9, maxWidth: 500 })
    return downloadBlob(await pdfDoc.save(), `${charData.name || 'character'}.pdf`)
  }

  const form = pdfDoc.getForm()
  const c = charData

  // Header
  safeSet(form, 'Name', c.name)
  safeSet(form, 'Level', c.level)
  safeSet(form, 'PLAYER NAME', 'Nikito\'s Ledger')
  safeSet(form, 'BONUS', c.proficiencyBonusDisplay || `+${c.proficiencyBonus}`)

  // Ability scores & modifiers
  const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha']
  const scoreFields = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']
  const modFields = ['StrMod', 'DexMod', 'ConMod', 'IntMod', 'WisMod', 'ChaMod']
  abilityKeys.forEach((k, i) => {
    safeSet(form, scoreFields[i], c.abilities[k]?.score)
    safeSet(form, modFields[i], c.abilities[k]?.display)
  })

  // Saving throws
  for (const [k, fields] of Object.entries(SAVE_FIELDS)) {
    if (c.savingThrows?.[k]) {
      safeSet(form, fields.mod, c.savingThrows[k].display)
      safeCheck(form, fields.check, c.savingThrows[k].proficient)
    }
  }

  // Skills — Skill_Mod.row.col for modifier, Skill_Status.row.col for proficiency marker
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

  // Combat
  safeSet(form, 'AC.Base', c.ac)
  safeSet(form, 'Initiative', c.initiative?.display)
  safeSet(form, 'Speed', `${c.speed}ft`)
  safeSet(form, 'HP-Max', c.hp)
  safeSet(form, 'HP-Current', c.hp)
  safeSet(form, 'HD-Type', c.hitDie)
  safeSet(form, 'Passive Wisdom Perception', c.passivePerception)

  // Features & Traits
  const featuresText = (c.features || []).map(f => `${f.name}: ${f.description}`).join('\n')
  safeSet(form, 'Features and Traits', featuresText)

  // Feats (use traits)
  const traitsText = (c.traits || []).map(t => `${t.name}: ${t.description}`).join('\n')
  safeSet(form, 'Feats', traitsText)

  // Backstory in notes
  safeSet(form, 'Page1Notes', c.backstory)

  // Spellcasting
  if (c.spellcasting) {
    safeSet(form, 'Spell_Ability', c.spellcasting.ability.toUpperCase())
    safeSet(form, 'Atk Mod', c.spellcasting.attackBonusDisplay)
    safeSet(form, 'SS Mod', c.spellcasting.saveDC)
  }

  // Spells — grouped by level into "level-.index" fields
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

  // Equipment — fill Gear.Quan fields (up to 29 slots)
  if (c.equipment?.length) {
    c.equipment.slice(0, 29).forEach((eq, i) => safeSet(form, `Gear.Quan.${i}`, eq))
  }

  // Embed portrait into the SKETCH area (bottom-right of page 1)
  // SKETCH button widget rect: x:487 y:41 w:83 h:123
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
