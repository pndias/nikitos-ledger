<script setup>
import { useCharacterStore } from '../stores/character'

const store = useCharacterStore()

defineProps({ collapsed: Boolean })
defineEmits(['toggle'])
</script>

<template>
  <aside
    :class="[
      'h-screen flex flex-col border-r border-border-ornate bg-bg-panel transition-all duration-300',
      collapsed ? 'w-16' : 'w-64'
    ]"
  >
    <!-- Toggle -->
    <div class="flex items-center justify-between p-4">
      <span v-if="!collapsed" class="font-heading text-gold text-sm tracking-wider uppercase">Ledger</span>
      <button @click="$emit('toggle')" class="text-parchment-dark hover:text-gold transition text-lg">
        {{ collapsed ? '☰' : '✕' }}
      </button>
    </div>
    <div class="gold-rule mx-3"></div>

    <!-- Mode switch -->
    <div v-if="!collapsed" class="flex gap-1 p-3">
      <button
        v-for="m in [{ key: 'pc', label: '⚔ PCs' }, { key: 'npc', label: '👤 NPCs' }]"
        :key="m.key"
        @click="store.setMode(m.key)"
        :class="[
          'flex-1 py-1.5 rounded text-xs font-heading tracking-wider transition',
          store.mode === m.key ? 'bg-gold/20 text-gold border border-gold/40' : 'text-parchment-dark hover:text-parchment border border-transparent'
        ]"
      >{{ m.label }}</button>
    </div>

    <!-- Character list -->
    <nav v-if="!collapsed" class="flex-1 overflow-y-auto px-3 space-y-1">
      <!-- PCs section -->
      <template v-if="store.mode === 'pc'">
        <p class="text-[10px] font-heading text-border-ornate uppercase tracking-widest mt-2 mb-1 px-1">Jogadores</p>
        <div v-if="!store.pcs.length" class="text-ink-light text-xs italic text-center mt-4 px-2">
          Nenhum PC criado ainda.
        </div>
        <button
          v-for="char in store.pcs"
          :key="char.name"
          @click="store.selectCharacter(char)"
          :class="[
            'w-full text-left px-3 py-2 rounded transition text-sm',
            store.data === char ? 'bg-bg-panel-light border border-gold/20' : 'hover:bg-bg-panel-light'
          ]"
        >
          <div class="flex items-center gap-2">
            <span>{{ char.theme?.symbol ?? '⚔' }}</span>
            <div class="min-w-0">
              <p class="font-heading text-parchment text-xs truncate">{{ char.name }}</p>
              <p class="text-parchment-dark text-[10px] truncate">{{ char.class }} · Nv{{ char.level }}</p>
            </div>
          </div>
        </button>
      </template>

      <!-- NPCs section -->
      <template v-else>
        <p class="text-[10px] font-heading text-border-ornate uppercase tracking-widest mt-2 mb-1 px-1">NPCs do Mestre</p>
        <div v-if="!store.npcs.length" class="text-ink-light text-xs italic text-center mt-4 px-2">
          Nenhum NPC gerado ainda.
        </div>
        <button
          v-for="char in store.npcs"
          :key="char.name"
          @click="store.selectCharacter(char)"
          :class="[
            'w-full text-left px-3 py-2 rounded transition text-sm',
            store.data === char ? 'bg-bg-panel-light border border-gold/20' : 'hover:bg-bg-panel-light'
          ]"
        >
          <div class="flex items-center gap-2">
            <span>{{ char.theme?.symbol ?? '👤' }}</span>
            <div class="min-w-0">
              <p class="font-heading text-parchment text-xs truncate">{{ char.name }}</p>
              <p class="text-parchment-dark text-[10px] truncate">{{ char.species }} · {{ char.crRating ? `CR ${char.crRating}` : char.class }}</p>
            </div>
          </div>
        </button>
      </template>
    </nav>

    <!-- Footer -->
    <div v-if="!collapsed" class="p-4 border-t border-border-ornate">
      <p class="text-border-ornate text-[10px] font-heading tracking-wider text-center">Nikito's Ledger · by El Brujo Tapuya</p>
    </div>
  </aside>
</template>
