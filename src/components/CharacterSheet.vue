<script setup>
import { computed, ref } from 'vue'
import { useCharacterStore } from '../stores/character'
import { usePdf } from '../composables/usePdf'
import { downloadMarkdown } from '../services/MarkdownExporter'

const store = useCharacterStore()
const page = ref(1)

function handleImageUpload(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => store.setImage(reader.result)
  reader.readAsDataURL(file)
}

function exportPdf() { usePdf(store.data, store.imageBase64) }

function edit(key, e) {
  const val = e.target.innerText.trim()
  store.updateField(key, key === 'level' ? (parseInt(val) || 1) : val)
}

const c = computed(() => store.data)
const theme = computed(() => c.value?.theme ?? {})
const accent = computed(() => theme.value.accentColor ?? '#c9a84c')
const isNpc = computed(() => c.value?.type === 'npc')

const skillList = computed(() => {
  if (!c.value?.skills) return []
  return Object.entries(c.value.skills).sort((a, b) => a[0].localeCompare(b[0]))
})

const spellsByLevel = computed(() => {
  if (!c.value?.spells?.length) return {}
  const grouped = {}
  for (const sp of c.value.spells) {
    const lv = sp.level ?? 0
    if (!grouped[lv]) grouped[lv] = []
    grouped[lv].push(sp)
  }
  return grouped
})

const saveKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha']
</script>

<template>
  <div v-if="c" class="sheet-container">
    <!-- Page navigation -->
    <div class="flex justify-center gap-2 mb-4">
      <button v-for="p in (isNpc ? 2 : 3)" :key="p" @click="page = p"
        :class="['sheet-tab', page === p && 'sheet-tab-active']"
        :style="page === p ? { borderColor: accent, color: accent } : {}">
        {{ ['Ficha', 'Perfil', 'Magias'][p - 1] }}
      </button>
    </div>

    <!-- ═══════════ PAGE 1: STATS ═══════════ -->
    <div v-show="page === 1" class="sheet-page">
      <!-- Header -->
      <div class="sheet-header" :style="{ borderBottomColor: accent }">
        <div class="flex-1 min-w-0">
          <h1 contenteditable spellcheck="false" @blur="edit('name', $event)"
            class="sheet-name">{{ c.name }}</h1>
          <div class="sheet-subtitle">
            <span contenteditable spellcheck="false" @blur="edit('species', $event)" class="sheet-editable">{{ c.species }}</span>
            <span class="sheet-sep">|</span>
            <span>{{ c.class }}</span>
            <span class="sheet-sep">|</span>
            <span>Nível <span contenteditable spellcheck="false" @blur="edit('level', $event)" class="sheet-editable">{{ c.level }}</span></span>
            <span class="sheet-sep">|</span>
            <span contenteditable spellcheck="false" @blur="edit('background', $event)" class="sheet-editable">{{ c.background }}</span>
            <span class="sheet-sep">|</span>
            <span contenteditable spellcheck="false" @blur="edit('alignment', $event)" class="sheet-editable">{{ c.alignment }}</span>
          </div>
          <div v-if="c.originFeat" class="text-[10px] italic text-ink-light mt-0.5">Feat de Origem: {{ c.originFeat }}</div>
        </div>
        <div v-if="store.imageBase64" class="shrink-0 ml-4">
          <img :src="store.imageBase64" class="sheet-portrait-sm" :style="{ borderColor: accent }" alt="Portrait" />
        </div>
        <div v-if="isNpc && c.crRating" class="sheet-cr" :style="{ background: `${accent}20`, color: accent, borderColor: `${accent}50` }">
          CR {{ c.crRating }}
        </div>
      </div>

      <!-- Ability Scores -->
      <div class="grid grid-cols-3 sm:grid-cols-6 gap-1.5 my-4">
        <div v-for="k in saveKeys" :key="k" class="sheet-ability" :style="{ borderColor: `${accent}40` }">
          <div class="sheet-ability-label">{{ k }}</div>
          <div class="sheet-ability-mod" :style="{ color: accent }">{{ c.abilities[k]?.display }}</div>
          <div class="sheet-ability-score">{{ c.abilities[k]?.score }}</div>
        </div>
      </div>

      <!-- Combat Row -->
      <div class="grid grid-cols-3 sm:flex sm:flex-wrap gap-1.5 mb-4">
        <div class="sheet-stat-box sheet-stat-hp">
          <span class="sheet-stat-label">HP</span>
          <span class="sheet-stat-value">{{ c.hp }}</span>
        </div>
        <div class="sheet-stat-box">
          <span class="sheet-stat-label">AC</span>
          <span class="sheet-stat-value">{{ c.ac }}</span>
        </div>
        <div class="sheet-stat-box">
          <span class="sheet-stat-label">Iniciativa</span>
          <span class="sheet-stat-value">{{ c.initiative?.display }}</span>
        </div>
        <div class="sheet-stat-box">
          <span class="sheet-stat-label">Deslocamento</span>
          <span class="sheet-stat-value">{{ c.speed }}ft</span>
        </div>
        <div class="sheet-stat-box" :style="{ borderColor: `${accent}50`, background: `${accent}08` }">
          <span class="sheet-stat-label">Proficiência</span>
          <span class="sheet-stat-value" :style="{ color: accent }">{{ c.proficiencyBonusDisplay }}</span>
        </div>
        <div class="sheet-stat-box">
          <span class="sheet-stat-label">Percepção Passiva</span>
          <span class="sheet-stat-value">{{ c.passivePerception }}</span>
        </div>
        <div class="sheet-stat-box">
          <span class="sheet-stat-label">Dado de Vida</span>
          <span class="sheet-stat-value">{{ c.hitDie }}</span>
        </div>
      </div>

      <!-- Two-column: Saves+Skills | Attacks+Equipment -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <!-- Left: Saving Throws + Skills -->
        <div>
          <h3 class="sheet-section-title" :style="{ borderColor: accent }">Saving Throws</h3>
          <div class="grid grid-cols-2 gap-x-3 gap-y-0.5 mb-3">
            <div v-for="k in saveKeys" :key="k" class="sheet-skill-row"
              :class="c.savingThrows?.[k]?.proficient && 'sheet-skill-prof'">
              <span class="sheet-prof-dot" :style="c.savingThrows?.[k]?.proficient ? { color: accent } : {}">{{ c.savingThrows?.[k]?.proficient ? '●' : '○' }}</span>
              <span class="sheet-skill-mod">{{ c.savingThrows?.[k]?.display }}</span>
              <span class="sheet-skill-name">{{ k.toUpperCase() }}</span>
            </div>
          </div>

          <h3 class="sheet-section-title" :style="{ borderColor: accent }">Perícias</h3>
          <div class="grid grid-cols-1 gap-y-0">
            <div v-for="[name, sk] in skillList" :key="name" class="sheet-skill-row"
              :class="sk.proficient && 'sheet-skill-prof'">
              <span class="sheet-prof-dot" :style="sk.proficient ? { color: accent } : {}">{{ sk.proficient ? '●' : '○' }}</span>
              <span class="sheet-skill-mod">{{ sk.display }}</span>
              <span class="sheet-skill-name">{{ name }}</span>
            </div>
          </div>
        </div>

        <!-- Right: Attacks + Equipment -->
        <div>
          <h3 class="sheet-section-title" :style="{ borderColor: accent }">Ataques</h3>
          <div v-if="c.weapons?.length" class="space-y-1 mb-3">
            <div v-for="w in c.weapons" :key="w.name" class="sheet-attack-row">
              <span class="font-bold flex-1">{{ w.name }}</span>
              <span class="sheet-attack-bonus" :style="{ color: accent }">{{ w.attackBonus }}</span>
              <span class="text-ink-light">{{ w.damage }} {{ w.type }}</span>
              <span v-if="w.range !== '5'" class="text-ink-light text-[9px]">({{ w.range }})</span>
            </div>
          </div>
          <div v-if="c.spellcasting" class="sheet-spell-summary mb-3" :style="{ borderColor: `${accent}40`, background: `${accent}06` }">
            <span>DC <b :style="{ color: accent }">{{ c.spellcasting.saveDC }}</b></span>
            <span>Atk <b :style="{ color: accent }">{{ c.spellcasting.attackBonusDisplay }}</b></span>
            <span class="text-ink-light">({{ c.spellcasting.ability.toUpperCase() }})</span>
          </div>

          <h3 class="sheet-section-title" :style="{ borderColor: accent }">Equipamento</h3>
          <div class="flex flex-wrap gap-1">
            <span v-for="eq in c.equipment" :key="eq" class="sheet-tag">{{ eq }}</span>
          </div>

          <h3 class="sheet-section-title mt-3" :style="{ borderColor: accent }">Idiomas</h3>
          <div class="flex flex-wrap gap-1">
            <span v-for="lang in c.languages" :key="lang" class="sheet-tag">{{ lang }}</span>
          </div>
        </div>
      </div>

      <!-- Features & Traits -->
      <div class="mb-4">
        <h3 class="sheet-section-title" :style="{ borderColor: accent }">Habilidades & Traços</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div v-for="f in [...(c.features || []), ...(c.traits || [])]" :key="f.name" class="sheet-feature">
            <p class="font-bold text-ink text-[11px]">{{ f.name }}</p>
            <p class="text-ink-light text-[10px] italic leading-tight">{{ f.description }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════ PAGE 2: PROFILE ═══════════ -->
    <div v-show="page === 2" class="sheet-page">
      <!-- Portrait large -->
      <div class="flex flex-col-reverse sm:flex-row gap-4 sm:gap-6 mb-4">
        <div class="flex-1">
          <h3 class="sheet-section-title" :style="{ borderColor: accent }">Personalidade</h3>
          <div class="space-y-2 text-xs font-body text-ink">
            <p v-if="c.personality"><span class="font-bold">Traços:</span> {{ c.personality }}</p>
            <p v-if="c.ideals"><span class="font-bold">Ideais:</span> {{ c.ideals }}</p>
            <p v-if="c.bonds"><span class="font-bold">Vínculos:</span> {{ c.bonds }}</p>
            <p v-if="c.flaws"><span class="font-bold">Fraquezas:</span> {{ c.flaws }}</p>
          </div>
        </div>
        <div class="shrink-0 self-center sm:self-start">
          <div class="sheet-portrait-lg" :style="{ borderColor: accent }">
            <img v-if="store.imageBase64" :src="store.imageBase64" class="w-full h-full object-cover" alt="Portrait" />
            <label v-else class="flex flex-col items-center justify-center h-full cursor-pointer text-ink-light hover:text-ink transition">
              <span class="text-3xl mb-1">🖼️</span>
              <span class="text-[10px] font-heading">Adicionar Retrato</span>
              <input type="file" accept="image/*" @change="handleImageUpload" class="hidden" />
            </label>
          </div>
        </div>
      </div>

      <!-- NPC Roleplaying -->
      <div v-if="isNpc && c.roleplaying" class="mb-4 p-3 rounded border border-dashed" :style="{ borderColor: `${accent}50`, background: `${accent}06` }">
        <h3 class="sheet-section-title" :style="{ borderColor: accent }">🎭 Interpretação (DM)</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-body text-ink">
          <p v-if="c.roleplaying.voice"><span class="font-bold">Voz:</span> {{ c.roleplaying.voice }}</p>
          <p v-if="c.roleplaying.mannerisms"><span class="font-bold">Maneirismos:</span> {{ c.roleplaying.mannerisms }}</p>
          <p v-if="c.roleplaying.ideals"><span class="font-bold">Ideais:</span> {{ c.roleplaying.ideals }}</p>
          <p v-if="c.roleplaying.bonds"><span class="font-bold">Vínculos:</span> {{ c.roleplaying.bonds }}</p>
          <p v-if="c.roleplaying.flaws" class="sm:col-span-2"><span class="font-bold">Fraquezas:</span> {{ c.roleplaying.flaws }}</p>
        </div>
      </div>

      <!-- DM Notes -->
      <div v-if="isNpc && c.dmNotes" class="mb-4 p-3 bg-blood/5 border border-blood/20 rounded">
        <h3 class="font-heading text-xs uppercase tracking-wider text-blood mb-1">🔒 Notas do Mestre</h3>
        <p class="font-body text-xs text-ink italic leading-relaxed">{{ c.dmNotes }}</p>
      </div>

      <!-- Backstory -->
      <div class="mb-4">
        <h3 class="sheet-section-title" :style="{ borderColor: accent }">História</h3>
        <p class="font-body text-xs text-ink leading-relaxed">{{ c.backstory }}</p>
      </div>
    </div>

    <!-- ═══════════ PAGE 3: SPELLS ═══════════ -->
    <div v-show="page === 3 && !isNpc" class="sheet-page">
      <div v-if="c.spellcasting" class="mb-4">
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mb-3">
          <h3 class="sheet-section-title mb-0" :style="{ borderColor: accent }">Conjuração</h3>
          <div class="flex flex-wrap gap-2 text-xs font-heading">
            <span class="sheet-stat-pill" :style="{ borderColor: `${accent}40`, color: accent }">Habilidade: {{ c.spellcasting.ability.toUpperCase() }}</span>
            <span class="sheet-stat-pill" :style="{ borderColor: `${accent}40`, color: accent }">DC {{ c.spellcasting.saveDC }}</span>
            <span class="sheet-stat-pill" :style="{ borderColor: `${accent}40`, color: accent }">Atk {{ c.spellcasting.attackBonusDisplay }}</span>
          </div>
        </div>

        <!-- Spell Slots -->
        <div v-if="c.spellSlots?.length" class="flex flex-wrap gap-1.5 mb-4">
          <div v-for="(count, i) in c.spellSlots" :key="i" class="sheet-slot" :style="{ borderColor: `${accent}40` }">
            <span class="sheet-slot-level">{{ i + 1 }}º</span>
            <span class="sheet-slot-count" :style="{ color: accent }">{{ count }}</span>
          </div>
        </div>
      </div>

      <!-- Spells by level -->
      <div v-for="(spells, level) in spellsByLevel" :key="level" class="mb-3">
        <h4 class="text-[11px] font-heading uppercase tracking-wider text-ink-light mb-1 pb-0.5 border-b" :style="{ borderColor: `${accent}30` }">
          {{ level == 0 ? 'Truques' : `${level}º Nível` }}
        </h4>
        <div class="flex flex-wrap gap-1">
          <span v-for="sp in spells" :key="sp.name" class="sheet-spell-tag" :style="{ borderColor: `${accent}30`, background: `${accent}08` }">
            {{ sp.name }}
          </span>
        </div>
      </div>

      <div v-if="!c.spellcasting && !c.spells?.length" class="text-center py-12 text-ink-light font-heading text-sm italic">
        Este personagem não possui magias.
      </div>
    </div>

    <!-- Actions -->
    <div class="flex gap-2 mt-4">
      <button @click="exportPdf" class="btn-blood flex-1 py-3 rounded font-bold text-sm">
        ⚔ Exportar PDF
      </button>
      <button @click="downloadMarkdown(store.data)" class="btn-arcane flex-1 py-3 rounded font-bold text-sm opacity-80 hover:opacity-100">
        📜 Exportar MD
      </button>
    </div>
  </div>
</template>

<style scoped>
.sheet-container {
  max-width: 800px;
  margin: 0 auto;
}

.sheet-page {
  background: linear-gradient(170deg, #F4E9D5 0%, #e8dcc0 50%, #ddd0b0 100%);
  color: #333333;
  border: 1px solid #8B6F4D;
  border-radius: 4px;
  padding: 16px 14px;
  box-shadow:
    inset 0 0 40px rgba(51, 51, 51, 0.06),
    0 2px 20px rgba(0, 0, 0, 0.4);
  position: relative;
  background-image:
    url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E"),
    linear-gradient(170deg, #F4E9D5 0%, #e8dcc0 50%, #ddd0b0 100%);
}
@media (min-width: 640px) {
  .sheet-page { padding: 24px 28px; }
}

.sheet-tab {
  font-family: 'Cinzel Decorative', serif;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  padding: 6px 16px;
  border-radius: 4px;
  border: 1px solid transparent;
  color: #8B6F4D;
  transition: all 0.2s;
  cursor: pointer;
  background: transparent;
}
.sheet-tab:hover { color: #F4E9D5; }
.sheet-tab-active {
  background: rgba(199, 161, 82, 0.12);
}

.sheet-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8px;
  padding-bottom: 12px;
  margin-bottom: 4px;
  border-bottom: 2px solid;
}

.sheet-name {
  font-family: 'Cinzel Decorative', serif;
  font-size: 18px;
  font-weight: 700;
  color: #333333;
  letter-spacing: 0.04em;
  outline: none;
  border-bottom: 1px solid transparent;
  line-height: 1.2;
}
@media (min-width: 640px) {
  .sheet-header { gap: 12px; flex-wrap: nowrap; }
  .sheet-name { font-size: 22px; }
}
.sheet-name:hover { border-bottom-color: rgba(139, 111, 77, 0.4); }
.sheet-name:focus { border-bottom-color: rgba(199, 161, 82, 0.5); }

.sheet-subtitle {
  font-family: 'Merriweather', serif;
  font-size: 11px;
  color: #8B6F4D;
  font-style: italic;
  line-height: 1.6;
}
@media (min-width: 640px) {
  .sheet-subtitle { font-size: 12px; }
}
.sheet-sep { margin: 0 4px; opacity: 0.4; }
.sheet-editable {
  outline: none;
  border-bottom: 1px solid transparent;
}
.sheet-editable:hover { border-bottom-color: rgba(139, 111, 77, 0.4); }
.sheet-editable:focus { border-bottom-color: rgba(199, 161, 82, 0.5); }

.sheet-portrait-sm {
  width: 64px;
  height: 76px;
  object-fit: cover;
  border-radius: 4px;
  border: 2px solid;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.sheet-portrait-lg {
  width: 140px;
  height: 170px;
  border-radius: 4px;
  border: 2px solid;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.3);
  background: rgba(51, 51, 51, 0.05);
}
@media (min-width: 640px) {
  .sheet-portrait-lg { width: 180px; height: 220px; }
}

.sheet-cr {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 10px;
  border-radius: 4px;
  font-family: 'Cinzel Decorative', serif;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  border: 1px solid;
}

.sheet-ability {
  text-align: center;
  border: 1px solid;
  border-radius: 6px;
  padding: 6px 2px 4px;
  background: rgba(51, 51, 51, 0.03);
}
.sheet-ability-label {
  font-family: 'Cinzel Decorative', serif;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #8B6F4D;
}
.sheet-ability-mod {
  font-family: 'Cinzel Decorative', serif;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
}
.sheet-ability-score {
  font-family: 'Merriweather', serif;
  font-size: 11px;
  color: #8B6F4D;
}

.sheet-stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 6px;
  border: 1px solid rgba(139, 111, 77, 0.35);
  border-radius: 4px;
  background: rgba(51, 51, 51, 0.03);
  min-width: 0;
}
@media (min-width: 640px) {
  .sheet-stat-box { padding: 6px 12px; min-width: 70px; }
}
.sheet-stat-hp {
  background: rgba(160, 59, 49, 0.06);
  border-color: rgba(160, 59, 49, 0.3);
}
.sheet-stat-hp .sheet-stat-value { color: #A03B31; }
.sheet-stat-label {
  font-family: 'Cinzel Decorative', serif;
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #8B6F4D;
}
.sheet-stat-value {
  font-family: 'Cinzel Decorative', serif;
  font-size: 16px;
  font-weight: 700;
  color: #333333;
}

.sheet-stat-pill {
  padding: 2px 8px;
  border: 1px solid;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}

.sheet-section-title {
  font-family: 'Cinzel Decorative', serif;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #A03B31;
  border-bottom: 1px solid;
  padding-bottom: 2px;
  margin-bottom: 6px;
}

.sheet-skill-row {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: 'Merriweather', serif;
  font-size: 11px;
  color: #8B6F4D;
  padding: 1px 0;
}
.sheet-skill-prof { color: #333333; font-weight: 600; }
.sheet-prof-dot { font-size: 8px; width: 10px; text-align: center; }
.sheet-skill-mod { width: 22px; text-align: right; font-weight: 700; font-size: 10px; }
.sheet-skill-name { font-size: 10px; }

.sheet-attack-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'Merriweather', serif;
  font-size: 11px;
  color: #333333;
  padding: 2px 0;
  border-bottom: 1px solid rgba(139, 111, 77, 0.15);
}
.sheet-attack-bonus {
  font-weight: 700;
  font-size: 12px;
}

.sheet-spell-summary {
  display: flex;
  gap: 10px;
  padding: 4px 8px;
  border: 1px solid;
  border-radius: 4px;
  font-family: 'Merriweather', serif;
  font-size: 11px;
}

.sheet-tag {
  font-family: 'Merriweather', serif;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(51, 51, 51, 0.05);
  border: 1px solid rgba(139, 111, 77, 0.25);
  color: #333333;
}

.sheet-feature {
  padding: 4px 6px;
  border-radius: 3px;
  background: rgba(51, 51, 51, 0.03);
  border: 1px solid rgba(139, 111, 77, 0.15);
}

.sheet-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 10px;
  border: 1px solid;
  border-radius: 4px;
  background: rgba(51, 51, 51, 0.03);
}
.sheet-slot-level {
  font-family: 'Cinzel Decorative', serif;
  font-size: 9px;
  color: #8B6F4D;
}
.sheet-slot-count {
  font-family: 'Cinzel Decorative', serif;
  font-size: 16px;
  font-weight: 700;
}

.sheet-spell-tag {
  font-family: 'Merriweather', serif;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 3px;
  border: 1px solid;
  color: #333333;
}
</style>
