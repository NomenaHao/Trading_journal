<script setup>
import { useThemeStore } from '../stores/theme'

const themeStore = useThemeStore()
</script>

<template>
  <div class="theme-switcher" role="group" aria-label="Thème d'affichage">
    <button
      type="button"
      class="theme-btn"
      :class="{ 'theme-btn-active': themeStore.theme === 'light' }"
      title="Thème clair"
      aria-label="Thème clair"
      :aria-pressed="themeStore.theme === 'light'"
      @click="themeStore.setTheme('light')"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="theme-icon" aria-hidden="true">
        <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
      </svg>
    </button>
    <button
      type="button"
      class="theme-btn"
      :class="{ 'theme-btn-active': themeStore.theme === 'dark' }"
      title="Thème sombre"
      aria-label="Thème sombre"
      :aria-pressed="themeStore.theme === 'dark'"
      @click="themeStore.setTheme('dark')"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="theme-icon" aria-hidden="true">
        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.theme-switcher {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem;
  border-radius: 9999px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-overlay);
  gap: 0.125rem;
}

.theme-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 9999px;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.theme-btn:hover {
  color: var(--color-text);
  background: var(--color-surface-raised);
}

.theme-btn-active {
  color: var(--color-text) !important;
  background: var(--color-accent-soft) !important;
}

.theme-icon {
  width: 1rem;
  height: 1rem;
}
</style>
