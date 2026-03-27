/**
 * Parseia Markdown estruturado de personagem (colado de outras IAs) para JSON.
 * Aceita formatos comuns: headers com stats, listas de skills, etc.
 */
import { marked } from 'marked'

export function parseMarkdownCharacter(md) {
  const html = marked.parse(md)
  const text = md.trim()

  const extract = (pattern, fallback = '') => {
    const m = text.match(pattern)
    return m ? m[1].trim() : fallback
  }

  const extractList = (sectionName) => {
    const re = new RegExp(`(?:^|\\n)#+\\s*${sectionName}[\\s\\S]*?\\n([\\s\\S]*?)(?=\\n#|$)`, 'i')
    const m = text.match(re)
    if (!m) return []
    return m[1].split('\n').map(l => l.replace(/^[-*•]\s*/, '').trim()).filter(Boolean)
  }

  const name = extract(/^#\s+(.+)/m, extract(/(?:name|nome)[:\s]+(.+)/i, 'Unnamed'))
  const race = extract(/(?:race|raça)[:\s]+(.+)/i)
  const charClass = extract(/(?:class|classe)[:\s]+(.+)/i)
  const level = parseInt(extract(/(?:level|nível|nivel)[:\s]+(\d+)/i, '1'))
  const background = extract(/(?:background|antecedente)[:\s]+(.+)/i)
  const alignment = extract(/(?:alignment|alinhamento)[:\s]+(.+)/i)

  const abilities = {}
  for (const ab of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
    const patterns = [
      new RegExp(`${ab}[:\\s]+(\\d+)`, 'i'),
      new RegExp(`(?:strength|dexterity|constitution|intelligence|wisdom|charisma)`.replace(
        /strength|dexterity|constitution|intelligence|wisdom|charisma/,
        { str: 'strength', dex: 'dexterity', con: 'constitution', int: 'intelligence', wis: 'wisdom', cha: 'charisma' }[ab]
      ) + `[:\\s]+(\\d+)`, 'i'),
    ]
    for (const p of patterns) {
      const m = text.match(p)
      if (m) { abilities[ab] = parseInt(m[1]); break }
    }
    if (!abilities[ab]) abilities[ab] = 10
  }

  const hp = parseInt(extract(/(?:hp|hit points|pontos de vida)[:\s]+(\d+)/i, '0'))
  const ac = parseInt(extract(/(?:ac|armor class|classe de armadura)[:\s]+(\d+)/i, '10'))
  const speed = parseInt(extract(/(?:speed|velocidade)[:\s]+(\d+)/i, '30'))

  const skills = extractList('skills|perícias|pericias')
  const equipment = extractList('equipment|equipamento')
  const backstory = extract(/(?:backstory|história|historia|background story)[:\s]*\n?([\s\S]+?)(?=\n#|$)/i)

  return {
    name, race, class: charClass, level, background, alignment,
    abilities, hp, ac, speed,
    proficiencyBonus: Math.ceil(level / 4) + 1,
    skills, savingThrows: [],
    traits: [], features: extractList('features|habilidades|traços').map(f => ({ name: f, description: '' })),
    equipment,
    spells: extractList('spells|magias').map(s => ({ name: s, level: 0 })),
    backstory,
  }
}

/**
 * Detecta se o input é Markdown estruturado (tem headers ou listas formatadas).
 */
export function isStructuredMarkdown(text) {
  return /^#{1,3}\s+.+/m.test(text) && /(str|dex|con|int|wis|cha|race|class|level)/i.test(text)
}
