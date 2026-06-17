<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useTradesStore } from '../stores/trades'
import { useSettingsStore } from '../stores/settings'
import { formatMoney, formatUsdEquivalent } from '../utils/currency'

const props = defineProps({
  currency: { type: String, default: 'usd' },
})

const tradesStore = useTradesStore()
const settingsStore = useSettingsStore()

const now = new Date()
const selectedYear = ref(now.getFullYear())
const selectedMonth = ref(now.getMonth() + 1)
const loading = ref(false)

const weekDays = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

const monthOptions = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(2000, i, 1).toLocaleDateString('fr-FR', { month: 'long' }),
}))

const yearOptions = computed(() => {
  const current = new Date().getFullYear()
  const min = Math.min(current - 10, selectedYear.value)
  const max = Math.max(current + 1, selectedYear.value)
  return Array.from({ length: max - min + 1 }, (_, i) => min + i)
})

const monthLabel = computed(() =>
  new Date(selectedYear.value, selectedMonth.value - 1, 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  })
)

const calendarData = computed(() => tradesStore.calendar)
const summary = computed(() => calendarData.value?.summary ?? null)

const dayPnLMap = computed(() => {
  const map = new Map()
  for (const day of calendarData.value?.days ?? []) {
    map.set(day.day, day)
  }
  return map
})

const calendarCells = computed(() => {
  const year = selectedYear.value
  const month = selectedMonth.value
  const firstDay = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const startOffset = firstDay.getDay()
  const cells = []

  for (let i = 0; i < startOffset; i++) {
    cells.push({ type: 'empty', key: `pad-${i}` })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const data = dayPnLMap.value.get(day)
    cells.push({
      type: 'day',
      key: `day-${day}`,
      day,
      pnl: data?.pnl ?? null,
      gainPnL: data?.gainPnL ?? 0,
      lossPnL: data?.lossPnL ?? 0,
      bePnL: data?.bePnL ?? 0,
      wins: data?.wins ?? 0,
      losses: data?.losses ?? 0,
      breakEvens: data?.breakEvens ?? 0,
      trades: data?.trades ?? 0,
    })
  }

  return cells
})

const bestDayNum = computed(() => summary.value?.bestDay?.day ?? null)
const worstDayNum = computed(() => summary.value?.worstDay?.day ?? null)

async function loadCalendar() {
  loading.value = true
  try {
    await tradesStore.fetchCalendar(selectedYear.value, selectedMonth.value)
  } finally {
    loading.value = false
  }
}

function prevMonth() {
  if (selectedMonth.value === 1) {
    selectedMonth.value = 12
    selectedYear.value -= 1
  } else {
    selectedMonth.value -= 1
  }
}

function nextMonth() {
  if (selectedMonth.value === 12) {
    selectedMonth.value = 1
    selectedYear.value += 1
  } else {
    selectedMonth.value += 1
  }
}

function formatDayPnl(value) {
  if (value == null) return ''
  return formatMoney(value, props.currency)
}

function hasDayBreakdown(cell) {
  return cell.wins > 0 || cell.losses > 0 || cell.breakEvens > 0
}

function showGainLine(cell) {
  return cell.wins > 0 && cell.gainPnL !== 0
}

function showLossLine(cell) {
  return cell.losses > 0 && cell.lossPnL !== 0
}

function showBeLine(cell) {
  return cell.breakEvens > 0 && cell.bePnL !== 0
}

function formatSummaryPnl(value) {
  if (value == null) return '—'
  return formatMoney(value, props.currency)
}

function withUsdSub(value) {
  const usd = formatUsdEquivalent(value, props.currency)
  return usd ? `≈ ${usd}` : ''
}

watch([selectedYear, selectedMonth], loadCalendar)
watch(() => settingsStore.activeAccountId, loadCalendar)

onMounted(loadCalendar)
</script>

<template>
  <div class="calendar-panel p-4 sm:p-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h3 class="text-base sm:text-lg font-semibold capitalize">{{ monthLabel }}</h3>
        <p class="text-xs text-text-muted mt-0.5">Performance journalière</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <select
          v-model.number="selectedMonth"
          class="calendar-select"
          aria-label="Mois"
        >
          <option v-for="opt in monthOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
        <select
          v-model.number="selectedYear"
          class="calendar-select"
          aria-label="Année"
        >
          <option v-for="year in yearOptions" :key="year" :value="year">
            {{ year }}
          </option>
        </select>
        <div class="flex items-center gap-1 ml-auto sm:ml-0">
          <button type="button" class="calendar-nav" aria-label="Mois précédent" @click="prevMonth">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-4" aria-hidden="true">
              <path d="m15 18-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
          <button type="button" class="calendar-nav" aria-label="Mois suivant" @click="nextMonth">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-4" aria-hidden="true">
              <path d="m9 18 6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div v-if="summary" class="mb-6">
      <p class="text-xs uppercase tracking-wider text-text-muted mb-3">Résumé mensuel</p>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <div class="summary-card">
          <p class="summary-label">P&L total</p>
          <p
            class="summary-value"
            :class="summary.totalPnL >= 0 ? 'text-profit' : 'text-loss'"
          >
            {{ formatSummaryPnl(summary.totalPnL) }}
          </p>
          <p v-if="withUsdSub(summary.totalPnL)" class="summary-sub">{{ withUsdSub(summary.totalPnL) }}</p>
        </div>
        <div class="summary-card">
          <p class="summary-label">Win rate</p>
          <p class="summary-value text-accent">{{ summary.winRate }}%</p>
          <p class="summary-sub">{{ summary.tradeCount }} trade{{ summary.tradeCount > 1 ? 's' : '' }}</p>
        </div>
        <div class="summary-card">
          <p class="summary-label">Meilleur jour</p>
          <p class="summary-value text-profit">
            {{ summary.bestDay ? formatSummaryPnl(summary.bestDay.pnl) : '—' }}
          </p>
          <p v-if="summary.bestDay" class="summary-sub">Jour {{ summary.bestDay.day }}</p>
        </div>
        <div class="summary-card">
          <p class="summary-label">Pire jour</p>
          <p class="summary-value text-loss">
            {{ summary.worstDay ? formatSummaryPnl(summary.worstDay.pnl) : '—' }}
          </p>
          <p v-if="summary.worstDay" class="summary-sub">Jour {{ summary.worstDay.day }}</p>
        </div>
      </div>
    </div>

    <div class="calendar-grid mb-2">
      <div
        v-for="(label, index) in weekDays"
        :key="`wd-${index}`"
        class="calendar-weekday"
      >
        {{ label }}
      </div>
    </div>

    <div v-if="loading" class="text-sm text-text-muted text-center py-12">Chargement…</div>

    <div v-else class="calendar-grid">
      <div
        v-for="cell in calendarCells"
        :key="cell.key"
        class="calendar-cell"
        :class="{
          'calendar-cell--empty': cell.type === 'empty',
          'calendar-cell--profit': cell.type === 'day' && cell.pnl != null && cell.pnl > 0,
          'calendar-cell--loss': cell.type === 'day' && cell.pnl != null && cell.pnl < 0,
          'calendar-cell--flat': cell.type === 'day' && cell.pnl === 0,
          'calendar-cell--neutral': cell.type === 'day' && cell.pnl == null,
          'calendar-cell--best': cell.type === 'day' && cell.day === bestDayNum && cell.pnl > 0,
          'calendar-cell--worst': cell.type === 'day' && cell.day === worstDayNum && cell.pnl < 0,
        }"
      >
        <template v-if="cell.type === 'day'">
          <span class="calendar-day-num">{{ cell.day }}</span>
          <template v-if="cell.pnl != null">
            <span class="calendar-day-pnl">{{ formatDayPnl(cell.pnl) }}</span>
            <div v-if="hasDayBreakdown(cell)" class="calendar-day-breakdown">
              <span
                v-if="showGainLine(cell)"
                class="calendar-day-detail calendar-day-detail--gain"
                :title="`${cell.wins} TP · ${formatDayPnl(cell.gainPnL)}`"
              >
                TP {{ formatDayPnl(cell.gainPnL) }}
              </span>
              <span
                v-if="showLossLine(cell)"
                class="calendar-day-detail calendar-day-detail--loss"
                :title="`${cell.losses} SL · ${formatDayPnl(cell.lossPnL)}`"
              >
                SL {{ formatDayPnl(cell.lossPnL) }}
              </span>
              <span
                v-if="showBeLine(cell)"
                class="calendar-day-detail calendar-day-detail--be"
                :title="`${cell.breakEvens} BE · ${formatDayPnl(cell.bePnL)}`"
              >
                BE {{ formatDayPnl(cell.bePnL) }}
              </span>
            </div>
          </template>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar-panel {
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border-subtle);
  border-radius: 12px;
}

.calendar-select {
  font-size: 0.75rem;
  background: var(--color-surface-overlay);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.375rem 0.625rem;
  color: var(--color-text);
  text-transform: capitalize;
}

.calendar-nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 8px;
  border: 1px solid var(--color-border-subtle);
  background: var(--color-surface-overlay);
  color: var(--color-text-muted);
  transition: color 0.15s ease, background-color 0.15s ease;
}

.calendar-nav:hover {
  color: var(--color-text);
  background: var(--color-surface);
}

.summary-card {
  background: var(--color-surface-overlay);
  border: 1px solid var(--color-border-subtle);
  border-radius: 10px;
  padding: 0.75rem 1rem;
}

.summary-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  margin-bottom: 0.25rem;
}

.summary-value {
  font-size: 1rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.summary-sub {
  font-size: 0.65rem;
  color: var(--color-text-muted);
  margin-top: 0.125rem;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.375rem;
}

.calendar-weekday {
  text-align: center;
  font-size: 0.65rem;
  font-weight: 500;
  color: var(--color-text-muted);
  padding-bottom: 0.25rem;
}

.calendar-cell {
  aspect-ratio: auto;
  min-height: 4.5rem;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 0.125rem;
  padding: 0.35rem 0.2rem;
  border: 1px solid transparent;
}

.calendar-cell--empty {
  background: transparent;
}

.calendar-cell--neutral {
  background: var(--color-surface-overlay);
  border-color: var(--color-border-subtle);
}

.calendar-cell--profit {
  background: var(--color-profit-soft);
  border-color: color-mix(in srgb, var(--color-profit) 25%, transparent);
}

.calendar-cell--loss {
  background: var(--color-loss-soft);
  border-color: color-mix(in srgb, var(--color-loss) 25%, transparent);
}

.calendar-cell--flat {
  background: var(--color-neutral-soft);
  border-color: color-mix(in srgb, var(--color-neutral) 25%, transparent);
}

.calendar-cell--best {
  box-shadow: 0 0 0 2px var(--color-profit);
}

.calendar-cell--worst {
  box-shadow: 0 0 0 2px var(--color-loss);
}

.calendar-day-num {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-muted);
  line-height: 1;
}

.calendar-cell--profit .calendar-day-num,
.calendar-cell--loss .calendar-day-num,
.calendar-cell--flat .calendar-day-num {
  color: var(--color-text);
}

.calendar-day-pnl {
  font-size: 0.6rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: center;
  line-height: 1.2;
  word-break: break-word;
}

.calendar-cell--profit .calendar-day-pnl {
  color: var(--color-profit);
}

.calendar-cell--loss .calendar-day-pnl {
  color: var(--color-loss);
}

.calendar-cell--flat .calendar-day-pnl {
  color: var(--color-neutral);
}

.calendar-day-breakdown {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.05rem;
  width: 100%;
}

.calendar-day-detail {
  font-size: 0.5rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.calendar-day-detail--gain {
  color: var(--color-profit);
}

.calendar-day-detail--loss {
  color: var(--color-loss);
}

.calendar-day-detail--be {
  color: var(--color-neutral);
}

@media (min-width: 640px) {
  .calendar-cell {
    min-height: 5.25rem;
  }

  .calendar-day-pnl {
    font-size: 0.65rem;
  }

  .calendar-day-detail {
    font-size: 0.55rem;
  }
}

@media (min-width: 1024px) {
  .calendar-cell {
    min-height: 5.75rem;
  }

  .calendar-day-pnl {
    font-size: 0.7rem;
  }

  .calendar-day-detail {
    font-size: 0.6rem;
  }
}
</style>
