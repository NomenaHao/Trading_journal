<script setup>
import { ref, watch } from 'vue'
import { currencyLabel } from '../utils/currency'
import TradeImageSlot from './TradeImageSlot.vue'

const props = defineProps({
  trade: { type: Object, required: true },
  pairs: { type: Array, default: () => [] },
  currency: { type: String, default: 'usd' },
})

const emit = defineEmits(['close', 'save'])

const form = ref(emptyForm())
const warning = ref('')
const saving = ref(false)
const beforeImage = ref('')
const afterImage = ref('')
const beforeChanged = ref(false)
const afterChanged = ref(false)

function emptyForm() {
  return {
    pair: '',
    entryPrice: '',
    takeProfit: '',
    stopLoss: '',
    positionCount: 1,
    profitLoss: '',
    outcome: '',
    notes: '',
    mood: '',
    closedAt: '',
  }
}

function toLocalDatetime(iso) {
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

watch(
  () => props.trade,
  (trade) => {
    if (!trade) return
    form.value = {
      pair: trade.pair,
      entryPrice: String(trade.entryPrice),
      takeProfit: String(trade.takeProfit),
      stopLoss: String(trade.stopLoss),
      positionCount: trade.positionCount,
      profitLoss: String(trade.profitLoss),
      outcome: trade.outcome,
      notes: trade.notes || '',
      mood: trade.mood || '',
      closedAt: toLocalDatetime(trade.closedAt),
    }
    beforeImage.value = trade.beforeImage || ''
    afterImage.value = trade.afterImage || ''
    beforeChanged.value = false
    afterChanged.value = false
    warning.value = ''
  },
  { immediate: true }
)

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
    warning.value = `Un break-even est généralement proche de 0 ${currencyLabel(props.currency)}.`
  }
}

function selectOutcome(outcome) {
  form.value.outcome = outcome
  validateCoherence()
}

function updateBeforeImage(value) {
  beforeImage.value = value
  beforeChanged.value = true
}

function removeBeforeImage() {
  beforeImage.value = ''
  beforeChanged.value = true
}

function updateAfterImage(value) {
  afterImage.value = value
  afterChanged.value = true
}

function removeAfterImage() {
  afterImage.value = ''
  afterChanged.value = true
}

async function submit() {
  validateCoherence()
  if (!form.value.outcome) {
    warning.value = 'Sélectionnez une issue : TP, SL ou BE.'
    return
  }

  saving.value = true
  try {
    emit('save', {
      pair: form.value.pair,
      entryPrice: String(form.value.entryPrice).trim(),
      takeProfit: String(form.value.takeProfit).trim(),
      stopLoss: String(form.value.stopLoss).trim(),
      positionCount: Number(form.value.positionCount),
      profitLoss: String(form.value.profitLoss).trim(),
      outcome: form.value.outcome,
      notes: form.value.notes,
      mood: form.value.mood,
      closedAt: new Date(form.value.closedAt).toISOString(),
      beforeImage: beforeChanged.value ? beforeImage.value : undefined,
      afterImage: afterChanged.value ? afterImage.value : undefined,
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <header class="modal-header">
        <h3 class="text-lg font-semibold">Modifier le trade</h3>
        <button type="button" class="close-btn" @click="emit('close')">✕</button>
      </header>

      <form class="space-y-4" @submit.prevent="submit">
        <div>
          <label class="field-label">Paire</label>
          <select v-model="form.pair" class="field-input" required>
            <option v-for="pair in pairs" :key="pair" :value="pair">{{ pair }}</option>
          </select>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="field-label">Entrée</label>
            <input v-model="form.entryPrice" type="text" inputmode="decimal" class="field-input" required />
          </div>
          <div>
            <label class="field-label">Take Profit</label>
            <input v-model="form.takeProfit" type="text" inputmode="decimal" class="field-input" required />
          </div>
          <div>
            <label class="field-label">Stop Loss</label>
            <input v-model="form.stopLoss" type="text" inputmode="decimal" class="field-input" required />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="field-label">Positions</label>
            <input v-model.number="form.positionCount" type="number" min="1" class="field-input" required />
          </div>
          <div>
            <label class="field-label">Résultat ({{ currencyLabel(currency) }})</label>
            <input
              v-model="form.profitLoss"
              type="text"
              inputmode="decimal"
              class="field-input"
              required
              @input="validateCoherence"
            />
          </div>
        </div>

        <div>
          <label class="field-label">Date de clôture</label>
          <input v-model="form.closedAt" type="datetime-local" class="field-input" required />
        </div>

        <div>
          <label class="field-label mb-2 block">Issue</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              type="button"
              class="outcome-btn"
              :class="{ 'outcome-tp-active': form.outcome === 'TP' }"
              @click="selectOutcome('TP')"
            >TP</button>
            <button
              type="button"
              class="outcome-btn"
              :class="{ 'outcome-sl-active': form.outcome === 'SL' }"
              @click="selectOutcome('SL')"
            >SL</button>
            <button
              type="button"
              class="outcome-btn"
              :class="{ 'outcome-be-active': form.outcome === 'BE' }"
              @click="selectOutcome('BE')"
            >BE</button>
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
          <label class="field-label mb-2 block">Captures (before / after)</label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TradeImageSlot
              label="Avant"
              optional
              :preview="beforeImage"
              @update="updateBeforeImage"
              @remove="removeBeforeImage"
            />
            <TradeImageSlot
              label="Après"
              optional
              :preview="afterImage"
              @update="updateAfterImage"
              @remove="removeAfterImage"
            />
          </div>
        </div>

        <div>
          <label class="field-label">Notes</label>
          <textarea v-model="form.notes" rows="2" class="field-input resize-none" />
        </div>

        <p v-if="warning" class="text-xs text-loss">{{ warning }}</p>

        <div class="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
          <button
            type="button"
            class="flex-1 py-2.5 rounded-lg border border-border text-sm text-text-muted hover:text-text transition-colors"
            @click="emit('close')"
          >
            Annuler
          </button>
          <button
            type="submit"
            class="flex-1 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
            :disabled="saving"
          >
            {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 50;
  padding: 1rem;
  padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0));
}

@media (min-width: 640px) {
  .modal-overlay {
    align-items: center;
  }
}

.modal {
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 1.5rem;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}

.close-btn {
  color: var(--color-text-muted);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem;
}

.close-btn:hover {
  color: var(--color-text);
}

.field-label {
  display: block;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  margin-bottom: 0.4rem;
}

.field-input {
  width: 100%;
  background: var(--color-surface-overlay);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.55rem 0.7rem;
  color: var(--color-text);
  font-size: 0.875rem;
  outline: none;
}

.field-input:focus {
  border-color: var(--color-accent);
}

.outcome-btn {
  padding: 0.6rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-overlay);
  color: var(--color-text-muted);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.outcome-tp-active {
  border-color: var(--color-profit);
  background: var(--color-profit-soft);
  color: var(--color-profit);
}

.outcome-sl-active {
  border-color: var(--color-loss);
  background: var(--color-loss-soft);
  color: var(--color-loss);
}

.outcome-be-active {
  border-color: var(--color-neutral);
  background: var(--color-neutral-soft);
  color: var(--color-neutral);
}
</style>
