import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'tj-theme'

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
}

export function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY)
  const theme = saved === 'light' || saved === 'dark' ? saved : 'dark'
  applyTheme(theme)
  return theme
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref(initTheme())

  function setTheme(value) {
    theme.value = value === 'light' ? 'light' : 'dark'
    localStorage.setItem(STORAGE_KEY, theme.value)
    applyTheme(theme.value)
  }

  function toggleTheme() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return { theme, setTheme, toggleTheme }
})
