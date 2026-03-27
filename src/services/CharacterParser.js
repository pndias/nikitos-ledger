/**
 * CharacterParser — wrapper fino que normaliza o JSON da LLM
 * e passa pelo DndEngine para calcular todos os valores derivados.
 */
import { computeCharacter } from './DndEngine.js'

/** Gera hash do nome para variações visuais determinísticas. */
function nameHash(name) {
  let h = 0
  for (const ch of name) h = ((h << 5) - h + ch.charCodeAt(0)) | 0
  return Math.abs(h)
}

export function parseCharacter(raw) {
  const c = typeof raw === 'string' ? JSON.parse(raw) : raw

  // Compute all derived values via engine
  const computed = computeCharacter(c)

  // Theme — from LLM or generated fallback
  const hash = nameHash(computed.name)
  const defaultAccent = `hsl(${hash % 360}, 40%, 35%)`
  computed.theme = {
    accentColor: c.theme?.accentColor ?? defaultAccent,
    symbol: c.theme?.symbol ?? '⚔',
    borderStyle: hash % 3,
    ornamentRotation: (hash % 20) - 10,
  }

  return computed
}
