/**
 * CharacterParser — normaliza JSON da LLM e calcula valores derivados.
 * Enriquece armas com dados do 5etools (async).
 */
import { computeCharacter, enrichWeapons } from './DndEngine.js'

function nameHash(name) {
  let h = 0
  for (const ch of name) h = ((h << 5) - h + ch.charCodeAt(0)) | 0
  return Math.abs(h)
}

export async function parseCharacter(raw) {
  const c = typeof raw === 'string' ? JSON.parse(raw) : raw
  let computed = computeCharacter(c)

  // Enrich weapons with 5etools data (async, best-effort)
  try { computed = await enrichWeapons(computed) } catch { /* fallback stays */ }

  const hash = nameHash(computed.name)
  computed.theme = {
    accentColor: c.theme?.accentColor ?? `hsl(${hash % 360}, 40%, 35%)`,
    symbol: c.theme?.symbol ?? '⚔',
    borderStyle: hash % 3,
    ornamentRotation: (hash % 20) - 10,
  }

  return computed
}
