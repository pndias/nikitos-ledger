/**
 * Dnd5eData — fetches PHB 2024 (XPHB) data from 5etools GitHub mirror.
 * Caches everything in memory. All data is filtered to source=XPHB.
 */

const MIRROR = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/master/data'
const cache = new Map()

async function fetchJson(path) {
  if (cache.has(path)) return cache.get(path)
  const res = await fetch(`${MIRROR}${path}`)
  if (!res.ok) return null
  const data = await res.json()
  cache.set(path, data)
  return data
}

// ── School code → name ──
const SCHOOL_MAP = { A: 'Abjuration', C: 'Conjuration', D: 'Divination', E: 'Enchantment', I: 'Illusion', N: 'Necromancy', T: 'Transmutation', V: 'Evocation' }

function formatDuration(dur) {
  if (!dur?.length) return ''
  const d = dur[0]
  if (d.type === 'instant') return 'Instantaneous'
  if (d.type === 'permanent') return 'Until dispelled'
  if (d.type === 'special') return 'Special'
  const t = d.duration
  if (!t) return ''
  const conc = d.concentration ? 'Concentration, up to ' : ''
  return `${conc}${t.amount} ${t.type}${t.amount > 1 ? 's' : ''}`
}

function formatRange(range) {
  if (!range) return ''
  if (range.type === 'point') {
    const d = range.distance
    if (d.type === 'self') return 'Self'
    if (d.type === 'touch') return 'Touch'
    if (d.type === 'sight') return 'Sight'
    if (d.type === 'unlimited') return 'Unlimited'
    return `${d.amount} ${d.type}`
  }
  return range.type
}

function formatTime(time) {
  if (!time?.length) return ''
  const t = time[0]
  return `${t.number} ${t.unit}${t.number > 1 ? 's' : ''}`
}

function stripTags(text) {
  if (!text) return ''
  return String(text)
    .replace(/\{@\w+\s+([^|}]+?)(?:\|[^}]*)?\}/g, '$1')
    .replace(/\{@\w+\s+([^}]+)\}/g, '$1')
}

// ── Spells ──

let _spellsPromise = null
let _spellSourcesPromise = null

async function loadSpells() {
  if (!_spellsPromise) {
    _spellsPromise = fetchJson('/spells/spells-xphb.json').then(d => {
      const map = new Map()
      for (const s of d?.spell || []) map.set(s.name.toLowerCase(), s)
      return map
    })
  }
  return _spellsPromise
}

async function loadSpellSources() {
  if (!_spellSourcesPromise) {
    _spellSourcesPromise = fetchJson('/spells/sources.json').then(d => d?.XPHB || {})
  }
  return _spellSourcesPromise
}

export async function getSpell(name) {
  const spells = await loadSpells()
  const raw = spells.get(name.toLowerCase())
  if (!raw) return null
  const comps = raw.components || {}
  return {
    name: raw.name,
    level: raw.level,
    school: SCHOOL_MAP[raw.school] || raw.school,
    castingTime: formatTime(raw.time),
    range: formatRange(raw.range),
    duration: formatDuration(raw.duration),
    concentration: !!raw.duration?.[0]?.concentration,
    ritual: !!raw.meta?.ritual,
    components: [comps.v && 'V', comps.s && 'S', comps.m && 'M'].filter(Boolean),
    description: stripTags(raw.entries?.[0] || ''),
  }
}

export async function validateSpells(spells) {
  if (!spells?.length) return []
  const results = await Promise.allSettled(
    spells.map(async (s) => {
      const name = typeof s === 'string' ? s : s.name
      const data = await getSpell(name)
      if (!data) return { name, level: typeof s === 'string' ? 0 : (s.level ?? 0), valid: false }
      return { ...data, valid: true }
    })
  )
  return results.map(r => r.status === 'fulfilled' ? r.value : { name: '?', level: 0, valid: false })
}

export async function getClassSpells(className) {
  const sources = await loadSpellSources()
  const result = []
  for (const [name, info] of Object.entries(sources)) {
    const classes = info.class || []
    if (classes.some(c => c.source === 'XPHB' && c.name.toLowerCase() === className.toLowerCase())) {
      result.push(name)
    }
  }
  return result
}

// ── Species ──

let _speciesPromise = null

async function loadSpecies() {
  if (!_speciesPromise) {
    _speciesPromise = fetchJson('/races.json').then(d => {
      const map = new Map()
      for (const r of d?.race || []) {
        if (r.source === 'XPHB') map.set(r.name.toLowerCase(), r)
      }
      return map
    })
  }
  return _speciesPromise
}

export async function getSpecies(name) {
  const species = await loadSpecies()
  const raw = species.get(name.toLowerCase())
  if (!raw) return null
  return {
    name: raw.name,
    size: raw.size,
    speed: typeof raw.speed === 'number' ? raw.speed : raw.speed?.walk ?? 30,
    darkvision: raw.darkvision || 0,
    resist: raw.resist || [],
    traits: (raw.entries || []).filter(e => e.type === 'entries').map(e => ({
      name: stripTags(e.name || ''),
      description: stripTags((e.entries || []).join(' ')),
    })),
  }
}

export async function listSpecies() {
  const species = await loadSpecies()
  return [...species.values()].map(r => r.name)
}

// ── Backgrounds ──

let _backgroundsPromise = null

async function loadBackgrounds() {
  if (!_backgroundsPromise) {
    _backgroundsPromise = fetchJson('/backgrounds.json').then(d => {
      const map = new Map()
      for (const b of d?.background || []) {
        if (b.source === 'XPHB') map.set(b.name.toLowerCase(), b)
      }
      return map
    })
  }
  return _backgroundsPromise
}

export async function getBackground(name) {
  const bgs = await loadBackgrounds()
  const raw = bgs.get(name.toLowerCase())
  if (!raw) return null
  const skills = Object.keys(raw.skillProficiencies?.[0] || {})
  const tools = Object.keys(raw.toolProficiencies?.[0] || {})
  const feat = Object.keys(raw.feats?.[0] || {})[0]?.split('|')[0] || ''
  const abilityScores = raw.ability?.[0]?.choose?.weighted?.from || []
  return {
    name: raw.name,
    skills,
    tools,
    feat: stripTags(feat),
    abilityScores,
  }
}

export async function listBackgrounds() {
  const bgs = await loadBackgrounds()
  return [...bgs.values()].map(b => b.name)
}

// ── Weapons (from items-base.json) ──

const PROP_MAP = { 'F': 'finesse', 'L': 'light', 'T': 'thrown', 'V': 'versatile', 'H': 'heavy', '2H': 'two-handed', 'R': 'reach', 'A': 'ammunition', 'LD': 'loading' }
const DMG_TYPE = { S: 'Slashing', P: 'Piercing', B: 'Bludgeoning' }

let _weaponsPromise = null

async function loadWeapons() {
  if (!_weaponsPromise) {
    _weaponsPromise = fetchJson('/items-base.json').then(d => {
      const map = new Map()
      for (const item of d?.baseitem || []) {
        if (item.source === 'XPHB' && item.weaponCategory) {
          const props = (item.property || []).map(p => {
            const code = typeof p === 'string' ? p.split('|')[0] : p.uid?.split('|')[0] || ''
            return PROP_MAP[code] || code
          }).filter(Boolean)
          map.set(item.name.toLowerCase(), {
            name: item.name,
            die: item.dmg1 || '0',
            dmgType: DMG_TYPE[item.dmgType] || item.dmgType || '?',
            dmgTypeShort: item.dmgType || '?',
            category: item.weaponCategory,
            properties: props,
            finesse: props.includes('finesse'),
            thrown: props.includes('thrown'),
            ranged: item.type?.startsWith('R'),
            range: item.range || null,
            ability: item.type?.startsWith('R') ? 'dex' : 'str',
          })
        }
      }
      return map
    })
  }
  return _weaponsPromise
}

export async function getWeapon(name) {
  const weapons = await loadWeapons()
  return weapons.get(name.toLowerCase()) || null
}

export async function listWeapons() {
  const weapons = await loadWeapons()
  return [...weapons.values()]
}

// ── Feats ──

let _featsPromise = null

async function loadFeats() {
  if (!_featsPromise) {
    _featsPromise = fetchJson('/feats.json').then(d => {
      const map = new Map()
      for (const f of d?.feat || []) {
        if (f.source === 'XPHB') map.set(f.name.toLowerCase(), f)
      }
      return map
    })
  }
  return _featsPromise
}

export async function getFeat(name) {
  const feats = await loadFeats()
  const raw = feats.get(name.toLowerCase())
  if (!raw) return null
  return {
    name: raw.name,
    category: raw.category,
    description: stripTags((raw.entries || []).flatMap(e => typeof e === 'string' ? [e] : e.entries || []).join(' ')),
  }
}

export async function listOriginFeats() {
  const feats = await loadFeats()
  return [...feats.values()].filter(f => f.category === 'O').map(f => f.name)
}
