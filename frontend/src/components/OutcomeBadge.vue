<script setup>
defineProps({
  outcome: { type: String, required: true },
})
</script>

<template>
  <span
    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium tracking-wide"
    :class="{
      'bg-profit-soft text-profit': outcome === 'TP',
      'bg-loss-soft text-loss': outcome === 'SL',
      'bg-neutral-soft text-neutral': outcome === 'BE',
    }"
  >
    {{ outcome }}
  </span>
</template>
