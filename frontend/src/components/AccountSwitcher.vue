<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useSettingsStore } from '../stores/settings'
import { useTradesStore } from '../stores/trades'
import AccountTypeBadge from '../components/AccountTypeBadge.vue'

const settingsStore = useSettingsStore()
const tradesStore = useTradesStore()
const open = ref(false)

onMounted(() => {
  if (!settingsStore.accounts.length) {
    settingsStore.fetchAccounts()
  }
})

async function selectAccount(id) {
  if (id === settingsStore.activeAccountId) {
    open.value = false
    return
  }
  await settingsStore.activateAccount(id)
  await Promise.all([
    tradesStore.fetchTrades(),
    tradesStore.fetchPerformance('day'),
    tradesStore.fetchPairStats('all'),
    tradesStore.fetchTimeline('month'),
  ])
  open.value = false
}

function toggle() {
  open.value = !open.value
}

function labelFor(account) {
  return account.name || account.accountId || 'Compte'
}
</script>

<template>
  <div v-if="settingsStore.accounts.length" class="account-switcher relative">
    <button
      type="button"
      class="switcher-btn"
      :disabled="settingsStore.loading"
      @click="toggle"
    >
      <span class="switcher-label hidden lg:inline">Compte</span>
      <span class="switcher-value">{{ settingsStore.settings ? labelFor(settingsStore.settings) : '…' }}</span>
      <AccountTypeBadge
        v-if="settingsStore.settings"
        :type="settingsStore.settings.accountType || 'demo'"
        :balance-currency="settingsStore.settings.balanceCurrency || 'usd'"
        class="switcher-badge"
      />
      <span class="switcher-chevron text-text-muted">▾</span>
    </button>

    <div v-if="open" class="switcher-menu">
      <button
        v-for="account in settingsStore.accounts"
        :key="account.id"
        type="button"
        class="switcher-item"
        :class="{ 'switcher-item-active': account.id === settingsStore.activeAccountId }"
        @click="selectAccount(account.id)"
      >
        <span class="min-w-0 flex-1 text-left">
          <span class="block text-sm font-medium truncate">{{ labelFor(account) }}</span>
          <span v-if="account.accountId" class="block text-xs text-text-muted truncate">ID {{ account.accountId }}</span>
        </span>
        <AccountTypeBadge
          :type="account.accountType || 'demo'"
          :balance-currency="account.balanceCurrency || 'usd'"
        />
      </button>
      <RouterLink
        to="/parametres"
        class="switcher-footer"
        @click="open = false"
      >
        Gérer les comptes →
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.account-switcher {
  z-index: 20;
}

.switcher-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  max-width: 14rem;
  padding: 0.4rem 0.65rem;
  border-radius: 9999px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-overlay);
  color: var(--color-text);
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.switcher-btn:hover:not(:disabled) {
  border-color: var(--color-accent);
}

.switcher-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

.switcher-label {
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 0.65rem;
}

.switcher-value {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 7rem;
}

.switcher-badge {
  flex-shrink: 0;
}

.switcher-chevron {
  font-size: 0.65rem;
  flex-shrink: 0;
}

.switcher-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 0.4rem);
  min-width: 14rem;
  max-width: 18rem;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: var(--shadow-elevated);
}

.switcher-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.65rem 0.85rem;
  border: none;
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  transition: background 0.15s;
}

.switcher-item:hover {
  background: var(--color-surface-overlay);
}

.switcher-item-active {
  background: var(--color-accent-soft) !important;
}

.switcher-footer {
  display: block;
  padding: 0.55rem 0.85rem;
  font-size: 0.75rem;
  color: var(--color-accent);
  border-top: 1px solid var(--color-border-subtle);
  text-decoration: none;
}

.switcher-footer:hover {
  background: var(--color-surface-overlay);
}
</style>
