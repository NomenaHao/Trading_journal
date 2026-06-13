<script setup>
import { ref } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import UserAvatar from '../components/UserAvatar.vue'
import ThemeSwitcher from '../components/ThemeSwitcher.vue'
import AccountSwitcher from '../components/AccountSwitcher.vue'

const router = useRouter()
const authStore = useAuthStore()
const profileOpen = ref(false)

const navItems = [
  { to: '/', label: 'Tableau de bord', shortLabel: 'Dashboard', icon: '◈' },
  { to: '/journal', label: 'Journal', shortLabel: 'Journal', icon: '☰' },
  { to: '/ajouter', label: 'Nouveau trade', shortLabel: 'Ajouter', icon: '+' },
  { to: '/parametres', label: 'Paramètres', shortLabel: 'Réglages', icon: '⚙' },
]

function logout() {
  authStore.logout()
  profileOpen.value = false
  router.push('/login')
}

function toggleProfile() {
  profileOpen.value = !profileOpen.value
}
</script>

<template>
  <div class="flex flex-col md:flex-row min-h-screen min-h-dvh">
    <aside class="hidden md:flex w-56 shrink-0 border-r border-border bg-surface-raised flex-col">
      <div class="px-5 py-6 border-b border-border-subtle">
        <p class="text-[10px] uppercase tracking-[0.2em] text-text-muted mb-1">Trading</p>
        <h1 class="text-lg font-semibold tracking-tight">Journal</h1>
      </div>

      <nav class="flex-1 px-3 py-4 space-y-0.5">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-muted transition-colors"
          active-class="nav-link-active"
        >
          <span class="text-base w-5 text-center opacity-60">{{ item.icon }}</span>
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="px-5 py-4 border-t border-border-subtle">
        <p class="text-xs text-text-muted">© ChirurgicalFx - 2026</p>
      </div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0">
      <header class="topbar shrink-0 px-4 sm:px-6 py-3 border-b border-border-subtle bg-surface-raised/80 backdrop-blur-sm flex items-center justify-between gap-4">
        <div class="md:hidden">
          <p class="text-[10px] uppercase tracking-[0.2em] text-text-muted">Trading</p>
          <h1 class="text-sm font-semibold">Journal</h1>
        </div>
        <div class="hidden md:block" />

        <div class="flex items-center gap-2 sm:gap-3 ml-auto">
          <AccountSwitcher />
          <ThemeSwitcher />

          <div class="relative">
          <button
            type="button"
            class="profile-btn flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-surface-overlay transition-colors"
            @click="toggleProfile"
          >
            <UserAvatar :user="authStore.user" size="md" />
            <span class="hidden sm:block text-left">
              <span class="block text-sm font-medium leading-tight">{{ authStore.user?.name }}</span>
              <span class="block text-xs text-text-muted leading-tight">@{{ authStore.user?.username }}</span>
            </span>
            <span class="text-text-muted text-xs hidden sm:inline">▾</span>
          </button>

          <div v-if="profileOpen" class="profile-menu">
            <div class="px-4 py-3 border-b border-border-subtle flex items-center gap-3">
              <UserAvatar :user="authStore.user" size="lg" />
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">{{ authStore.user?.name }}</p>
                <p class="text-xs text-text-muted truncate">@{{ authStore.user?.username }}</p>
              </div>
            </div>
            <RouterLink
              to="/profil"
              class="menu-item"
              @click="profileOpen = false"
            >
              Mon profil
            </RouterLink>
            <RouterLink
              to="/parametres"
              class="menu-item"
              @click="profileOpen = false"
            >
              Paramètres trading
            </RouterLink>
            <button type="button" class="menu-item menu-item-danger w-full text-left" @click="logout">
              Déconnexion
            </button>
          </div>
          </div>
        </div>
      </header>

      <main class="flex-1 overflow-auto pb-[4.5rem] md:pb-0">
        <RouterView v-slot="{ Component }">
          <Transition name="fade" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
    </div>

    <nav class="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border-subtle bg-surface-raised/95 backdrop-blur-sm safe-bottom">
      <div class="grid grid-cols-4">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="mobile-nav-link flex flex-col items-center gap-1 py-2.5 text-[10px] text-text-muted transition-colors"
          active-class="mobile-nav-link-active"
        >
          <span class="text-base leading-none opacity-70">{{ item.icon }}</span>
          <span class="truncate max-w-full px-1">{{ item.shortLabel }}</span>
        </RouterLink>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.nav-link:hover {
  color: var(--color-text);
  background: var(--color-surface-overlay);
}

.nav-link-active {
  color: var(--color-text) !important;
  background: var(--color-accent-soft) !important;
}

.mobile-nav-link-active {
  color: var(--color-accent) !important;
}

.mobile-nav-link-active span:first-child {
  opacity: 1;
}

.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 30;
}

.profile-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 0.5rem);
  min-width: 12rem;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: var(--shadow-elevated);
  z-index: 50;
}

.menu-item {
  display: block;
  padding: 0.65rem 1rem;
  font-size: 0.875rem;
  color: var(--color-text-muted);
  transition: background 0.15s, color 0.15s;
}

.menu-item:hover {
  background: var(--color-surface-overlay);
  color: var(--color-text);
}

.menu-item-danger:hover {
  color: var(--color-loss);
}
</style>
