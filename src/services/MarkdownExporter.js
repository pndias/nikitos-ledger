/**
 * Exporta personagem como Markdown compatível com Obsidian.
 * Usa YAML frontmatter com Properties para Dataview queries.
 */
import { fmtMod } from './DndEngine.js'

export function characterToMarkdown(c) {
  const lines = []

  // YAML frontmatter (Obsidian Properties)
  lines.push('---')
  lines.push(`name: "${c.name}"`)
  lines.push(`race: "${c.race}"`)
  lines.push(`class: "${c.class}"`)
  lines.push(`level: ${c.level}`)
  lines.push(`background: "${c.background}"`)
  lines.push(`alignment: "${c.alignment}"`)
  lines.push(`hp: ${c.hp}`)
  lines.push(`ac: ${c.ac}`)
  lines.push(`speed: ${c.speed}`)
  lines.push(`str: ${c.abilities.str.score}`)
  lines.push(`dex: ${c.abilities.dex.score}`)
  lines.push(`con: ${c.abilities.con.score}`)
  lines.push(`int: ${c.abilities.int.score}`)
  lines.push(`wis: ${c.abilities.wis.score}`)
  lines.push(`cha: ${c.abilities.cha.score}`)
  if (c.type) lines.push(`type: "${c.type}"`)
  if (c.crRating) lines.push(`cr: "${c.crRating}"`)
  lines.push('tags: [dnd, character]')
  lines.push('---')
  lines.push('')

  // Header
  lines.push(`# ${c.name}`)
  lines.push(`*${c.race} · ${c.class} · Nível ${c.level} · ${c.alignment}*`)
  lines.push('')

  // Abilities table
  lines.push('## Atributos')
  lines.push('| STR | DEX | CON | INT | WIS | CHA |')
  lines.push('|-----|-----|-----|-----|-----|-----|')
  const abs = ['str', 'dex', 'con', 'int', 'wis', 'cha']
  lines.push('| ' + abs.map(k => `${c.abilities[k].score} (${c.abilities[k].display})`).join(' | ') + ' |')
  lines.push('')

  // Combat
  lines.push('## Combate')
  lines.push(`- **HP:** ${c.hp}`)
  lines.push(`- **AC:** ${c.ac} (${c.armor || 'Unarmored'}${c.shield ? ' + Shield' : ''})`)
  lines.push(`- **Speed:** ${c.speed}ft`)
  lines.push(`- **Initiative:** ${c.initiative?.display}`)
  lines.push(`- **Prof. Bonus:** ${c.proficiencyBonusDisplay}`)
  lines.push(`- **Passive Perception:** ${c.passivePerception}`)
  lines.push('')

  // Weapons
  if (c.weapons?.length) {
    lines.push('## Armas')
    for (const w of c.weapons) {
      lines.push(`- **${w.name}:** ${w.attackBonus} to hit, ${w.damage} ${w.type}${w.range !== '5' ? ` (${w.range})` : ''}`)
    }
    lines.push('')
  }

  // Saving throws
  lines.push('## Saving Throws')
  const saves = abs.map(k => {
    const sv = c.savingThrows[k]
    return `${k.toUpperCase()} ${sv.display}${sv.proficient ? ' ●' : ''}`
  })
  lines.push(saves.join(' · '))
  lines.push('')

  // Skills (proficient only)
  const profSkills = Object.entries(c.skills).filter(([, sk]) => sk.proficient)
  if (profSkills.length) {
    lines.push('## Perícias')
    for (const [name, sk] of profSkills) lines.push(`- **${name}:** ${sk.display}`)
    lines.push('')
  }

  // Features
  if (c.features?.length) {
    lines.push('## Habilidades')
    for (const f of c.features) lines.push(`- **${f.name}:** ${f.description}`)
    lines.push('')
  }

  // Spells
  if (c.spells?.length) {
    lines.push('## Magias')
    if (c.spellcasting) {
      lines.push(`*Spell DC ${c.spellcasting.saveDC} · Spell Atk ${c.spellcasting.attackBonusDisplay} · ${c.spellcasting.ability.toUpperCase()}*`)
    }
    const byLevel = {}
    for (const sp of c.spells) {
      const lv = sp.level ?? 0
      if (!byLevel[lv]) byLevel[lv] = []
      byLevel[lv].push(sp.name)
    }
    for (const [lv, names] of Object.entries(byLevel).sort((a, b) => a[0] - b[0])) {
      const label = lv === '0' ? 'Cantrips' : `${lv}º Nível${c.spellSlots?.[lv - 1] ? ` (${c.spellSlots[lv - 1]} slots)` : ''}`
      lines.push(`### ${label}`)
      lines.push(names.map(n => `- ${n}`).join('\n'))
    }
    lines.push('')
  }

  // Equipment
  if (c.equipment?.length) {
    lines.push('## Equipamento')
    for (const eq of c.equipment) lines.push(`- ${eq}`)
    lines.push('')
  }

  // Languages
  if (c.languages?.length) {
    lines.push('## Idiomas')
    lines.push(c.languages.join(', '))
    lines.push('')
  }

  // Personality
  if (c.personality || c.ideals || c.bonds || c.flaws) {
    lines.push('## Personalidade')
    if (c.personality) lines.push(`- **Traços:** ${c.personality}`)
    if (c.ideals) lines.push(`- **Ideais:** ${c.ideals}`)
    if (c.bonds) lines.push(`- **Vínculos:** ${c.bonds}`)
    if (c.flaws) lines.push(`- **Fraquezas:** ${c.flaws}`)
    lines.push('')
  }

  // NPC sections
  if (c.roleplaying) {
    lines.push('## 🎭 Interpretação (DM)')
    if (c.roleplaying.voice) lines.push(`- **Voz:** ${c.roleplaying.voice}`)
    if (c.roleplaying.mannerisms) lines.push(`- **Maneirismos:** ${c.roleplaying.mannerisms}`)
    if (c.roleplaying.ideals) lines.push(`- **Ideais:** ${c.roleplaying.ideals}`)
    if (c.roleplaying.bonds) lines.push(`- **Vínculos:** ${c.roleplaying.bonds}`)
    if (c.roleplaying.flaws) lines.push(`- **Fraquezas:** ${c.roleplaying.flaws}`)
    lines.push('')
  }
  if (c.dmNotes) {
    lines.push('## 🔒 Notas do Mestre')
    lines.push(c.dmNotes)
    lines.push('')
  }

  // Backstory
  if (c.backstory) {
    lines.push('## Backstory')
    lines.push(c.backstory)
    lines.push('')
  }

  return lines.join('\n')
}

export function downloadMarkdown(c) {
  const md = characterToMarkdown(c)
  const blob = new Blob([md], { type: 'text/markdown' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${c.name || 'character'}.md`
  link.click()
  URL.revokeObjectURL(link.href)
}
