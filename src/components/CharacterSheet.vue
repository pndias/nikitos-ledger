<script setup>
import { computed } from 'vue'
import { useCharacterStore } from '../stores/character'
import { usePdf } from '../composables/usePdf'

const store = useCharacterStore()

function handleImageUpload(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => store.setImage(reader.result)
  reader.readAsDataURL(file)
}

function exportPdf() { usePdf(store.data, store.imageBase64) }

const theme = computed(() => store.data?.theme ?? {})
const accent = computed(() => theme.value.accentColor ?? '#c9a84c')
const symbol = computed(() => theme.value.symbol ?? '⚔')
const borderStyles = ['solid', 'double', 'dashed']
const borderType = computed(() => borderStyles[theme.value.borderStyle ?? 0])
const ornamentDeg = computed(() => `${theme.value.ornamentRotation ?? 0}deg`)
const isNpc = computed(() => store.data?.type === 'npc')
</script>

<template>
  <section
    v-if="store.data"
    class="panel-parchment rounded-lg p-6 relative overflow-hidden"
    :style="{ borderLeftWidth: '4px', borderLeftStyle: borderType, borderLeftColor: accent }"
  >
    <!-- Watermark -->
    <div class="absolute top-4 right-4 text-6xl opacity-[0.06] pointer-events-none select-none" :style="{ transform: `rotate(${ornamentDeg})` }">{{ symbol }}</div>
    <div class="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 opacity-20 rounded-bl" :style="{ borderColor: accent }"></div>
    <div class="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 opacity-20 rounded-tr" :style="{ borderColor: accent }"></div>

    <!-- NPC badge -->
    <div v-if="isNpc" class="absolute top-3 left-3 px-2 py-0.5 rounded text-[9px] font-heading tracking-widest uppercase" :style="{ background: `${accent}25`, color: accent, border: `1px solid ${accent}40` }">
      NPC{{ store.data.crRating ? ` · CR ${store.data.crRating}` : '' }}
    </div>

    <!-- Portrait + Header -->
    <div :class="['flex gap-4 mb-3', isNpc ? 'mt-5' : '']">
      <div v-if="store.imageBase64" class="shrink-0">
        <img :src="store.imageBase64" class="w-24 h-28 object-cover rounded shadow-lg" :style="{ border: `2px ${borderType} ${accent}` }" alt="Portrait" />
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="text-lg">{{ symbol }}</span>
          <h2 class="font-heading text-2xl font-black text-ink tracking-wide truncate">{{ store.data.name }}</h2>
        </div>
        <p class="font-body text-ink-light italic text-sm">{{ store.data.race }} · {{ store.data.class }} · Nível {{ store.data.level }}</p>
        <p class="font-body text-ink-light text-xs">{{ store.data.background }} · {{ store.data.alignment }}</p>
      </div>
    </div>

    <div class="h-[2px] mb-4" :style="{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }"></div>

    <!-- Abilities -->
    <div class="grid grid-cols-6 gap-2 mb-4 text-center">
      <div v-for="(ab, key) in store.data.abilities" :key="key" class="rounded p-2" :style="{ background: `${accent}08`, border: `1px solid ${accent}30` }">
        <span class="text-[10px] uppercase font-heading tracking-wider text-ink-light">{{ key }}</span>
        <p class="text-xl font-heading font-black text-ink">{{ ab.score }}</p>
        <p class="text-xs font-bold" :style="{ color: accent }">{{ ab.display }}</p>
      </div>
    </div>

    <!-- Stats -->
    <div class="flex flex-wrap gap-2 mb-4 text-xs font-heading tracking-wider">
      <span class="bg-blood/10 border border-blood/30 text-blood px-3 py-1 rounded">HP {{ store.data.hp }}</span>
      <span class="bg-ink/5 border border-border-ornate/40 text-ink px-3 py-1 rounded">AC {{ store.data.ac }}</span>
      <span class="bg-ink/5 border border-border-ornate/40 text-ink px-3 py-1 rounded">{{ store.data.speed }}ft</span>
      <span class="px-3 py-1 rounded" :style="{ background: `${accent}15`, border: `1px solid ${accent}40`, color: accent }">Prof {{ store.data.proficiencyBonus }}</span>
    </div>

    <!-- NPC Roleplaying (DM section) -->
    <div v-if="isNpc && store.data.roleplaying" class="mb-4 p-3 rounded border border-dashed" :style="{ borderColor: `${accent}50`, background: `${accent}06` }">
      <h3 class="font-heading text-xs uppercase tracking-wider mb-2" :style="{ color: accent }">🎭 Interpretação (DM)</h3>
      <div class="grid grid-cols-2 gap-2 text-xs font-body text-ink">
        <p v-if="store.data.roleplaying.voice"><span class="font-bold">Voz:</span> {{ store.data.roleplaying.voice }}</p>
        <p v-if="store.data.roleplaying.mannerisms"><span class="font-bold">Maneirismos:</span> {{ store.data.roleplaying.mannerisms }}</p>
        <p v-if="store.data.roleplaying.ideals"><span class="font-bold">Ideais:</span> {{ store.data.roleplaying.ideals }}</p>
        <p v-if="store.data.roleplaying.bonds"><span class="font-bold">Vínculos:</span> {{ store.data.roleplaying.bonds }}</p>
        <p v-if="store.data.roleplaying.flaws" class="col-span-2"><span class="font-bold">Fraquezas:</span> {{ store.data.roleplaying.flaws }}</p>
      </div>
    </div>

    <!-- DM Notes -->
    <div v-if="isNpc && store.data.dmNotes" class="mb-4 p-3 bg-blood/5 border border-blood/20 rounded">
      <h3 class="font-heading text-xs uppercase tracking-wider text-blood mb-1">🔒 Notas do Mestre</h3>
      <p class="font-body text-xs text-ink italic leading-relaxed">{{ store.data.dmNotes }}</p>
    </div>

    <!-- Skills -->
    <div v-if="store.data.skills.length" class="mb-4">
      <h3 class="font-heading text-xs uppercase tracking-wider text-ink-light mb-1">Perícias</h3>
      <div class="flex flex-wrap gap-1">
        <span v-for="s in store.data.skills" :key="s" class="text-[11px] bg-ink/5 border border-border-ornate/30 px-2 py-0.5 rounded font-body text-ink">{{ s }}</span>
      </div>
    </div>

    <!-- Equipment -->
    <div v-if="store.data.equipment.length" class="mb-4">
      <h3 class="font-heading text-xs uppercase tracking-wider text-ink-light mb-1">Equipamento</h3>
      <div class="flex flex-wrap gap-1">
        <span v-for="eq in store.data.equipment" :key="eq" class="text-[11px] bg-ink/5 border border-border-ornate/30 px-2 py-0.5 rounded font-body text-ink">{{ eq }}</span>
      </div>
    </div>

    <!-- Features -->
    <div v-if="store.data.features.length" class="mb-4">
      <h3 class="font-heading text-xs uppercase tracking-wider text-ink-light mb-1">Habilidades</h3>
      <div v-for="f in store.data.features" :key="f.name" class="mb-2">
        <p class="font-heading text-sm font-bold text-ink">{{ f.name }}</p>
        <p class="font-body text-xs text-ink-light italic">{{ f.description }}</p>
      </div>
    </div>

    <!-- Spells -->
    <div v-if="store.data.spells.length" class="mb-4">
      <h3 class="font-heading text-xs uppercase tracking-wider text-ink-light mb-1">Magias</h3>
      <div class="flex flex-wrap gap-1">
        <span v-for="sp in store.data.spells" :key="sp.name" class="text-[11px] px-2 py-0.5 rounded font-body text-ink" :style="{ background: `${accent}12`, border: `1px solid ${accent}30` }">
          {{ sp.name }} <span class="text-ink-light">({{ sp.level === 0 ? 'cantrip' : `lv${sp.level}` }})</span>
        </span>
      </div>
    </div>

    <!-- Backstory -->
    <div v-if="store.data.backstory" class="mb-4">
      <div class="h-[2px] mb-2" :style="{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }"></div>
      <p class="font-body text-sm text-ink leading-relaxed italic">{{ store.data.backstory }}</p>
    </div>

    <div class="h-[2px] mb-4" :style="{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }"></div>

    <!-- Image upload -->
    <label v-if="!store.imageBase64" class="block mb-4 cursor-pointer">
      <span class="font-heading text-xs uppercase tracking-wider text-ink-light">Retrato</span>
      <input type="file" accept="image/*" @change="handleImageUpload" class="mt-1 block text-xs text-ink-light file:mr-3 file:py-1 file:px-3 file:rounded file:border file:border-border-ornate file:bg-parchment-dark file:text-ink file:font-heading file:text-xs file:cursor-pointer" />
    </label>

    <button @click="exportPdf" class="btn-blood w-full py-3 rounded font-bold text-sm">
      ⚔ Gerar PDF
    </button>
  </section>
</template>
