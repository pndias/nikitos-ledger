/**
 * CharacterParser — converte o JSON retornado pela LLM para o formato interno.
 */

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha']

function modifier(score) {
  return Math.floor((score - 10) / 2)
}

function formatModifier(score) {
  const mod = modifier(score)
  return mod >= 0 ? `+${mod}` : `${mod}`
}

/** Gera um hash numérico simples a partir do nome para variações visuais determinísticas. */
function nameHash(name) {
  let h = 0
  for (const ch of name) h = ((h << 5) - h + ch.charCodeAt(0)) | 0
  return Math.abs(h)
}

export function parseCharacter(raw) {
  const c = typeof raw === 'string' ? JSON.parse(raw) : raw

  const abilities = {}
  for (const k of ABILITY_KEYS) {
    const score = c.abilities?.[k] ?? c[k] ?? 10
    abilities[k] = { score, modifier: modifier(score), display: formatModifier(score) }
  }

  const name = c.name ?? 'Unnamed'
  const hash = nameHash(name)

  // Theme — vindo da LLM ou gerado por fallback
  const defaultAccent = `hsl(${hash % 360}, 40%, 35%)`
  const theme = {
    accentColor: c.theme?.accentColor ?? defaultAccent,
    symbol: c.theme?.symbol ?? '⚔',
    borderStyle: hash % 3, // 0=solid, 1=double, 2=dashed — variação visual
    ornamentRotation: (hash % 20) - 10, // -10 a +10 graus
  }

  return {
    name,
    race: c.race ?? '',
    class: Array.isArray(c.class) ? c.class.map(cl => `${cl.name} ${cl.level}`).join(' / ') : (c.class ?? ''),
    level: c.level ?? 1,
    background: c.background ?? '',
    alignment: c.alignment ?? '',
    abilities,
    hp: c.hp ?? c.hitPoints ?? 0,
    ac: c.ac ?? c.armorClass ?? 10,
    speed: c.speed ?? 30,
    proficiencyBonus: c.proficiencyBonus ?? 2,
    skills: c.skills ?? [],
    savingThrows: c.savingThrows ?? [],
    traits: c.traits ?? [],
    features: c.features ?? [],
    equipment: c.equipment ?? [],
    spells: c.spells ?? [],
    backstory: c.backstory ?? '',
    theme,
    // NPC-specific fields
    dmNotes: c.dmNotes ?? '',
    roleplaying: c.roleplaying ?? null,
    crRating: c.crRating ?? '',
  }
}
