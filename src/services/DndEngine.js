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

// Spell slots by caster level (full casters)
const SPELL_SLOTS = [
  //        1  2  3  4  5  6  7  8  9
  /* 0 */ [],
  /* 1 */ [2],
  /* 2 */ [3],
  /* 3 */ [4,2],
  /* 4 */ [4,3],
  /* 5 */ [4,3,2],
  /* 6 */ [4,3,3],
  /* 7 */ [4,3,3,1],
  /* 8 */ [4,3,3,2],
  /* 9 */ [4,3,3,3,1],
  /*10 */ [4,3,3,3,2],
  /*11 */ [4,3,3,3,2,1],
  /*12 */ [4,3,3,3,2,1],
  /*13 */ [4,3,3,3,2,1,1],
  /*14 */ [4,3,3,3,2,1,1],
  /*15 */ [4,3,3,3,2,1,1,1],
  /*16 */ [4,3,3,3,2,1,1,1],
  /*17 */ [4,3,3,3,2,1,1,1,1],
  /*18 */ [4,3,3,3,3,1,1,1,1],
  /*19 */ [4,3,3,3,3,2,1,1,1],
  /*20 */ [4,3,3,3,3,2,2,1,1],
]

const FULL_CASTERS = ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Wizard']
const HALF_CASTERS = ['Paladin', 'Ranger', 'Artificer']

// Weapon data for attack/damage calculation
const WEAPON_DATA = {
  'Club': { die: '1d4', type: 'B', ability: 'str', finesse: false },
  'Dagger': { die: '1d4', type: 'P', ability: 'str', finesse: true },
  'Greatclub': { die: '1d8', type: 'B', ability: 'str', finesse: false },
  'Handaxe': { die: '1d6', type: 'S', ability: 'str', finesse: false },
  'Javelin': { die: '1d6', type: 'P', ability: 'str', finesse: false, range: '30/120' },
  'Light Hammer': { die: '1d4', type: 'B', ability: 'str', finesse: false },
  'Mace': { die: '1d6', type: 'B', ability: 'str', finesse: false },
  'Quarterstaff': { die: '1d6', type: 'B', ability: 'str', finesse: false },
  'Sickle': { die: '1d4', type: 'S', ability: 'str', finesse: false },
  'Spear': { die: '1d6', type: 'P', ability: 'str', finesse: false, range: '20/60' },
  'Dart': { die: '1d4', type: 'P', ability: 'dex', finesse: true, range: '20/60' },
  'Light Crossbow': { die: '1d8', type: 'P', ability: 'dex', finesse: false, range: '80/320' },
  'Shortbow': { die: '1d6', type: 'P', ability: 'dex', finesse: false, range: '80/320' },
  'Sling': { die: '1d4', type: 'B', ability: 'dex', finesse: false, range: '30/120' },
  'Battleaxe': { die: '1d8', type: 'S', ability: 'str', finesse: false },
  'Flail': { die: '1d8', type: 'B', ability: 'str', finesse: false },
  'Glaive': { die: '1d10', type: 'S', ability: 'str', finesse: false },
  'Greataxe': { die: '1d12', type: 'S', ability: 'str', finesse: false },
  'Greatsword': { die: '2d6', type: 'S', ability: 'str', finesse: false },
  'Halberd': { die: '1d10', type: 'S', ability: 'str', finesse: false },
  'Lance': { die: '1d10', type: 'P', ability: 'str', finesse: false },
  'Longsword': { die: '1d8', type: 'S', ability: 'str', finesse: false },
  'Maul': { die: '2d6', type: 'B', ability: 'str', finesse: false },
  'Morningstar': { die: '1d8', type: 'P', ability: 'str', finesse: false },
  'Pike': { die: '1d10', type: 'P', ability: 'str', finesse: false },
  'Rapier': { die: '1d8', type: 'P', ability: 'str', finesse: true },
  'Scimitar': { die: '1d6', type: 'S', ability: 'str', finesse: true },
  'Shortsword': { die: '1d6', type: 'P', ability: 'str', finesse: true },
  'Trident': { die: '1d8', type: 'P', ability: 'str', finesse: false, range: '20/60' },
  'Warhammer': { die: '1d8', type: 'B', ability: 'str', finesse: false },
  'War Pick': { die: '1d8', type: 'P', ability: 'str', finesse: false },
  'Whip': { die: '1d4', type: 'S', ability: 'str', finesse: true },
  'Blowgun': { die: '1', type: 'P', ability: 'dex', finesse: false, range: '25/100' },
  'Hand Crossbow': { die: '1d6', type: 'P', ability: 'dex', finesse: false, range: '30/120' },
  'Heavy Crossbow': { die: '1d10', type: 'P', ability: 'dex', finesse: false, range: '100/400' },
  'Longbow': { die: '1d8', type: 'P', ability: 'dex', finesse: false, range: '150/600' },
  'Musket': { die: '1d12', type: 'P', ability: 'dex', finesse: false, range: '40/120' },
  'Pistol': { die: '1d10', type: 'P', ability: 'dex', finesse: false, range: '30/90' },
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

function computeSpellSlots(classes) {
  let casterLevel = 0
  for (const cl of classes) {
    if (FULL_CASTERS.includes(cl.name)) casterLevel += cl.level
    else if (HALF_CASTERS.includes(cl.name)) casterLevel += Math.floor(cl.level / 2)
  }
  return SPELL_SLOTS[Math.min(casterLevel, 20)] || []
}

function computeWeapons(rawWeapons, abilities, prof) {
  if (!rawWeapons?.length) return []
  return rawWeapons.slice(0, 5).map(w => {
    const name = typeof w === 'string' ? w : w.name
    const data = WEAPON_DATA[name]
    if (!data) return { name, attackBonus: fmtMod(prof), damage: '?', type: '?', range: '' }
    // For finesse weapons, use the better of STR/DEX
    let abilityKey = data.ability
    if (data.finesse && abilities.dex.modifier > abilities.str.modifier) abilityKey = 'dex'
    const atkMod = abilities[abilityKey].modifier + prof
    const dmgMod = abilities[abilityKey].modifier
    return {
      name,
      quantity: w.quantity || 1,
      attackBonus: fmtMod(atkMod),
      damage: `${data.die}${dmgMod >= 0 ? '+' : ''}${dmgMod}`,
      type: data.type,
      range: data.range || '5',
      abilityKey,
    }
  })
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
    spellcasting = {
      ability: spellAbility,
      saveDC: 8 + prof + sMod,
      attackBonus: prof + sMod,
      attackBonusDisplay: fmtMod(prof + sMod),
    }
  }

  // Spell slots
  const spellSlots = computeSpellSlots(classes)

  // Weapons with computed attacks
  const weapons = computeWeapons(c.weapons, abilities, prof)

  // Carrying capacity
  const carry = abilities.str.score * 15
  const lift = carry * 2

  const classDisplay = classes.map(cl => `${cl.name} ${cl.level}`).join(' / ')

  return {
    name: c.name || 'Unnamed', race: c.race || '', class: classDisplay, classes, level: totalLevel,
    background: c.background || '', alignment: c.alignment || '',
    size: c.size || 'M',
    abilities, savingThrows, skills,
    hp, hitDie: `${totalLevel}d${hitDie}`, ac, speed,
    armor: c.armor || 'Unarmored', shield: !!c.shield,
    initiative: { total: initiative, display: fmtMod(initiative) },
    proficiencyBonus: prof, proficiencyBonusDisplay: fmtMod(prof),
    passivePerception, spellcasting, spellSlots,
    weapons,
    carry, lift,
    languages: c.languages || [],
    traits: c.traits || [], features: c.features || [], equipment: c.equipment || [],
    spells: c.spells || [], backstory: c.backstory || '',
    personality: c.personality || '', ideals: c.ideals || '', bonds: c.bonds || '', flaws: c.flaws || '',
    dmNotes: c.dmNotes || '', roleplaying: c.roleplaying || null, crRating: c.crRating || '',
    theme: c.theme || null,
  }
}
