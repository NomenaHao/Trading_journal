<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { useTradesStore } from '../stores/trades'
import { useSettingsStore } from '../stores/settings'
import PeriodTabs from '../components/PeriodTabs.vue'
import StatCard from '../components/StatCard.vue'
import TimelineChart from '../components/TimelineChart.vue'
import PerformanceCalendar from '../components/PerformanceCalendar.vue'
import AccountTypeBadge from '../components/AccountTypeBadge.vue'
import { formatMoney, formatUsdEquivalent } from '../utils/currency'

const tradesStore = useTradesStore()
const settingsStore = useSettingsStore()

const period = ref('day')
const timelinePeriod = ref('month')
const showAccountId = ref(false)

const periodOptions = [
  { value: 'day', label: 'Jour' },
  { value: 'week', label: 'Semaine' },
  { value: 'month', label: 'Mois' },
  { value: 'year', label: 'Année' },
]

async function load() {
  await Promise.all([
    settingsStore.fetchSettings(),
    tradesStore.fetchPerformance(period.value),
    tradesStore.fetchPairStats('all'),
    tradesStore.fetchTimeline(timelinePeriod.value),
  ])
}

function toggleAccountIdVisibility() {
  showAccountId.value = !showAccountId.value
}
const isRealAccount = computed(
  () => settingsStore.settings?.accountType === 'real'
)
watch(period, (p) => tradesStore.fetchPerformance(p))
watch(timelinePeriod, (p) => tradesStore.fetchTimeline(p))
watch(() => settingsStore.activeAccountId, () => load())
watch(isRealAccount, (real) => {
  if (!real) showAccountId.value = false
})

onMounted(load)

const balanceCurrency = computed(() => settingsStore.settings?.balanceCurrency || 'usd')

function withUsdSub(value, showSign = true) {
  const usd = formatUsdEquivalent(value, balanceCurrency.value, { showSign })
  return usd ? `≈ ${usd}` : ''
}

const pnlCard = computed(() => {
  if (!tradesStore.performance) return { value: '', sub: '' }
  const { totalPnL } = tradesStore.performance
  return {
    value: formatMoney(totalPnL, balanceCurrency.value),
    sub: withUsdSub(totalPnL),
  }
})

const capitalCard = computed(() => {
  if (!tradesStore.performance) return { value: '', sub: '' }
  const { currentCapital, startingCapital } = tradesStore.performance
  const start = formatMoney(startingCapital, balanceCurrency.value, { showSign: false })
  const usdStart = formatUsdEquivalent(startingCapital, balanceCurrency.value, { showSign: false })
  const startSub = usdStart ? `${start} · ≈ ${usdStart}` : start
  return {
    value: formatMoney(currentCapital, balanceCurrency.value, { showSign: false }),
    sub: `Départ : ${startSub}${withUsdSub(currentCapital) ? ` · ${withUsdSub(currentCapital)}` : ''}`,
  }
})

const goalCardSub = computed(() => {
  if (!tradesStore.performance || tradesStore.performance.goal == null) {
    return 'Période en cours'
  }
  const goal = formatMoney(tradesStore.performance.goal, balanceCurrency.value, { showSign: false })
  const usd = formatUsdEquivalent(tradesStore.performance.goal, balanceCurrency.value, { showSign: false })
  const goalLabel = usd ? `${goal} (≈ ${usd})` : goal
  return `Objectif : ${goalLabel} (${tradesStore.performance.goalProgress}%)`
})
</script>

<template>
  <div class="page p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
    <header class="mb-6 sm:mb-8">
      <div class="flex flex-wrap items-center gap-3 mb-1">
        <h2 class="text-xl sm:text-2xl font-semibold tracking-tight">Tableau de bord</h2>
        <AccountTypeBadge v-if="settingsStore.settings" :type="settingsStore.settings.accountType || 'demo'"
          :balance-currency="settingsStore.settings.balanceCurrency || 'usd'" />
      </div>
      <p class="text-text-muted text-sm mt-1">
        <template v-if="settingsStore.settings">
          <span class="font-medium text-text">{{ settingsStore.settings.name }}</span>
          <span v-if="settingsStore.settings.broker"> · {{ settingsStore.settings.broker }}</span>
          <span v-if="settingsStore.settings.brokerServer"> · {{ settingsStore.settings.brokerServer }}</span>
          <span v-if="settingsStore.settings.accountId && !isRealAccount">
            · ID {{ settingsStore.settings.accountId }}
          </span>
          <span
            v-else-if="settingsStore.settings.accountId && isRealAccount"
            class="inline-flex items-center gap-1 align-middle"
          >
            · ID
            <span class="account-id" :class="{ 'account-id--hidden': !showAccountId }">
              {{ settingsStore.settings.accountId }}
            </span>
            <button
              type="button"
              class="account-id-toggle"
              :aria-label="showAccountId ? 'Masquer l\'ID du compte' : 'Afficher l\'ID du compte'"
              :title="showAccountId ? 'Masquer' : 'Afficher'"
              @click="toggleAccountIdVisibility"
            >
              <svg
                v-if="showAccountId"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="size-4"
                aria-hidden="true"
              >
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <svg
                v-else
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="size-4"
                aria-hidden="true"
              >
                <path d="M3 3l18 18" />
                <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
                <path d="M9.88 4.24A10.94 10.94 0 0 1 12 4c6.5 0 10 7 10 7a18.2 18.2 0 0 1-2.16 3.19" />
                <path d="M6.61 6.61A18.5 18.5 0 0 0 2 12s3.5 7 10 7a10.94 10.94 0 0 0 5.12-1.24" />
              </svg>
            </button>
          </span>
        </template>
      </p>
    </header>

    <div class="mb-6">
      <PeriodTabs v-model="period" :options="periodOptions" />
    </div>

    <div v-if="tradesStore.performance"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
      <StatCard label="P&L période" :value="pnlCard.value" :sub="pnlCard.sub"
        :variant="tradesStore.performance.totalPnL >= 0 ? 'profit' : 'loss'" />
      <StatCard label="Capital actuel" :value="capitalCard.value" :sub="capitalCard.sub" variant="accent" />
      <StatCard label="Win rate" :value="`${tradesStore.performance.winRate}%`" :sub="'Taux de réussite'" />
      <StatCard label="Trades" :value="tradesStore.performance.tradeCount" :sub="goalCardSub" />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
      <div class="panel p-4 sm:p-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <h3 class="text-sm font-medium">Évolution P&L</h3>
          <select v-model="timelinePeriod"
            class="text-xs bg-surface-overlay border border-border rounded-md px-2 py-1.5 text-text-muted w-full sm:w-auto">
            <option value="day">Par jour</option>
            <option value="week">Par semaine</option>
            <option value="month">Par mois</option>
            <option value="year">Par année</option>
          </select>
        </div>
        <TimelineChart :data="tradesStore.timeline" :currency="balanceCurrency" />
      </div>

      <div class="panel p-4 sm:p-6">
        <h3 class="text-sm font-medium mb-5">Stats par paire</h3>
        <div v-if="tradesStore.pairStats.length" class="space-y-3">
          <div v-for="stat in tradesStore.pairStats" :key="stat.pair"
            class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 border-b border-border-subtle last:border-0">
            <div>
              <p class="font-medium text-sm">{{ stat.pair }}</p>
              <p class="text-xs text-text-muted mt-0.5">
                <span class="text-profit">{{ stat.wins }} TP</span>
                ·
                <span class="text-loss">{{ stat.losses }} SL</span>
                ·
                <span class="text-neutral">{{ stat.breakEvens }} BE</span>
              </p>
            </div>
            <div class="text-right">
              <p class="text-sm font-medium tabular-nums" :class="stat.netPnL >= 0 ? 'text-profit' : 'text-loss'">
                {{ formatMoney(stat.netPnL, balanceCurrency) }}
              </p>
              <p v-if="withUsdSub(stat.netPnL)" class="text-xs text-text-muted">
                {{ withUsdSub(stat.netPnL) }}
              </p>
              <p class="text-xs text-text-muted">{{ stat.winRate }}% win</p>
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-text-muted text-center py-8">Aucun trade enregistré.</p>
      </div>
    </div>

    <PerformanceCalendar :currency="balanceCurrency" class="mb-6 sm:mb-8" />
  </div>
</template>

<style scoped>
.panel {
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border-subtle);
  border-radius: 12px;
}
.account-id {
  font-variant-numeric: tabular-nums;
  transition: filter 0.2s ease, opacity 0.2s ease;
}

.account-id--hidden {
  filter: blur(6px);
  opacity: 0.65;
  user-select: none;
  pointer-events: none;
}

.account-id-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  margin-left: 2px;
  border-radius: 6px;
  color: var(--color-text-muted);
  transition: color 0.15s ease, background-color 0.15s ease;
}

.account-id-toggle:hover {
  color: var(--color-text);
  background: var(--color-surface-overlay);
}

.account-id-toggle:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
