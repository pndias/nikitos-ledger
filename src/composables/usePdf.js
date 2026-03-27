import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

/**
 * D&D Beyond 2024 Character Sheet — coordinate-based PDF fill.
 * Template: 2 pages, 603×774pt, NO form fields (flat PDF).
 * Coordinates calibrated via marker overlay on actual template.
 */

const INK = rgb(0.1, 0.07, 0.04)

function draw(page, text, x, y, size, font, color = INK) {
  if (text == null || text === '') return
  page.drawText(String(text), { x, y, size, font, color })
}

function drawCentered(page, text, cx, y, size, font) {
  if (text == null || text === '') return
  const s = String(text)
  const w = font.widthOfTextAtSize(s, size)
  page.drawText(s, { x: cx - w / 2, y, size, font, color: INK })
}

function drawWrapped(page, text, x, y, maxW, size, font, maxLines = 60) {
  if (!text) return y
  const words = String(text).split(/\s+/)
  let line = '', cy = y, lines = 0
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(test, size) > maxW && line) {
      page.drawText(line, { x, y: cy, size, font, color: INK })
      cy -= size + 2
      line = word
      if (++lines >= maxLines || cy < 20) break
    } else {
      line = test
    }
  }
  if (line && cy >= 20 && lines < maxLines) {
    page.drawText(line, { x, y: cy, size, font, color: INK })
    cy -= size + 2
  }
  return cy
}

export async function usePdf(charData, imageBase64 = null) {
  const url = '/templates/dndbeyond_2024.pdf'
  let pdfDoc

  try {
    const bytes = await fetch(url).then(r => { if (!r.ok) throw new Error(); return r.arrayBuffer() })
    pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  } catch {
    pdfDoc = await PDFDocument.create()
    pdfDoc.addPage([603, 774])
    pdfDoc.addPage([603, 774])
  }

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const pages = pdfDoc.getPages()
  const pg1 = pages[0]
  const pg2 = pages[1] || pdfDoc.addPage([603, 774])
  const c = charData

  // ═══════════════════════════════════════════
  // PAGE 1
  // ═══════════════════════════════════════════

  // ── Header ──
  draw(pg1, c.name, 38, 755, 12, bold)
  draw(pg1, c.background, 38, 728, 8, font)
  draw(pg1, c.class, 200, 728, 8, font)
  draw(pg1, c.species, 38, 703, 8, font)
  draw(pg1, c.classes?.[0]?.subclass || '', 200, 703, 8, font)
  // Level (centered in LEVEL box)
  drawCentered(pg1, c.level, 418, 733, 10, bold)
  // XP
  draw(pg1, '', 418, 708, 7, font)

  // ── Top-right boxes (from left to right): ARMOR CLASS | HIT POINTS | HIT DICE | DEATH SAVES ──
  // ARMOR CLASS: shield shape centered ~x 478
  drawCentered(pg1, c.ac, 478, 748, 14, bold)

  // HIT POINTS: header area ~x 530-590
  //   CURRENT line: x~530, y~700  |  MAX line: x~575, y~700
  //   TEMP: x~530, y~728
  draw(pg1, c.hp, 535, 700, 9, bold)   // CURRENT
  draw(pg1, c.hp, 572, 700, 9, font)   // MAX

  // HIT DICE: ~x 500-530 area — but from the image it's further right
  //   SPENT: x~510, y~728  |  MAX: x~510, y~700
  draw(pg1, c.hitDie, 510, 700, 7, font) // MAX

  // ── Stats row (y ~660) ──
  drawCentered(pg1, c.proficiencyBonusDisplay, 68, 660, 11, bold)
  drawCentered(pg1, c.initiative?.display, 370, 660, 11, bold)
  drawCentered(pg1, `${c.speed}ft`, 460, 660, 10, font)
  drawCentered(pg1, c.size || 'M', 540, 660, 9, font)
  drawCentered(pg1, c.passivePerception, 575, 660, 10, bold)

  // ── Ability Blocks ──
  // Save/skill values go in the blank line BEFORE the label text.
  // The circle (○) is at x~28 (left col) or x~190 (right col).
  // The blank line for the value is between the circle and the label.
  // Left column skills: value at x~38, right column skills: value at x~200
  // The label text starts at ~x 60 (left) or ~x 220 (right)

  const abilityLayout = {
    str: {
      modCx: 58, modY: 560, scoreX: 100, scoreY: 555,
      saveX: 38, saveY: 505,
      skillX: 38, skillStartY: 490, skillH: 14,
      skills: ['Athletics'],
    },
    dex: {
      modCx: 58, modY: 430, scoreX: 100, scoreY: 425,
      saveX: 38, saveY: 395,
      skillX: 38, skillStartY: 380, skillH: 14,
      skills: ['Acrobatics', 'Sleight of Hand', 'Stealth'],
    },
    con: {
      modCx: 58, modY: 290, scoreX: 100, scoreY: 285,
      saveX: 38, saveY: 252,
      skillX: 38, skillStartY: 0, skillH: 14,
      skills: [],
    },
    int: {
      modCx: 215, modY: 610, scoreX: 255, scoreY: 605,
      saveX: 200, saveY: 580,
      skillX: 200, skillStartY: 565, skillH: 14,
      skills: ['Arcana', 'History', 'Investigation', 'Nature', 'Religion'],
    },
    wis: {
      modCx: 215, modY: 460, scoreX: 255, scoreY: 455,
      saveX: 200, saveY: 400,
      skillX: 200, skillStartY: 385, skillH: 14,
      skills: ['Animal Handling', 'Insight', 'Medicine', 'Perception', 'Survival'],
    },
    cha: {
      modCx: 215, modY: 290, scoreX: 255, scoreY: 285,
      saveX: 200, saveY: 240,
      skillX: 200, skillStartY: 225, skillH: 14,
      skills: ['Deception', 'Intimidation', 'Performance', 'Persuasion'],
    },
  }

  for (const [k, lay] of Object.entries(abilityLayout)) {
    const ab = c.abilities?.[k]
    if (!ab) continue

    // Modifier centered in hex
    drawCentered(pg1, ab.display, lay.modCx, lay.modY, 14, bold)
    // Score
    draw(pg1, ab.score, lay.scoreX, lay.scoreY, 9, font)

    // Saving throw value (in the blank line area)
    const sv = c.savingThrows?.[k]
    if (sv) draw(pg1, sv.display, lay.saveX, lay.saveY, 7, sv.proficient ? bold : font)

    // Skills
    lay.skills.forEach((name, i) => {
      const sk = c.skills?.[name]
      if (!sk) return
      draw(pg1, sk.display, lay.skillX, lay.skillStartY - i * lay.skillH, 7, sk.proficient ? bold : font)
    })
  }

  // ── Weapons & Damage table ──
  // Name x~310, Atk Bonus x~435, Damage x~500, Notes x~570
  // First data row y~575, row height ~16
  if (c.weapons?.length) {
    c.weapons.slice(0, 8).forEach((w, i) => {
      const y = 575 - i * 16
      draw(pg1, w.name, 310, y, 7, font)
      draw(pg1, w.attackBonus, 435, y, 7, bold)
      draw(pg1, `${w.damage} ${w.type}`, 500, y, 7, font)
      if (w.range && w.range !== '5') draw(pg1, w.range, 570, y, 6, font)
    })
  }

  // ── Class Features (x~430, y~430, maxW ~160) ──
  const featText = (c.features || []).map(f => `${f.name}: ${f.description}`).join('\n')
  drawWrapped(pg1, featText, 430, 430, 160, 5.5, font, 25)

  // ── Species Traits (x~310, y~180, maxW ~150) ──
  const traitText = (c.traits || []).map(t => `${t.name}: ${t.description}`).join('\n')
  drawWrapped(pg1, traitText, 310, 178, 150, 5.5, font, 10)

  // ── Feats (x~500, y~180, maxW ~90) ──
  if (c.originFeat) draw(pg1, c.originFeat, 500, 178, 5.5, font)

  // ── Equipment Training & Proficiencies ──
  draw(pg1, (c.languages || []).join(', '), 38, 48, 6, font)

  // ═══════════════════════════════════════════
  // PAGE 2
  // ═══════════════════════════════════════════

  // ── Spellcasting ──
  if (c.spellcasting) {
    draw(pg2, c.spellcasting.ability.toUpperCase(), 38, 748, 7, font)
    draw(pg2, c.spellcasting.attackBonusDisplay, 38, 720, 10, bold)
    draw(pg2, c.spellcasting.saveDC, 38, 700, 10, bold)
    draw(pg2, c.spellcasting.attackBonusDisplay, 38, 665, 10, bold)
  }

  // ── Spell Slots (Total column) ──
  const slotPos = [
    { x: 198, y: 693 }, { x: 198, y: 678 }, { x: 198, y: 663 }, // Lv 1-3
    { x: 330, y: 693 }, { x: 330, y: 678 }, { x: 330, y: 663 }, // Lv 4-6
    { x: 470, y: 693 }, { x: 470, y: 678 }, { x: 470, y: 663 }, // Lv 7-9
  ]
  if (c.spellSlots?.length) {
    c.spellSlots.forEach((count, i) => {
      if (i < slotPos.length && count > 0) {
        draw(pg2, count, slotPos[i].x, slotPos[i].y, 8, bold)
      }
    })
  }

  // ── Cantrips & Prepared Spells ──
  if (c.spells?.length) {
    const sorted = [...c.spells].sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
    sorted.slice(0, 30).forEach((sp, i) => {
      const y = 600 - i * 18.3
      if (y < 25) return
      draw(pg2, sp.level ?? 0, 30, y, 6, font)
      draw(pg2, sp.name, 60, y, 6, font)
    })
  }

  // ── Right column (all boxes x~422, maxW ~168) ──

  // Backstory & Personality (start y~635, below header)
  const backstoryBlock = [
    c.personality ? `Traits: ${c.personality}` : '',
    c.ideals ? `Ideals: ${c.ideals}` : '',
    c.bonds ? `Bonds: ${c.bonds}` : '',
    c.flaws ? `Flaws: ${c.flaws}` : '',
    '',
    c.backstory || '',
  ].filter(Boolean).join('\n')
  drawWrapped(pg2, backstoryBlock, 422, 632, 168, 5.5, font, 30)

  // Alignment (y~490)
  draw(pg2, c.alignment, 422, 490, 7, font)

  // Languages (y~430)
  drawWrapped(pg2, (c.languages || []).join(', '), 422, 428, 168, 6, font, 4)

  // Equipment (y~358)
  drawWrapped(pg2, (c.equipment || []).join(', '), 422, 355, 168, 5.5, font, 12)

  // ── Portrait in APPEARANCE area (top-right page 2) ──
  // Box: x 422–588, y 660–750
  if (imageBase64) {
    try {
      const isPng = imageBase64.startsWith('data:image/png') || imageBase64.includes('iVBOR')
      const clean = imageBase64.replace(/^data:image\/\w+;base64,/, '')
      const imgBytes = Uint8Array.from(atob(clean), ch => ch.charCodeAt(0))
      const image = isPng ? await pdfDoc.embedPng(imgBytes) : await pdfDoc.embedJpg(imgBytes)
      const boxX = 422, boxY = 660, boxW = 166, boxH = 90
      const dims = image.scaleToFit(boxW, boxH)
      pg2.drawImage(image, {
        x: boxX + (boxW - dims.width) / 2,
        y: boxY + (boxH - dims.height) / 2,
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
