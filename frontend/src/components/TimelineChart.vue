<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: { type: Array, default: () => [] },
  currency: { type: String, default: 'usd' },
})

const maxAbs = computed(() => {
  if (!props.data.length) return 1
  return Math.max(...props.data.map((d) => Math.abs(d.pnl)), 1)
})

function tooltipLabel(point) {
  const sign = point.pnl >= 0 ? '+' : ''
  const label = props.currency === 'usc' ? 'USC' : 'USD'
  return `${point.label}: ${sign}${point.pnl} ${label}`
}
</script>

<template>
  <div v-if="data.length" class="flex items-end gap-2 h-40">
    <div
      v-for="(point, i) in data"
      :key="i"
      class="flex-1 flex flex-col items-center gap-2 min-w-0"
    >
      <div class="w-full flex items-end justify-center h-28">
        <div
          class="w-full max-w-10 rounded-t transition-all"
          :class="point.pnl >= 0 ? 'bg-profit/70' : 'bg-loss/70'"
          :style="{ height: `${(Math.abs(point.pnl) / maxAbs) * 100}%`, minHeight: point.pnl !== 0 ? '4px' : '2px' }"
          :title="tooltipLabel(point)"
        />
      </div>
      <span class="text-[10px] text-text-muted truncate w-full text-center">{{ point.label }}</span>
    </div>
  </div>
  <p v-else class="text-sm text-text-muted py-8 text-center">Aucune donnée pour cette période.</p>
</template>
