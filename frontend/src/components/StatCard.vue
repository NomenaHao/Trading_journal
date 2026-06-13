<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  sub: { type: String, default: '' },
  variant: { type: String, default: 'default' },
})
</script>

<template>
  <div class="panel p-5">
    <p class="text-xs uppercase tracking-wider text-text-muted mb-2">{{ label }}</p>
    <p
      class="text-2xl font-semibold tracking-tight"
      :class="{
        'text-profit': variant === 'profit',
        'text-loss': variant === 'loss',
        'text-text': variant === 'default',
        'text-accent': variant === 'accent',
      }"
    >
      {{ value }}
    </p>
    <p v-if="sub" class="text-xs text-text-muted mt-1">{{ sub }}</p>
  </div>
</template>

<style scoped>
.panel {
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border-subtle);
  border-radius: 12px;
}
</style>
