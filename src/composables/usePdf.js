import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

/**
 * D&D Beyond 2024 Character Sheet — coordinate-based PDF fill.
 * Template: 2 pages, 603×774pt, NO form fields (flat PDF).
 * All values drawn at mapped positions.
 */

const INK = rgb(0.12, 0.09, 0.06)
const GRAY = rgb(0.35, 0.30, 0.25)

// ─── PAGE 1 COORDINATES (603 × 774) ───
// Measured from bottom-left origin (PDF standard)
const P1 = {
  // Header
  charName:   { x: 78, y: 728, size: 14 },
  classLevel: { x: 265, y: 744, size: 8 },
  background: { x: 265, y: 728, size: 8 },
  species:    { x: 420, y: 744, size: 8 },
  alignment:  { x: 420, y: 728, size: 8 },
  playerName: { x: 510, y: 744, size: 7 },
  xp:         { x: 510, y: 728, size: 7 },

  // Ability scores (left column) — score on top, modifier below
  abilities: {
    str: { score: { x: 42, y: 636 }, mod: { x: 42, y: 618 } },
    dex: { score: { x: 42, y: 554 }, mod: { x: 42, y: 536 } },
    con: { score: { x: 42, y: 472 }, mod: { x: 42, y: 454 } },
    int: { score: { x: 42, y: 390 }, mod: { x: 42, y: 372 } },
    wis: { score: { x: 42, y: 308 }, mod: { x: 42, y: 290 } },
    cha: { score: { x: 42, y: 226 }, mod: { x: 42, y: 208 } },
  },

  // Saving throws (next to abilities)
  saves: {
    str: { x: 95, y: 648, size: 7 },
    dex: { x: 95, y: 566, size: 7 },
    con: { x: 95, y: 484, size: 7 },
    int: { x: 95, y: 402, size: 7 },
    wis: { x: 95, y: 320, size: 7 },
    cha: { x: 95, y: 238, size: 7 },
  },

  // Skills (right of saves, two sub-columns per ability)
  skills: {
    'Acrobatics':      { x: 95, y: 540, size: 6.5 },
    'Animal Handling':  { x: 95, y: 530, size: 6.5 },
    'Arcana':          { x: 95, y: 376, size: 6.5 },
    'Athletics':       { x: 95, y: 622, size: 6.5 },
    'Deception':       { x: 95, y: 212, size: 6.5 },
    'History':         { x: 95, y: 386, size: 6.5 },
    'Insight':         { x: 95, y: 304, size: 6.5 },
    'Intimidation':    { x: 95, y: 222, size: 6.5 },
    'Investigation':   { x: 95, y: 396, size: 6.5 },
    'Medicine':        { x: 95, y: 294, size: 6.5 },
    'Nature':          { x: 95, y: 366, size: 6.5 },
    'Perception':      { x: 95, y: 314, size: 6.5 },
    'Performance':     { x: 95, y: 202, size: 6.5 },
    'Persuasion':      { x: 95, y: 232, size: 6.5 },
    'Religion':        { x: 95, y: 356, size: 6.5 },
    'Sleight of Hand': { x: 95, y: 550, size: 6.5 },
    'Stealth':         { x: 95, y: 520, size: 6.5 },
    'Survival':        { x: 95, y: 284, size: 6.5 },
  },

  // Inspiration & Proficiency
  inspiration: { x: 80, y: 694, size: 9 },
  profBonus:   { x: 80, y: 676, size: 9 },

  // Combat block (center)
  ac:         { x: 228, y: 660, size: 16 },
  initiative: { x: 290, y: 660, size: 14 },
  speed:      { x: 352, y: 660, size: 14 },
  hpMax:      { x: 290, y: 610, size: 10 },
  hpCurrent:  { x: 290, y: 580, size: 14 },
  tempHp:     { x: 290, y: 530, size: 12 },
  hitDiceTotal: { x: 240, y: 486, size: 8 },
  hitDice:      { x: 280, y: 486, size: 8 },
  deathSaves: { x: 330, y: 486, size: 7 },

  // Attacks & Spellcasting
  atkHeader: { x: 222, y: 440, size: 8 },
  attacks: [
    { name: { x: 224, y: 420 }, bonus: { x: 330, y: 420 }, dmg: { x: 380, y: 420 }, size: 7 },
    { name: { x: 224, y: 407 }, bonus: { x: 330, y: 407 }, dmg: { x: 380, y: 407 }, size: 7 },
    { name: { x: 224, y: 394 }, bonus: { x: 330, y: 394 }, dmg: { x: 380, y: 394 }, size: 7 },
  ],
  atkNotes: { x: 224, y: 375, size: 6, maxW: 200 },

  // Personality block (right column)
  personality: { x: 410, y: 660, size: 6.5, maxW: 175 },
  ideals:      { x: 410, y: 590, size: 6.5, maxW: 175 },
  bonds:       { x: 410, y: 530, size: 6.5, maxW: 175 },
  flaws:       { x: 410, y: 470, size: 6.5, maxW: 175 },

  // Features & Traits (right column bottom)
  features: { x: 410, y: 410, size: 6, maxW: 175 },

  // Equipment (center bottom)
  equipment: { x: 222, y: 310, size: 6.5, maxW: 190 },

  // Other proficiencies & languages (left bottom)
  profLang: { x: 20, y: 160, size: 6, maxW: 180 },

  // Passive Perception
  passivePerception: { x: 42, y: 180, size: 10 },
}

// ─── PAGE 2 COORDINATES ───
const P2 = {
  // Character appearance / portrait area (top-right)
  portrait: { x: 380, y: 580, w: 190, h: 170 },

  // Character name (top)
  charName: { x: 78, y: 744, size: 10 },

  // Appearance text fields
  age:    { x: 78, y: 720, size: 8 },
  height: { x: 200, y: 720, size: 8 },
  weight: { x: 310, y: 720, size: 8 },
  eyes:   { x: 78, y: 704, size: 8 },
  skin:   { x: 200, y: 704, size: 8 },
  hair:   { x: 310, y: 704, size: 8 },

  // Backstory (left column, large area)
  backstory: { x: 25, y: 560, size: 6.5, maxW: 330 },

  // Allies & Organizations
  allies: { x: 380, y: 530, size: 6.5, maxW: 190 },

  // Additional features
  addFeatures: { x: 380, y: 370, size: 6.5, maxW: 190 },

  // Treasure
  treasure: { x: 380, y: 200, size: 6.5, maxW: 190 },
}

function drawText(page, text, pos, font, defaultSize = 8) {
  if (!text && text !== 0) return
  const str = String(text)
  const size = pos.size || defaultSize
  if (pos.maxW) {
    drawWrapped(page, str, pos.x, pos.y, pos.maxW, size, font)
  } else {
    page.drawText(str, { x: pos.x, y: pos.y, size, font, color: INK })
  }
}

function drawWrapped(page, text, x, y, maxW, size, font) {
  const words = text.split(/\s+/)
  let line = ''
  let cy = y
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    const w = font.widthOfTextAtSize(test, size)
    if (w > maxW && line) {
      page.drawText(line, { x, y: cy, size, font, color: INK })
      cy -= size + 2
      line = word
      if (cy < 30) break
    } else {
      line = test
    }
  }
  if (line && cy >= 30) page.drawText(line, { x, y: cy, size, font, color: INK })
}

function drawCentered(page, text, cx, y, size, font) {
  if (!text && text !== 0) return
  const str = String(text)
  const w = font.widthOfTextAtSize(str, size)
  page.drawText(str, { x: cx - w / 2, y, size, font, color: INK })
}

export async function usePdf(charData, imageBase64 = null) {
  const url = '/templates/dndbeyond_2024.pdf'
  let pdfDoc

  try {
    const bytes = await fetch(url).then(r => { if (!r.ok) throw new Error(); return r.arrayBuffer() })
    pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  } catch {
    // Fallback: create blank
    pdfDoc = await PDFDocument.create()
    pdfDoc.addPage([603, 774])
    pdfDoc.addPage([603, 774])
  }

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const pages = pdfDoc.getPages()
  const pg1 = pages[0]
  const pg2 = pages[1]
  const c = charData

  // ═══ PAGE 1 ═══

  // Header
  pg1.drawText(c.name || '', { x: P1.charName.x, y: P1.charName.y, size: P1.charName.size, font: fontBold, color: INK })
  drawText(pg1, `${c.class} ${c.level}`, P1.classLevel, font)
  drawText(pg1, c.background, P1.background, font)
  drawText(pg1, c.species, P1.species, font)
  drawText(pg1, c.alignment, P1.alignment, font)
  drawText(pg1, "Nikito's Ledger", P1.playerName, font)

  // Proficiency bonus
  drawCentered(pg1, c.proficiencyBonusDisplay, P1.profBonus.x, P1.profBonus.y, P1.profBonus.size, fontBold)

  // Ability scores & modifiers
  const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha']
  for (const k of abilityKeys) {
    const ab = c.abilities[k]
    if (!ab) continue
    const pos = P1.abilities[k]
    drawCentered(pg1, ab.score, pos.score.x, pos.score.y, 12, fontBold)
    drawCentered(pg1, ab.display, pos.mod.x, pos.mod.y, 16, fontBold)
  }

  // Saving throws
  for (const k of abilityKeys) {
    const sv = c.savingThrows?.[k]
    if (!sv) continue
    const pos = P1.saves[k]
    const label = `${sv.proficient ? '● ' : '○ '}${sv.display} ${k.toUpperCase()}`
    pg1.drawText(label, { x: pos.x, y: pos.y, size: pos.size, font: sv.proficient ? fontBold : font, color: INK })
  }

  // Skills
  for (const [name, sk] of Object.entries(c.skills || {})) {
    const pos = P1.skills[name]
    if (!pos) continue
    const label = `${sk.proficient ? '● ' : '○ '}${sk.display} ${name}`
    pg1.drawText(label, { x: pos.x, y: pos.y, size: pos.size, font: sk.proficient ? fontBold : font, color: sk.proficient ? INK : GRAY })
  }

  // Combat
  drawCentered(pg1, c.ac, P1.ac.x, P1.ac.y, P1.ac.size, fontBold)
  drawCentered(pg1, c.initiative?.display, P1.initiative.x, P1.initiative.y, P1.initiative.size, fontBold)
  drawCentered(pg1, `${c.speed}ft`, P1.speed.x, P1.speed.y, P1.speed.size, font)
  drawText(pg1, `${c.hp}`, P1.hpMax, font)
  drawCentered(pg1, c.hp, P1.hpCurrent.x, P1.hpCurrent.y, P1.hpCurrent.size, fontBold)
  drawText(pg1, c.level, P1.hitDiceTotal, font)
  drawText(pg1, c.hitDie?.replace(/^\d+/, '') || '', P1.hitDice, font)

  // Passive Perception
  drawCentered(pg1, c.passivePerception, P1.passivePerception.x, P1.passivePerception.y, P1.passivePerception.size, fontBold)

  // Attacks
  if (c.weapons?.length) {
    c.weapons.slice(0, 3).forEach((w, i) => {
      const pos = P1.attacks[i]
      pg1.drawText(w.name, { x: pos.name.x, y: pos.name.y, size: pos.size, font, color: INK })
      pg1.drawText(w.attackBonus, { x: pos.bonus.x, y: pos.bonus.y, size: pos.size, font: fontBold, color: INK })
      pg1.drawText(`${w.damage} ${w.type}`, { x: pos.dmg.x, y: pos.dmg.y, size: pos.size, font, color: INK })
    })
    // Spellcasting note
    if (c.spellcasting) {
      drawWrapped(pg1, `Spell DC ${c.spellcasting.saveDC} | Atk ${c.spellcasting.attackBonusDisplay} (${c.spellcasting.ability.toUpperCase()})`, P1.atkNotes.x, P1.atkNotes.y, P1.atkNotes.maxW, P1.atkNotes.size, font)
    }
  }

  // Personality
  drawText(pg1, c.personality, P1.personality, font)
  drawText(pg1, c.ideals, P1.ideals, font)
  drawText(pg1, c.bonds, P1.bonds, font)
  drawText(pg1, c.flaws, P1.flaws, font)

  // Features & Traits
  const featText = (c.features || []).map(f => `${f.name}: ${f.description}`).join('\n')
  drawText(pg1, featText, P1.features, font)

  // Equipment
  const eqText = (c.equipment || []).join(', ')
  drawText(pg1, eqText, P1.equipment, font)

  // Proficiencies & Languages
  const profLangText = [
    `Languages: ${(c.languages || []).join(', ')}`,
    ...(c.traits || []).map(t => `${t.name}: ${t.description}`),
  ].join('\n')
  drawText(pg1, profLangText, P1.profLang, font)

  // ═══ PAGE 2 ═══

  // Name
  drawText(pg2, c.name, P2.charName, fontBold)

  // Backstory
  drawText(pg2, c.backstory, P2.backstory, font)

  // Spells as additional features
  if (c.spells?.length) {
    const spellText = c.spells.map(s => `${s.name} (${s.level === 0 ? 'cantrip' : `lv${s.level}`})`).join(', ')
    drawText(pg2, `Spells: ${spellText}`, P2.addFeatures, font)
  }

  // Spell slots as treasure area (reuse)
  if (c.spellSlots?.length) {
    const slotText = c.spellSlots.map((n, i) => `${i + 1}st: ${n}`).join(' | ')
    drawText(pg2, `Spell Slots: ${slotText}`, P2.treasure, font)
  }

  // ═══ PORTRAIT in Appearance area (page 2, top-right) ═══
  if (imageBase64) {
    try {
      const isPng = imageBase64.startsWith('data:image/png') || imageBase64.includes('iVBOR')
      const clean = imageBase64.replace(/^data:image\/\w+;base64,/, '')
      const bytes = Uint8Array.from(atob(clean), ch => ch.charCodeAt(0))
      const image = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes)
      const dims = image.scaleToFit(P2.portrait.w, P2.portrait.h)
      pg2.drawImage(image, {
        x: P2.portrait.x + (P2.portrait.w - dims.width) / 2,
        y: P2.portrait.y + (P2.portrait.h - dims.height) / 2,
        width: dims.width,
        height: dims.height,
      })
    } catch (e) {
      console.warn('Failed to embed portrait:', e)
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
