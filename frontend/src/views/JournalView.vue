<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useTradesStore } from '../stores/trades'
import { useSettingsStore } from '../stores/settings'
import OutcomeBadge from '../components/OutcomeBadge.vue'
import PnlValue from '../components/PnlValue.vue'
import TradeEditModal from '../components/TradeEditModal.vue'
import TradeImagesDisplay from '../components/TradeImagesDisplay.vue'

const tradesStore = useTradesStore()
const settingsStore = useSettingsStore()
const filterPair = ref('')
const editingTrade = ref(null)

const balanceCurrency = computed(() => settingsStore.settings?.balanceCurrency || 'usd')

onMounted(async () => {
  await settingsStore.fetchSettings()
  await tradesStore.fetchTrades()
})

watch(() => settingsStore.activeAccountId, async () => {
  await tradesStore.fetchTrades(filterPair.value || null)
})

async function onFilterChange() {
  await tradesStore.fetchTrades(filterPair.value || null)
}

function openEdit(trade) {
  editingTrade.value = trade
}

function closeEdit() {
  editingTrade.value = null
}

async function saveEdit(payload) {
  if (!editingTrade.value) return
  await tradesStore.updateTrade(editingTrade.value.id, payload)
  closeEdit()
}

async function removeTrade(id) {
  if (confirm('Supprimer ce trade ?')) {
    await tradesStore.deleteTrade(id)
  }
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateShort(iso) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="page p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
    <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
      <div>
        <h2 class="text-xl sm:text-2xl font-semibold tracking-tight">Journal</h2>
        <p class="text-text-muted text-sm mt-1">Historique des positions clôturées</p>
      </div>
      <select
        v-model="filterPair"
        class="text-sm bg-surface-overlay border border-border rounded-lg px-3 py-2 text-text-muted w-full sm:w-auto sm:min-w-[180px]"
        @change="onFilterChange"
      >
        <option value="">Toutes les paires</option>
        <option
          v-for="pair in settingsStore.settings?.currencyPairs || []"
          :key="pair"
          :value="pair"
        >
          {{ pair }}
        </option>
      </select>
    </header>

    <div v-if="tradesStore.loading" class="text-text-muted text-sm">Chargement…</div>

    <template v-else-if="tradesStore.trades.length">
      <!-- Mobile: cards -->
      <div class="md:hidden space-y-3">
        <article
          v-for="trade in tradesStore.trades"
          :key="`card-${trade.id}`"
          class="panel p-4"
        >
          <div class="flex items-start justify-between gap-3 mb-3">
            <div>
              <p class="font-semibold">{{ trade.pair }}</p>
              <p class="text-xs text-text-muted mt-0.5">{{ formatDateShort(trade.closedAt) }}</p>
            </div>
            <div class="text-right shrink-0">
              <PnlValue :value="trade.profitLoss" :currency="balanceCurrency" show-usd-equivalent />
              <div class="mt-1"><OutcomeBadge :outcome="trade.outcome" /></div>
            </div>
          </div>

          <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-4">
            <div>
              <dt class="text-text-muted">Entrée</dt>
              <dd class="tabular-nums mt-0.5">{{ trade.entryPrice }}</dd>
            </div>
            <div>
              <dt class="text-text-muted">Positions</dt>
              <dd class="tabular-nums mt-0.5">{{ trade.positionCount }}</dd>
            </div>
            <div>
              <dt class="text-text-muted">TP</dt>
              <dd class="tabular-nums text-profit mt-0.5">{{ trade.takeProfit }}</dd>
            </div>
            <div>
              <dt class="text-text-muted">SL</dt>
              <dd class="tabular-nums text-loss mt-0.5">{{ trade.stopLoss }}</dd>
            </div>
            <div v-if="trade.mood" class="col-span-2">
              <dt class="text-text-muted">Humeur</dt>
              <dd class="mt-0.5">{{ trade.mood }}</dd>
            </div>
            <div v-if="trade.notes" class="col-span-2">
              <dt class="text-text-muted">Notes</dt>
              <dd class="mt-0.5 whitespace-pre-wrap">{{ trade.notes }}</dd>
            </div>
          </dl>

          <TradeImagesDisplay
            v-if="trade.beforeImage || trade.afterImage"
            class="mb-4"
            :before-image="trade.beforeImage"
            :after-image="trade.afterImage"
          />

          <div class="flex gap-2">
            <button type="button" class="action-btn flex-1" @click="openEdit(trade)">
              Modifier
            </button>
            <!-- <button type="button" class="action-btn action-btn-danger flex-1" @click="removeTrade(trade.id)">
              Supprimer
            </button> -->
          </div>
        </article>
      </div>

      <!-- Desktop: table -->
      <div class="panel overflow-hidden hidden md:block">
        <div class="overflow-x-auto">
          <table class="w-full text-sm min-w-[960px]">
            <thead>
              <tr class="border-b border-border text-left text-xs uppercase tracking-wider text-text-muted">
                <th class="px-4 lg:px-5 py-3 font-medium">Date</th>
                <th class="px-4 lg:px-5 py-3 font-medium">Paire</th>
                <th class="px-4 lg:px-5 py-3 font-medium">Entrée</th>
                <th class="px-4 lg:px-5 py-3 font-medium">TP / SL</th>
                <th class="px-4 lg:px-5 py-3 font-medium">Pos.</th>
                <th class="px-4 lg:px-5 py-3 font-medium">Issue</th>
                <th class="px-4 lg:px-5 py-3 font-medium">Humeur</th>
                <th class="px-4 lg:px-5 py-3 font-medium">Notes</th>
                <th class="px-4 lg:px-5 py-3 font-medium">Captures</th>
                <th class="px-4 lg:px-5 py-3 font-medium text-right">P&L</th>
                <th class="px-4 lg:px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="trade in tradesStore.trades" :key="trade.id">
                <tr class="border-b border-border-subtle last:border-0 hover:bg-surface-overlay/50 transition-colors">
                  <td class="px-4 lg:px-5 py-4 text-text-muted whitespace-nowrap">{{ formatDate(trade.closedAt) }}</td>
                  <td class="px-4 lg:px-5 py-4 font-medium">{{ trade.pair }}</td>
                  <td class="px-4 lg:px-5 py-4 tabular-nums text-text-muted">{{ trade.entryPrice }}</td>
                  <td class="px-4 lg:px-5 py-4 tabular-nums text-text-muted text-xs">
                    <span class="text-profit">{{ trade.takeProfit }}</span>
                    /
                    <span class="text-loss">{{ trade.stopLoss }}</span>
                  </td>
                  <td class="px-4 lg:px-5 py-4 tabular-nums">{{ trade.positionCount }}</td>
                  <td class="px-4 lg:px-5 py-4"><OutcomeBadge :outcome="trade.outcome" /></td>
                  <td class="px-4 lg:px-5 py-4 text-text-muted max-w-[12rem]">
                    <span v-if="trade.mood" class="line-clamp-2" :title="trade.mood">{{ trade.mood }}</span>
                    <span v-else class="text-text-muted/50">—</span>
                  </td>
                  <td class="px-4 lg:px-5 py-4 text-text-muted max-w-[14rem]">
                    <span v-if="trade.notes" class="line-clamp-2 whitespace-pre-wrap" :title="trade.notes">{{ trade.notes }}</span>
                    <span v-else class="text-text-muted/50">—</span>
                  </td>
                  <td class="px-4 lg:px-5 py-4">
                    <TradeImagesDisplay
                      v-if="trade.beforeImage || trade.afterImage"
                      variant="inline"
                      :before-image="trade.beforeImage"
                      :after-image="trade.afterImage"
                    />
                    <span v-else class="text-text-muted/50">—</span>
                  </td>
                  <td class="px-4 lg:px-5 py-4 text-right">
                    <PnlValue :value="trade.profitLoss" :currency="balanceCurrency" show-usd-equivalent />
                  </td>
                  <td class="px-4 lg:px-5 py-4">
                    <div class="flex items-center justify-end gap-2">
                      <button type="button" class="action-btn" @click="openEdit(trade)">Modifier</button>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <div v-else class="panel p-8 sm:p-12 text-center">
      <p class="text-text-muted">Aucun trade enregistré.</p>
      <RouterLink
        to="/ajouter"
        class="inline-block mt-4 text-sm text-accent hover:underline"
      >
        Ajouter votre premier trade →
      </RouterLink>
    </div>

    <TradeEditModal
      v-if="editingTrade"
      :trade="editingTrade"
      :pairs="settingsStore.settings?.currencyPairs || []"
      :currency="balanceCurrency"
      @close="closeEdit"
      @save="saveEdit"
    />
  </div>
</template>

<style scoped>
.panel {
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border-subtle);
  border-radius: 12px;
}

.action-btn {
  font-size: 0.75rem;
  padding: 0.5rem 0.6rem;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-overlay);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.15s;
}

.action-btn:hover {
  color: var(--color-text);
  border-color: var(--color-accent);
}

.action-btn-danger:hover {
  color: var(--color-loss);
  border-color: var(--color-loss);
}
</style>
