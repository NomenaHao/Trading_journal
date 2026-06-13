<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: { type: Number, required: true },
  showSign: { type: Boolean, default: true },
})

const formatted = computed(() => {
  const sign = props.value > 0 ? '+' : ''
  return `${props.showSign ? sign : ''}${props.value.toFixed(2)} USD`
})

const colorClass = computed(() => {
  if (props.value > 0) return 'text-profit'
  if (props.value < 0) return 'text-loss'
  return 'text-neutral'
})
</script>

<template>
  <span :class="colorClass" class="font-medium tabular-nums">{{ formatted }}</span>
</template>
