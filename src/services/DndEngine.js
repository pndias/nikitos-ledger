/**
 * Motor de regras D&D 5.5 — calcula todos os valores derivados.
 */

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha']

const SKILL_MAP = {
  'Acrobatics': 'dex', 'Animal Handling': 'wis', 'Arcana': 'int',
  'Athletics': 'str', 'Deception': 'cha', 'History': 'int',
  'Insight': 'wis', 'Intimidation': 'cha', 'Investigation': 'int',
  'Medicine': 'wis', 'Nature': 'int', 'Perception': 'wis',
  'Performance': 'cha', 'Persuasion': 'cha', 'Religion': 'int',
  'Sleight of Hand': 'dex', 'Stealth': 'dex', 'Survival': 'wis',
}

const SPELLCASTING_ABILITY = {
  'Wizard': 'int', 'Artificer': 'int',
  'Cleric': 'wis', 'Druid': 'wis', 'Ranger': 'wis', 'Monk': 'wis',
  'Bard': 'cha', 'Paladin': 'cha', 'Sorcerer': 'cha', 'Warlock': 'cha',
}

const HIT_DIE = {
  'Barbarian': 12, 'Fighter': 10, 'Paladin': 10, 'Ranger': 10,
  'Bard': 8, 'Cleric': 8, 'Druid': 8, 'Monk': 8, 'Rogue': 8, 'Warlock': 8,
  'Sorcerer': 6, 'Wizard': 6, 'Artificer': 8,
}

export function mod(score) {
  return Math.floor((score - 10) / 2)
}

export function profBonus(level) {
  return Math.ceil(level / 4) + 1
}

export function fmtMod(val) {
  return val >= 0 ? `+${val}` : `${val}`
}

export function computeCharacter(raw) {
  const c = typeof raw === 'string' ? JSON.parse(raw) : { ...raw }

  const classes = Array.isArray(c.class)
    ? c.class.map(cl => typeof cl === 'string' ? { name: cl, level: c.level || 1 } : cl)
    : [{ name: c.class || 'Fighter', level: c.level || 1 }]

  const totalLevel = classes.reduce((sum, cl) => sum + (cl.level || 1), 0)
  const primaryClass = classes[0]?.name || 'Fighter'
  const prof = c.proficiencyBonus || profBonus(totalLevel)

  // Abilities
  const abilities = {}
  for (const k of ABILITY_KEYS) {
    const score = c.abilities?.[k] ?? c[k] ?? 10
    const m = mod(score)
    abilities[k] = { score, modifier: m, display: fmtMod(m) }
  }

  // Saving throws
  const profSaves = (c.savingThrows || []).map(s => s.toLowerCase().slice(0, 3))
  const savingThrows = {}
  for (const k of ABILITY_KEYS) {
    const isProficient = profSaves.includes(k)
    const total = abilities[k].modifier + (isProficient ? prof : 0)
    savingThrows[k] = { total, display: fmtMod(total), proficient: isProficient }
  }

  // Skills
  const profSkills = (c.skills || []).map(s => s.toLowerCase())
  const skills = {}
  for (const [name, ability] of Object.entries(SKILL_MAP)) {
    const isProficient = profSkills.some(s => name.toLowerCase().includes(s) || s.includes(name.toLowerCase()))
    const total = abilities[ability].modifier + (isProficient ? prof : 0)
    skills[name] = { ability, total, display: fmtMod(total), proficient: isProficient }
  }

  const initiative = abilities.dex.modifier
  const passivePerception = 10 + (skills['Perception']?.total ?? abilities.wis.modifier)

  // HP
  const hitDie = HIT_DIE[primaryClass] || 8
  const conMod = abilities.con.modifier
  let hp = c.hp || c.hitPoints
  if (!hp || hp <= 0) {
    hp = Math.max(1, hitDie + conMod + (totalLevel - 1) * (Math.floor(hitDie / 2) + 1 + conMod))
  }

  const ac = c.ac || c.armorClass || (10 + abilities.dex.modifier)
  const speed = c.speed || 30

  // Spellcasting
  const spellAbility = SPELLCASTING_ABILITY[primaryClass] || null
  let spellcasting = null
  if (spellAbility) {
    const sMod = abilities[spellAbility].modifier
    spellcasting = { ability: spellAbility, saveDC: 8 + prof + sMod, attackBonus: prof + sMod, attackBonusDisplay: fmtMod(prof + sMod) }
  }

  const classDisplay = classes.map(cl => `${cl.name} ${cl.level}`).join(' / ')

  return {
    name: c.name || 'Unnamed', race: c.race || '', class: classDisplay, classes, level: totalLevel,
    background: c.background || '', alignment: c.alignment || '',
    abilities, savingThrows, skills,
    hp, hitDie: `${totalLevel}d${hitDie}`, ac, speed,
    initiative: { total: initiative, display: fmtMod(initiative) },
    proficiencyBonus: prof, proficiencyBonusDisplay: fmtMod(prof),
    passivePerception, spellcasting,
    traits: c.traits || [], features: c.features || [], equipment: c.equipment || [],
    spells: c.spells || [], backstory: c.backstory || '',
    dmNotes: c.dmNotes || '', roleplaying: c.roleplaying || null, crRating: c.crRating || '',
    theme: c.theme || null,
  }
}
