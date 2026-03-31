/**
 * Dnd5eApi — valida e enriquece dados usando a API pública dnd5eapi.co (SRD).
 * Sem autenticação, sem limites rígidos, totalmente gratuita.
 * Usa o SRD 2024 (D&D 5.5).
 */

const BASE = 'https://www.dnd5eapi.co/api'
const cache = new Map()

async function fetchJson(path) {
  if (cache.has(path)) return cache.get(path)
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) return null
  const data = await res.json()
  cache.set(path, data)
  return data
}

function toIndex(name) {
  return name.toLowerCase().replace(/['']/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

/** Busca dados completos de uma spell pelo nome. */
export async function getSpell(name) {
  return fetchJson(`/spells/${toIndex(name)}`)
}

/** Valida lista de spells, retorna apenas as que existem no SRD com dados enriquecidos. */
export async function validateSpells(spells) {
  if (!spells?.length) return []
  const results = await Promise.allSettled(
    spells.map(async (s) => {
      const name = typeof s === 'string' ? s : s.name
      const level = typeof s === 'string' ? 0 : (s.level ?? 0)
      const data = await getSpell(name)
      if (!data) return { name, level, valid: false }
      return {
        name: data.name,
        level: data.level,
        school: data.school?.name,
        castingTime: data.casting_time,
        range: data.range,
        duration: data.duration,
        concentration: data.concentration,
        components: data.components,
        description: data.desc?.[0] || '',
        valid: true,
      }
    })
  )
  return results.map(r => r.status === 'fulfilled' ? r.value : { ...r.reason, valid: false })
}

/** Busca lista de spells disponíveis para uma classe. */
export async function getClassSpells(className) {
  const data = await fetchJson(`/classes/${toIndex(className)}/spells`)
  return data?.results?.map(s => s.name) || []
}

/** Busca dados de equipamento pelo nome. */
export async function getEquipment(name) {
  return fetchJson(`/equipment/${toIndex(name)}`)
}
