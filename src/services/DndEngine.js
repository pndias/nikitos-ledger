/**
 * Motor de regras D&D 2024 PHB (5.5e) — calcula todos os valores derivados.
 * Weapon data loaded from 5etools at runtime; static fallback for offline.
 */

import { getWeapon } from './Dnd5eData.js'

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
  'Wizard': 'int',
  'Cleric': 'wis', 'Druid': 'wis', 'Ranger': 'wis', 'Monk': 'wis',
  'Bard': 'cha', 'Paladin': 'cha', 'Sorcerer': 'cha', 'Warlock': 'cha',
}

const HIT_DIE = {
  'Barbarian': 12, 'Fighter': 10, 'Paladin': 10, 'Ranger': 10,
  'Bard': 8, 'Cleric': 8, 'Druid': 8, 'Monk': 8, 'Rogue': 8, 'Warlock': 8,
  'Sorcerer': 6, 'Wizard': 6,
}

// PHB 2024 spell slots by caster level (full casters)
const SPELL_SLOTS = [
  [],
  [2],[3],[4,2],[4,3],[4,3,2],[4,3,3],[4,3,3,1],[4,3,3,2],[4,3,3,3,1],[4,3,3,3,2],
  [4,3,3,3,2,1],[4,3,3,3,2,1],[4,3,3,3,2,1,1],[4,3,3,3,2,1,1],[4,3,3,3,2,1,1,1],
  [4,3,3,3,2,1,1,1],[4,3,3,3,2,1,1,1,1],[4,3,3,3,3,1,1,1,1],[4,3,3,3,3,2,1,1,1],[4,3,3,3,3,2,2,1,1],
]

// PHB 2024 Warlock Pact Magic: slots per level, slot level
const PACT_MAGIC = [
  null,
  { slots: 1, level: 1 }, { slots: 2, level: 1 },
  { slots: 2, level: 2 }, { slots: 2, level: 2 },
  { slots: 2, level: 3 }, { slots: 2, level: 3 },
  { slots: 2, level: 4 }, { slots: 2, level: 4 },
  { slots: 2, level: 5 }, { slots: 2, level: 5 },
  { slots: 3, level: 5 }, { slots: 3, level: 5 },
  { slots: 3, level: 5 }, { slots: 3, level: 5 },
  { slots: 3, level: 5 }, { slots: 3, level: 5 },
  { slots: 4, level: 5 }, { slots: 4, level: 5 },
  { slots: 4, level: 5 }, { slots: 4, level: 5 },
]

const FULL_CASTERS = ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Wizard']
const HALF_CASTERS = ['Paladin', 'Ranger']

export function mod(score) {
  return Math.floor((score - 10) / 2)
}

export function profBonus(level) {
  return Math.ceil(level / 4) + 1
}

export function fmtMod(val) {
  return val >= 0 ? `+${val}` : `${val}`
}

function computeSpellSlots(classes) {
  // Check for pure Warlock → Pact Magic
  const isOnlyWarlock = classes.length === 1 && classes[0].name === 'Warlock'
  if (isOnlyWarlock) {
    const pm = PACT_MAGIC[Math.min(classes[0].level, 20)]
    if (!pm) return []
    const slots = new Array(9).fill(0)
    slots[pm.level - 1] = pm.slots
    return slots
  }

  let casterLevel = 0
  for (const cl of classes) {
    if (cl.name === 'Warlock') continue // Warlock doesn't contribute to multiclass spell slots
    if (FULL_CASTERS.includes(cl.name)) casterLevel += cl.level
    else if (HALF_CASTERS.includes(cl.name)) casterLevel += Math.floor(cl.level / 2)
  }
  return SPELL_SLOTS[Math.min(casterLevel, 20)] || []
}

// Async weapon computation using 5etools data
async function computeWeaponAsync(w, abilities, prof) {
  const name = typeof w === 'string' ? w : w.name
  const data = await getWeapon(name)
  if (!data) return { name, attackBonus: fmtMod(prof), damage: '?', type: '?', range: '' }
  let abilityKey = data.ability
  if (data.finesse && abilities.dex.modifier > abilities.str.modifier) abilityKey = 'dex'
  if (data.thrown && !data.ranged && abilities.dex.modifier > abilities.str.modifier) abilityKey = 'dex'
  const atkMod = abilities[abilityKey].modifier + prof
  const dmgMod = abilities[abilityKey].modifier
  return {
    name: data.name,
    quantity: w.quantity || 1,
    attackBonus: fmtMod(atkMod),
    damage: `${data.die}${dmgMod >= 0 ? '+' : ''}${dmgMod}`,
    type: data.dmgTypeShort,
    range: data.range ? `${data.range}` : '5',
    properties: data.properties,
    abilityKey,
  }
}

// Sync fallback for weapons (used when 5etools data hasn't loaded)
const WEAPON_FALLBACK = {
  'Club': { die: '1d4', type: 'B', ability: 'str', finesse: false },
  'Dagger': { die: '1d4', type: 'P', ability: 'str', finesse: true },
  'Greataxe': { die: '1d12', type: 'S', ability: 'str', finesse: false },
  'Greatsword': { die: '2d6', type: 'S', ability: 'str', finesse: false },
  'Handaxe': { die: '1d6', type: 'S', ability: 'str', finesse: false },
  'Javelin': { die: '1d6', type: 'P', ability: 'str', finesse: false, range: '30/120' },
  'Light Crossbow': { die: '1d8', type: 'P', ability: 'dex', finesse: false, range: '80/320' },
  'Longbow': { die: '1d8', type: 'P', ability: 'dex', finesse: false, range: '150/600' },
  'Longsword': { die: '1d8', type: 'S', ability: 'str', finesse: false },
  'Mace': { die: '1d6', type: 'B', ability: 'str', finesse: false },
  'Quarterstaff': { die: '1d6', type: 'B', ability: 'str', finesse: false },
  'Rapier': { die: '1d8', type: 'P', ability: 'str', finesse: true },
  'Scimitar': { die: '1d6', type: 'S', ability: 'str', finesse: true },
  'Shortbow': { die: '1d6', type: 'P', ability: 'dex', finesse: false, range: '80/320' },
  'Shortsword': { die: '1d6', type: 'P', ability: 'str', finesse: true },
  'Spear': { die: '1d6', type: 'P', ability: 'str', finesse: false, range: '20/60' },
}

function computeWeaponsSync(rawWeapons, abilities, prof) {
  if (!rawWeapons?.length) return []
  return rawWeapons.slice(0, 5).map(w => {
    const name = typeof w === 'string' ? w : w.name
    const data = WEAPON_FALLBACK[name]
    if (!data) return { name, attackBonus: fmtMod(prof), damage: '?', type: '?', range: '' }
    let abilityKey = data.ability
    if (data.finesse && abilities.dex.modifier > abilities.str.modifier) abilityKey = 'dex'
    const atkMod = abilities[abilityKey].modifier + prof
    const dmgMod = abilities[abilityKey].modifier
    return {
      name, quantity: w.quantity || 1,
      attackBonus: fmtMod(atkMod),
      damage: `${data.die}${dmgMod >= 0 ? '+' : ''}${dmgMod}`,
      type: data.type, range: data.range || '5', abilityKey,
    }
  })
}

/**
 * computeCharacter — synchronous core computation.
 * Weapons use static fallback; call enrichWeapons() after for 5etools data.
 */
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

  // HP — PHB 2024: level 1 = max die + CON mod, subsequent = avg + 1 + CON mod
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
    spellcasting = {
      ability: spellAbility,
      saveDC: 8 + prof + sMod,
      attackBonus: prof + sMod,
      attackBonusDisplay: fmtMod(prof + sMod),
    }
  }

  const spellSlots = computeSpellSlots(classes)
  const weapons = computeWeaponsSync(c.weapons, abilities, prof)

  // Carrying capacity (PHB 2024: STR × 15)
  const carry = abilities.str.score * 15
  const lift = carry * 2

  const classDisplay = classes.map(cl => `${cl.name} ${cl.level}`).join(' / ')

  return {
    name: c.name || 'Unnamed', species: c.species || c.race || '', class: classDisplay, classes, level: totalLevel,
    background: c.background || '', alignment: c.alignment || '',
    originFeat: c.originFeat || '',
    size: c.size || 'M',
    abilities, savingThrows, skills,
    hp, hitDie: `${totalLevel}d${hitDie}`, ac, speed,
    armor: c.armor || 'Unarmored', shield: !!c.shield,
    initiative: { total: initiative, display: fmtMod(initiative) },
    proficiencyBonus: prof, proficiencyBonusDisplay: fmtMod(prof),
    passivePerception, spellcasting, spellSlots,
    weapons, carry, lift,
    languages: c.languages || [],
    traits: c.traits || [], features: c.features || [], equipment: c.equipment || [],
    spells: c.spells || [], backstory: c.backstory || '',
    personality: c.personality || '', ideals: c.ideals || '', bonds: c.bonds || '', flaws: c.flaws || '',
    dmNotes: c.dmNotes || '', roleplaying: c.roleplaying || null, crRating: c.crRating || '',
    theme: c.theme || null,
  }
}

/**
 * enrichWeapons — async post-processing to replace fallback weapon data with 5etools data.
 */
export async function enrichWeapons(charData) {
  if (!charData.weapons?.length) return charData
  const abilities = charData.abilities
  const prof = charData.proficiencyBonus
  const enriched = await Promise.all(
    charData.weapons.map(w => computeWeaponAsync(w, abilities, prof))
  )
  return { ...charData, weapons: enriched }
}
