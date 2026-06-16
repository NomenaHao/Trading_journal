<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTradesStore } from '../stores/trades'
import { useSettingsStore } from '../stores/settings'
import { currencyLabel, formatMoney } from '../utils/currency'
import TradeImageSlot from '../components/TradeImageSlot.vue'

const router = useRouter()
const tradesStore = useTradesStore()
const settingsStore = useSettingsStore()

const form = ref({
  pair: '',
  entryPrice: '',
  takeProfit: '',
  stopLoss: '',
  positionCount: 1,
  profitLoss: '',
  outcome: '',
  notes: '',
  mood: '',
})

const warning = ref('')
const saving = ref(false)
const success = ref(false)
const beforeImage = ref('')
const afterImage = ref('')

onMounted(async () => {
  await settingsStore.fetchSettings()
  syncPairFromSettings()
})

function syncPairFromSettings() {
  if (settingsStore.settings?.currencyPairs?.length) {
    form.value.pair = settingsStore.settings.currencyPairs[0]
  }
}

watch(() => settingsStore.activeAccountId, syncPairFromSettings)

const balanceCurrency = computed(() => settingsStore.settings?.balanceCurrency || 'usd')
const curLabel = computed(() => currencyLabel(balanceCurrency.value))

const riskAmount = computed(() => {
  if (!settingsStore.settings) return null
  return (settingsStore.settings.startingCapital * settingsStore.settings.riskPerTrade) / 100
})

function parsePnl(value) {
  const str = String(value).trim().replace(',', '.')
  const n = Number(str)
  return Number.isFinite(n) ? n : NaN
}

function validateCoherence() {
  const pnl = parsePnl(form.value.profitLoss)
  const outcome = form.value.outcome
  warning.value = ''

  if (!outcome || isNaN(pnl)) return

  if (outcome === 'TP' && pnl <= 0) {
    warning.value = 'Un trade TP devrait avoir un gain positif.'
  } else if (outcome === 'SL' && pnl >= 0) {
    warning.value = 'Un trade SL devrait avoir une perte négative.'
  } else if (outcome === 'BE' && Math.abs(pnl) > 1) {
    warning.value = `Un break-even est généralement proche de 0 ${curLabel.value}.`
  }

  if (riskAmount.value && outcome === 'SL' && Math.abs(pnl) > riskAmount.value * 1.5) {
    warning.value = `Perte supérieure au risque prévu (${formatMoney(riskAmount.value, balanceCurrency.value, { showSign: false })}).`
  }
}

async function submit() {
  validateCoherence()
  if (!form.value.outcome) {
    warning.value = 'Sélectionnez une issue : TP, SL ou BE.'
    return
  }

  saving.value = true
  success.value = false

  try {
    await tradesStore.addTrade({
      pair: form.value.pair,
      entryPrice: String(form.value.entryPrice).trim(),
      takeProfit: String(form.value.takeProfit).trim(),
      stopLoss: String(form.value.stopLoss).trim(),
      positionCount: Number(form.value.positionCount),
      profitLoss: String(form.value.profitLoss).trim(),
      outcome: form.value.outcome,
      notes: form.value.notes,
      mood: form.value.mood,
      beforeImage: beforeImage.value || undefined,
      afterImage: afterImage.value || undefined,
    })
    success.value = true
    setTimeout(() => router.push('/journal'), 800)
  } catch {
    warning.value = 'Erreur lors de l\'enregistrement.'
  } finally {
    saving.value = false
  }
}

function selectOutcome(outcome) {
  form.value.outcome = outcome
  validateCoherence()
}
</script>

<template>
  <div class="page p-4 sm:p-6 lg:p-8 max-w-xl mx-auto w-full">
    <header class="mb-6 sm:mb-8">
      <h2 class="text-xl sm:text-2xl font-semibold tracking-tight">Nouveau trade</h2>
      <p class="text-text-muted text-sm mt-1">Enregistrer une position clôturée</p>
    </header>

    <form class="panel p-4 sm:p-6 space-y-5" @submit.prevent="submit">
      <div>
        <label class="field-label">Paire de devises</label>
        <select v-model="form.pair" class="field-input" required>
          <option
            v-for="pair in settingsStore.settings?.currencyPairs || []"
            :key="pair"
            :value="pair"
          >
            {{ pair }}
          </option>
        </select>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label class="field-label">Entrée</label>
          <input v-model="form.entryPrice" type="text" inputmode="decimal" class="field-input" placeholder="ex: 1.232" required />
        </div>
        <div>
          <label class="field-label">Take Profit</label>
          <input v-model="form.takeProfit" type="text" inputmode="decimal" class="field-input" placeholder="ex: 1.250" required />
        </div>
        <div>
          <label class="field-label">Stop Loss</label>
          <input v-model="form.stopLoss" type="text" inputmode="decimal" class="field-input" placeholder="ex: 1.210" required />
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="field-label">Nombre de positions</label>
          <input v-model.number="form.positionCount" type="number" min="1" class="field-input" required />
        </div>
        <div>
          <label class="field-label">Résultat ({{ curLabel }})</label>
          <input
            v-model="form.profitLoss"
            type="text"
            inputmode="decimal"
            class="field-input"
            placeholder="ex: 15 ou -8"
            required
            @input="validateCoherence"
          />
        </div>
      </div>

      <div>
        <label class="field-label mb-3 block">Issue du trade</label>
        <div class="grid grid-cols-3 gap-3">
          <button
            type="button"
            class="outcome-btn"
            :class="{ 'outcome-tp-active': form.outcome === 'TP' }"
            @click="selectOutcome('TP')"
          >
            <span class="text-lg font-semibold">TP</span>
            <span class="text-xs opacity-70">Gain</span>
          </button>
          <button
            type="button"
            class="outcome-btn"
            :class="{ 'outcome-sl-active': form.outcome === 'SL' }"
            @click="selectOutcome('SL')"
          >
            <span class="text-lg font-semibold">SL</span>
            <span class="text-xs opacity-70">Perte</span>
          </button>
          <button
            type="button"
            class="outcome-btn"
            :class="{ 'outcome-be-active': form.outcome === 'BE' }"
            @click="selectOutcome('BE')"
          >
            <span class="text-lg font-semibold">BE</span>
            <span class="text-xs opacity-70">Break-even</span>
          </button>
        </div>
      </div>

      <div>
        <label class="field-label">Humeur (optionnel)</label>
        <input
          v-model="form.mood"
          type="text"
          class="field-input"
          placeholder="ex: Confiant, stressé, calme…"
          maxlength="120"
        />
      </div>

      <div>
        <label class="field-label mb-3 block">Captures (before / after)</label>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TradeImageSlot
            label="Avant"
            optional
            :preview="beforeImage"
            @update="beforeImage = $event"
            @remove="beforeImage = ''"
          />
          <TradeImageSlot
            label="Après"
            optional
            :preview="afterImage"
            @update="afterImage = $event"
            @remove="afterImage = ''"
          />
        </div>
      </div>

      <div>
        <label class="field-label">Notes (optionnel)</label>
        <textarea v-model="form.notes" rows="2" class="field-input resize-none" />
      </div>

      <p v-if="warning" class="text-xs text-loss">{{ warning }}</p>
      <p v-if="success" class="text-xs text-profit">Trade enregistré avec succès.</p>

      <button
        type="submit"
        class="w-full py-3 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        :disabled="saving"
      >
        {{ saving ? 'Enregistrement…' : 'Enregistrer le trade' }}
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

.outcome-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 1rem;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-overlay);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.15s;
}

.outcome-btn:hover {
  border-color: var(--color-border);
  color: var(--color-text);
}

.outcome-tp-active {
  border-color: var(--color-profit) !important;
  background: var(--color-profit-soft) !important;
  color: var(--color-profit) !important;
}

.outcome-sl-active {
  border-color: var(--color-loss) !important;
  background: var(--color-loss-soft) !important;
  color: var(--color-loss) !important;
}

.outcome-be-active {
  border-color: var(--color-neutral) !important;
  background: var(--color-neutral-soft) !important;
  color: var(--color-neutral) !important;
}
</style>
