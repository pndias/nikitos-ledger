<script setup>
import { ref } from 'vue'
import { useCharacterStore } from '../stores/character'
import { generateCharacterFromPrompt, generateNpcFromPrompt } from '../services/LlmService'
import { parseCharacter } from '../services/CharacterParser'
import { isStructuredMarkdown, parseMarkdownCharacter } from '../services/MarkdownParser'

const store = useCharacterStore()
const userPrompt = ref('')
const promptImage = ref(null)
const promptImagePreview = ref(null)
const inputMode = ref('prompt') // 'prompt' | 'markdown'

function handlePromptImage(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => { promptImage.value = reader.result; promptImagePreview.value = reader.result }
  reader.readAsDataURL(file)
}

function removeImage() { promptImage.value = null; promptImagePreview.value = null }

async function generate() {
  const text = userPrompt.value.trim()
  if (!text) return
  store.setLoading(true)
  store.setError(null)
  try {
    let parsed
    if (inputMode.value === 'markdown' || isStructuredMarkdown(text)) {
      parsed = parseCharacter(parseMarkdownCharacter(text))
    } else {
      const gen = store.mode === 'npc' ? generateNpcFromPrompt : generateCharacterFromPrompt
      parsed = parseCharacter(await gen(text, promptImage.value))
    }
    if (promptImage.value) parsed._portrait = promptImage.value
    store.addCharacter(parsed)
    if (promptImage.value) store.setImage(promptImage.value)
    userPrompt.value = ''
    removeImage()
  } catch (e) {
    store.setError(e.message)
  } finally {
    store.setLoading(false)
  }
}

function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate() }
}

const placeholders = {
  pc: { prompt: 'Humano Rogue/Warlock nível 3, filho de nobres em Waterdeep...', md: '# Nome\nRace: Elfo\nClass: Wizard\nLevel: 5\nSTR: 8  DEX: 14...' },
  npc: { prompt: 'Taverneiro anão em Baldur\'s Gate, ex-aventureiro, esconde um segredo sombrio...', md: '# Nome do NPC\nRace: Anão\nClass: Commoner\n...' },
}
</script>

<template>
  <div class="w-full max-w-3xl mx-auto">
    <!-- Welcome -->
    <div v-if="!store.data && !store.loading" class="text-center mb-8 sm:mb-12">
      <img src="/logo.png" alt="Nikito's Ledger" class="w-20 h-20 sm:w-28 sm:h-28 mx-auto mb-3 rounded-full border-2 border-gold/40 shadow-lg" />
      <h1 class="font-display text-2xl sm:text-4xl md:text-5xl font-bold text-gold tracking-widest mb-3" style="text-shadow: 1px 1px 0 #8B6F4D;">Nikito's Ledger</h1>
      <div class="gold-rule max-w-sm mx-auto mb-3"></div>
      <p class="text-parchment-dark font-heading text-xs sm:text-sm tracking-wider">
        {{ store.mode === 'npc' ? 'Gere NPCs memoráveis para sua mesa' : 'Descreva seu personagem e a magia fará o resto' }}
      </p>
    </div>

    <!-- Mode + Input toggle -->
    <div class="flex gap-2 mb-2 justify-center">
      <button
        v-for="m in [{ key: 'prompt', label: store.mode === 'npc' ? '👤 Prompt NPC' : '✦ Prompt Livre' }, { key: 'markdown', label: '📜 Colar Markdown' }]"
        :key="m.key"
        @click="inputMode = m.key"
        :class="['px-3 py-1 rounded text-xs font-heading tracking-wider transition', inputMode === m.key ? 'bg-gold/20 text-gold border border-gold/40' : 'text-parchment-dark hover:text-parchment']"
      >{{ m.label }}</button>
    </div>

    <!-- Prompt bar -->
    <div class="panel-ornate rounded-2xl p-4">
      <textarea
        v-model="userPrompt"
        @keydown="onKeydown"
        :rows="inputMode === 'markdown' ? 10 : 3"
        class="w-full bg-transparent text-parchment p-2 outline-none resize-y font-body text-base placeholder:text-ink-light"
        :placeholder="placeholders[store.mode][inputMode === 'markdown' ? 'md' : 'prompt']"
      />

      <div v-if="promptImagePreview" class="flex items-center gap-3 mt-2 p-2 bg-bg-dark/40 rounded">
        <img :src="promptImagePreview" class="w-12 h-12 object-cover rounded border border-border-ornate" alt="Attached" />
        <span class="text-parchment-dark text-xs flex-1">Imagem anexada</span>
        <button @click="removeImage" class="text-blood text-xs hover:text-blood/80">✕</button>
      </div>

      <div class="flex items-center justify-between mt-2 gap-3">
        <div class="flex items-center gap-3">
          <label class="cursor-pointer text-parchment-dark hover:text-gold transition text-sm" title="Anexar imagem">
            🖼️<input type="file" accept="image/*" @change="handlePromptImage" class="hidden" />
          </label>
          <p class="text-border-ornate text-[10px] font-body italic">
            {{ store.mode === 'npc' ? 'Descreva o NPC para o mestre' : 'Shift+Enter nova linha' }}
          </p>
        </div>
        <button
          @click="generate"
          :disabled="store.loading || !userPrompt.trim()"
          class="btn-arcane px-5 py-2 rounded-lg text-xs disabled:opacity-40 shrink-0"
        >
          {{ store.loading ? '⏳ Invocando...' : inputMode === 'markdown' ? '📜 Importar' : store.mode === 'npc' ? '👤 Gerar NPC' : '✦ Gerar PC' }}
        </button>
      </div>
    </div>

    <p v-if="store.error" class="mt-3 text-blood text-sm font-body italic text-center">⚠ {{ store.error }}</p>
  </div>
</template>
