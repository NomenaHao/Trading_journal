<script setup>
import { ref, watch, onMounted } from 'vue'
import { useTradesStore } from '../stores/trades'
import { useSettingsStore } from '../stores/settings'
import PeriodTabs from '../components/PeriodTabs.vue'
import StatCard from '../components/StatCard.vue'
import TimelineChart from '../components/TimelineChart.vue'
import AccountTypeBadge from '../components/AccountTypeBadge.vue'

const tradesStore = useTradesStore()
const settingsStore = useSettingsStore()

const period = ref('day')
const timelinePeriod = ref('month')

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

watch(period, (p) => tradesStore.fetchPerformance(p))
watch(timelinePeriod, (p) => tradesStore.fetchTimeline(p))
watch(() => settingsStore.activeAccountId, () => load())

onMounted(load)
</script>

<template>
  <div class="page p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
    <header class="mb-6 sm:mb-8">
      <div class="flex flex-wrap items-center gap-3 mb-1">
        <h2 class="text-xl sm:text-2xl font-semibold tracking-tight">Tableau de bord</h2>
        <AccountTypeBadge
          v-if="settingsStore.settings"
          :type="settingsStore.settings.accountType || 'demo'"
        />
      </div>
      <p class="text-text-muted text-sm mt-1">
        <template v-if="settingsStore.settings">
          <span class="font-medium text-text">{{ settingsStore.settings.name }}</span>
          <span v-if="settingsStore.settings.broker"> · {{ settingsStore.settings.broker }}</span>
          <span v-if="settingsStore.settings.brokerServer"> · {{ settingsStore.settings.brokerServer }}</span>
          <span v-if="settingsStore.settings.accountId"> · ID {{ settingsStore.settings.accountId }}</span>
        </template>
      </p>
    </header>

    <div class="mb-6">
      <PeriodTabs v-model="period" :options="periodOptions" />
    </div>

    <div v-if="tradesStore.performance" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
      <StatCard
        label="P&L période"
        :value="`${tradesStore.performance.totalPnL >= 0 ? '+' : ''}${tradesStore.performance.totalPnL} USD`"
        :variant="tradesStore.performance.totalPnL >= 0 ? 'profit' : 'loss'"
      />
      <StatCard
        label="Capital actuel"
        :value="`${tradesStore.performance.currentCapital} USD`"
        :sub="`Départ : ${tradesStore.performance.startingCapital} USD`"
        variant="accent"
      />
      <StatCard
        label="Win rate"
        :value="`${tradesStore.performance.winRate}%`"
        :sub="'Taux de réussite'"
      />
      <StatCard
        label="Trades"
        :value="tradesStore.performance.tradeCount"
        :sub="tradesStore.performance.goal != null
          ? `Objectif : ${tradesStore.performance.goal} USD (${tradesStore.performance.goalProgress}%)`
          : 'Période en cours'"
      />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
      <div class="panel p-4 sm:p-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <h3 class="text-sm font-medium">Évolution P&L</h3>
          <select
            v-model="timelinePeriod"
            class="text-xs bg-surface-overlay border border-border rounded-md px-2 py-1.5 text-text-muted w-full sm:w-auto"
          >
            <option value="day">Par jour</option>
            <option value="week">Par semaine</option>
            <option value="month">Par mois</option>
            <option value="year">Par année</option>
          </select>
        </div>
        <TimelineChart :data="tradesStore.timeline" />
      </div>

      <div class="panel p-4 sm:p-6">
        <h3 class="text-sm font-medium mb-5">Stats par paire</h3>
        <div v-if="tradesStore.pairStats.length" class="space-y-3">
          <div
            v-for="stat in tradesStore.pairStats"
            :key="stat.pair"
            class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 border-b border-border-subtle last:border-0"
          >
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
              <p
                class="text-sm font-medium tabular-nums"
                :class="stat.netPnL >= 0 ? 'text-profit' : 'text-loss'"
              >
                {{ stat.netPnL >= 0 ? '+' : '' }}{{ stat.netPnL }} USD
              </p>
              <p class="text-xs text-text-muted">{{ stat.winRate }}% win</p>
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-text-muted text-center py-8">Aucun trade enregistré.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel {
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border-subtle);
  border-radius: 12px;
}
</style>
