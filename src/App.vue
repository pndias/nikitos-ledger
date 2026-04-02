<script setup>
import { ref } from 'vue'
import Sidebar from './components/Sidebar.vue'
import PromptInput from './components/PromptInput.vue'
import CharacterSheet from './components/CharacterSheet.vue'
import { useCharacterStore } from './stores/character'

const store = useCharacterStore()
const sidebarCollapsed = ref(true)
const sidebarOpen = ref(false)
</script>

<template>
  <div class="flex h-screen overflow-hidden font-body text-parchment">
    <!-- Mobile overlay -->
    <div v-if="sidebarOpen" class="fixed inset-0 bg-black/60 z-40 md:hidden" @click="sidebarOpen = false" />

    <Sidebar
      :collapsed="sidebarCollapsed"
      :mobile-open="sidebarOpen"
      @toggle="sidebarCollapsed = !sidebarCollapsed"
      @close-mobile="sidebarOpen = false"
    />

    <main class="flex-1 flex flex-col overflow-y-auto min-w-0">
      <!-- Mobile top bar -->
      <div class="flex items-center gap-3 p-3 md:hidden border-b border-border-ornate bg-bg-panel">
        <button @click="sidebarOpen = true" class="text-parchment-dark hover:text-gold text-lg">☰</button>
        <span class="font-heading text-gold text-sm tracking-wider uppercase">Ledger</span>
      </div>

      <div class="flex-1 flex flex-col justify-center px-3 py-4 sm:px-6 sm:py-8">
        <div v-if="store.data" class="max-w-4xl w-full mx-auto">
          <button @click="store.goHome()" class="flex items-center gap-1 text-parchment-dark hover:text-gold transition text-xs font-heading tracking-wider mb-3">
            ← Voltar ao Início
          </button>
          <CharacterSheet class="mb-8" />
        </div>
        <div :class="store.data ? 'max-w-4xl w-full mx-auto' : ''">
          <PromptInput />
        </div>
      </div>

      <div class="gold-rule max-w-xs mx-auto"></div>
      <p class="text-center text-border-ornate text-[10px] py-3 font-heading tracking-wider">D&D 5.5 · Nikito's Ledger by El Brujo Tapuya</p>
    </main>
  </div>
</template>
