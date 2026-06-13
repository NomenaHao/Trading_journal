<script setup>
import { ref, watch, onMounted } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { useTradesStore } from '../stores/trades'
import AccountTypeBadge from '../components/AccountTypeBadge.vue'

const settingsStore = useSettingsStore()
const tradesStore = useTradesStore()

const form = ref(emptyForm())
const newPair = ref('')
const saved = ref(false)
const showNewAccount = ref(false)
const newAccount = ref({ name: '', accountId: '' })
const formError = ref('')

function emptyForm() {
  return {
    name: '',
    startingCapital: 1000,
    riskPerTrade: 5,
    currencyPairs: ['EUR/USD'],
    dailyGoal: 5,
    monthlyGoal: 100,
    accountId: '',
    broker: '',
    brokerServer: '',
    accountType: 'demo',
  }
}

function loadFormFromSettings() {
  if (settingsStore.settings) {
    form.value = { ...settingsStore.settings }
  }
}

onMounted(async () => {
  await settingsStore.fetchAccounts()
  loadFormFromSettings()
})

watch(() => settingsStore.activeAccountId, () => {
  loadFormFromSettings()
  formError.value = ''
})

function addPair() {
  const pair = newPair.value.trim().toUpperCase()
  if (pair && !form.value.currencyPairs.includes(pair)) {
    form.value.currencyPairs.push(pair)
    newPair.value = ''
  }
}

function removePair(pair) {
  if (form.value.currencyPairs.length > 1) {
    form.value.currencyPairs = form.value.currencyPairs.filter((p) => p !== pair)
  }
}

async function selectAccount(id) {
  if (id === settingsStore.activeAccountId) return
  await settingsStore.activateAccount(id)
  await tradesStore.fetchTrades()
}

async function save() {
  formError.value = ''
  try {
    await settingsStore.saveSettings(form.value)
    saved.value = true
    setTimeout(() => { saved.value = false }, 2500)
  } catch (e) {
    formError.value = e.response?.data?.error || settingsStore.error
  }
}

async function createAccount() {
  formError.value = ''
  if (!newAccount.value.name.trim() || !newAccount.value.accountId.trim()) {
    formError.value = 'Nom et ID du compte requis pour créer un compte.'
    return
  }
  try {
    await settingsStore.createAccount({
      name: newAccount.value.name.trim(),
      accountId: newAccount.value.accountId.trim(),
      broker: form.value.broker,
      brokerServer: form.value.brokerServer,
      accountType: form.value.accountType,
      startingCapital: form.value.startingCapital,
      riskPerTrade: form.value.riskPerTrade,
      currencyPairs: [...form.value.currencyPairs],
      dailyGoal: form.value.dailyGoal,
      monthlyGoal: form.value.monthlyGoal,
    })
    newAccount.value = { name: '', accountId: '' }
    showNewAccount.value = false
    loadFormFromSettings()
    await tradesStore.fetchTrades()
  } catch (e) {
    formError.value = e.response?.data?.error || settingsStore.error
  }
}

async function removeAccount(id) {
  if (!confirm('Supprimer ce compte et tous ses trades associés ?')) return
  formError.value = ''
  try {
    await settingsStore.deleteAccount(id)
    loadFormFromSettings()
    await tradesStore.fetchTrades()
  } catch (e) {
    formError.value = e.response?.data?.error || settingsStore.error
  }
}
</script>

<template>
  <div class="page p-4 sm:p-6 lg:p-8 max-w-xl mx-auto w-full">
    <header class="mb-6 sm:mb-8">
      <h2 class="text-xl sm:text-2xl font-semibold tracking-tight">Paramètres trading</h2>
      <p class="text-text-muted text-sm mt-1">Comptes, capital, risque et objectifs</p>
    </header>

    <section class="panel p-4 sm:p-5 mb-5">
      <div class="flex items-center justify-between gap-3 mb-4">
        <h3 class="text-sm font-medium">Mes comptes</h3>
        <button
          type="button"
          class="text-xs text-accent hover:underline"
          @click="showNewAccount = !showNewAccount"
        >
          {{ showNewAccount ? 'Annuler' : '+ Nouveau compte' }}
        </button>
      </div>

      <div class="space-y-2">
        <div
          v-for="account in settingsStore.accounts"
          :key="account.id"
          class="account-row"
          :class="{ 'account-row-active': account.id === settingsStore.activeAccountId }"
        >
          <button
            type="button"
            class="account-row-main"
            @click="selectAccount(account.id)"
          >
            <span class="min-w-0 flex-1 text-left">
              <span class="block text-sm font-medium truncate">{{ account.name }}</span>
              <span class="block text-xs text-text-muted truncate">ID {{ account.accountId }}</span>
            </span>
            <AccountTypeBadge :type="account.accountType || 'demo'" />
          </button>
          <button
            v-if="settingsStore.accounts.length > 1"
            type="button"
            class="account-row-delete"
            title="Supprimer"
            @click="removeAccount(account.id)"
          >
            ✕
          </button>
        </div>
      </div>

      <form v-if="showNewAccount" class="mt-4 pt-4 border-t border-border-subtle space-y-3" @submit.prevent="createAccount">
        <div>
          <label class="field-label">Nom du compte</label>
          <input v-model="newAccount.name" type="text" class="field-input" placeholder="ex: FTMO Challenge" required />
        </div>
        <div>
          <label class="field-label">ID du compte</label>
          <input v-model="newAccount.accountId" type="text" class="field-input" placeholder="ex: 458921" required />
        </div>
        <button
          type="submit"
          class="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
          :disabled="settingsStore.loading"
        >
          Créer le compte
        </button>
      </form>
    </section>

    <form class="panel p-4 sm:p-6 space-y-5" @submit.prevent="save">
      <div>
        <label class="field-label">Nom du compte actif</label>
        <input v-model="form.name" type="text" class="field-input" placeholder="ex: Compte principal" required />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="field-label">Capital de départ (USD)</label>
          <input v-model.number="form.startingCapital" type="number" min="0" step="any" class="field-input" required />
        </div>
        <div>
          <label class="field-label">Risque par trade (%)</label>
          <input v-model.number="form.riskPerTrade" type="number" min="0.1" max="100" step="any" class="field-input" required />
        </div>
      </div>

      <p v-if="form.startingCapital && form.riskPerTrade" class="text-xs text-text-muted -mt-2">
        Risque max par trade : {{ ((form.startingCapital * form.riskPerTrade) / 100).toFixed(2) }} USD
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="field-label">Objectif journalier (USD)</label>
          <input v-model.number="form.dailyGoal" type="number" step="any" class="field-input" required />
        </div>
        <div>
          <label class="field-label">Objectif mensuel (USD)</label>
          <input v-model.number="form.monthlyGoal" type="number" step="any" class="field-input" required />
        </div>
      </div>

      <div>
        <label class="field-label mb-3 block">Type de compte</label>
        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            class="account-type-btn"
            :class="{ 'account-type-demo-active': form.accountType === 'demo' }"
            @click="form.accountType = 'demo'"
          >
            <AccountTypeBadge type="demo" />
            <span class="text-xs text-text-muted mt-2">Compte démo</span>
          </button>
          <button
            type="button"
            class="account-type-btn"
            :class="{ 'account-type-real-active': form.accountType === 'real' }"
            @click="form.accountType = 'real'"
          >
            <AccountTypeBadge type="real" />
            <span class="text-xs text-text-muted mt-2">Compte réel</span>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="field-label">ID du compte</label>
          <input v-model="form.accountId" type="text" class="field-input" placeholder="ex: 1212121" required />
        </div>
        <div>
          <label class="field-label">Broker</label>
          <input v-model="form.broker" type="text" class="field-input" placeholder="ex: IC Markets" />
        </div>
      </div>

      <div>
        <label class="field-label">Serveur broker</label>
        <input
          v-model="form.brokerServer"
          type="text"
          class="field-input"
          placeholder="ex: EnxessMT5-Real"
        />
      </div>

      <div>
        <label class="field-label">Paires de devises</label>
        <div class="flex flex-wrap gap-2 mb-3">
          <span
            v-for="pair in form.currencyPairs"
            :key="pair"
            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-surface-overlay border border-border"
          >
            {{ pair }}
            <button
              v-if="form.currencyPairs.length > 1"
              type="button"
              class="text-text-muted hover:text-loss"
              @click="removePair(pair)"
            >
              ✕
            </button>
          </span>
        </div>
        <div class="flex flex-col sm:flex-row gap-2">
          <input
            v-model="newPair"
            type="text"
            class="field-input flex-1"
            placeholder="ex: XAU/USD"
            @keyup.enter.prevent="addPair"
          />
          <button
            type="button"
            class="px-4 py-2 rounded-lg border border-border text-sm text-text-muted hover:text-text transition-colors shrink-0"
            @click="addPair"
          >
            Ajouter
          </button>
        </div>
      </div>

      <p v-if="formError" class="text-xs text-loss">{{ formError }}</p>
      <p v-if="saved" class="text-xs text-profit">Paramètres sauvegardés.</p>

      <button
        type="submit"
        class="w-full py-3 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
        :disabled="settingsStore.loading"
      >
        Sauvegarder
      </button>
    </form>
  </div>
</template>

<style scoped>
.panel {
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border-subtle);
  border-radius: 12px;
}

.account-row {
  display: flex;
  align-items: stretch;
  gap: 0.35rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  overflow: hidden;
}

.account-row-active {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
}

.account-row-main {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 0.75rem;
  border: none;
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
}

.account-row-delete {
  padding: 0 0.65rem;
  border: none;
  border-left: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}

.account-row-delete:hover {
  color: var(--color-loss);
  background: var(--color-loss-soft);
}

.field-label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  margin-bottom: 0.5rem;
}

.field-input {
  width: 100%;
  background: var(--color-surface-overlay);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.625rem 0.75rem;
  color: var(--color-text);
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.15s;
}

.field-input:focus {
  border-color: var(--color-accent);
}

.account-type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 1rem;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-overlay);
  cursor: pointer;
  transition: all 0.15s;
}

.account-type-demo-active {
  border-color: #f59e0b80 !important;
  background: #f59e0b10 !important;
}

.account-type-real-active {
  border-color: #34d39980 !important;
  background: var(--color-profit-soft) !important;
}
</style>
