import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCharacterStore = defineStore('character', () => {
  const characters = ref([]) // { ...charData, type: 'pc' | 'npc' }
  const activeIndex = ref(-1)
  const imageBase64 = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const mode = ref('pc') // 'pc' | 'npc'

  const data = computed(() => activeIndex.value >= 0 ? characters.value[activeIndex.value] : null)
  const pcs = computed(() => characters.value.filter(c => c.type === 'pc'))
  const npcs = computed(() => characters.value.filter(c => c.type === 'npc'))

  function addCharacter(charData) {
    charData.type = mode.value
    characters.value.unshift(charData)
    activeIndex.value = 0
  }

  function selectCharacter(char) {
    const i = characters.value.indexOf(char)
    if (i >= 0) {
      activeIndex.value = i
      imageBase64.value = char._portrait ?? null
    }
  }

  function setImage(base64) {
    imageBase64.value = base64
    if (data.value) data.value._portrait = base64
  }

  function updateField(key, value) {
    if (data.value) data.value[key] = value
  }

  function setLoading(val) { loading.value = val }
  function setError(msg) { error.value = msg }
  function setMode(m) { mode.value = m }
  function goHome() { activeIndex.value = -1; imageBase64.value = null }

  return { characters, activeIndex, data, imageBase64, loading, error, mode, pcs, npcs, addCharacter, selectCharacter, setImage, updateField, setLoading, setError, setMode, goHome }
})
