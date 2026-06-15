<script setup>
import { computed } from 'vue'
import { formatMoney, formatUsdEquivalent } from '../utils/currency'

const props = defineProps({
  value: { type: Number, required: true },
  showSign: { type: Boolean, default: true },
  currency: { type: String, default: 'usd' },
  showUsdEquivalent: { type: Boolean, default: false },
})

const formatted = computed(() =>
  formatMoney(props.value, props.currency, { showSign: props.showSign })
)

const usdEquivalent = computed(() =>
  props.showUsdEquivalent
    ? formatUsdEquivalent(props.value, props.currency, { showSign: props.showSign })
    : null
)

const colorClass = computed(() => {
  if (props.value > 0) return 'text-profit'
  if (props.value < 0) return 'text-loss'
  return 'text-neutral'
})
</script>

<template>
  <span :class="colorClass" class="font-medium tabular-nums">
    {{ formatted }}
    <span v-if="usdEquivalent" class="text-text-muted text-xs font-normal ml-1">
      (≈ {{ usdEquivalent }})
    </span>
  </span>
</template>
