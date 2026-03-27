<script setup>
import { ref } from 'vue'
import Sidebar from './components/Sidebar.vue'
import PromptInput from './components/PromptInput.vue'
import CharacterSheet from './components/CharacterSheet.vue'
import { useCharacterStore } from './stores/character'

const store = useCharacterStore()
const sidebarCollapsed = ref(false)
</script>

<template>
  <div class="flex h-screen overflow-hidden font-body text-parchment">
    <Sidebar :collapsed="sidebarCollapsed" @toggle="sidebarCollapsed = !sidebarCollapsed" />

    <main class="flex-1 flex flex-col overflow-y-auto">
      <div class="flex-1 flex flex-col justify-center px-6 py-8">
        <div v-if="store.data" class="max-w-3xl w-full mx-auto mb-8">
          <CharacterSheet />
        </div>
        <div :class="store.data ? 'max-w-3xl w-full mx-auto' : ''">
          <PromptInput />
        </div>
      </div>

      <div class="gold-rule max-w-xs mx-auto"></div>
      <p class="text-center text-border-ornate text-[10px] py-3 font-heading tracking-wider">D&D 5.5 · Nikito's Ledger by El Brujo Tapuya</p>
    </main>
  </div>
</template>
