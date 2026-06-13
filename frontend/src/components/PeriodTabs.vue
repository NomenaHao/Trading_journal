<script setup>
defineProps({
  modelValue: { type: String, required: true },
  options: { type: Array, required: true },
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="w-full overflow-x-auto">
    <div class="inline-flex min-w-full sm:min-w-0 p-1 rounded-lg bg-surface-overlay border border-border-subtle">
      <button
        v-for="opt in options"
        :key="opt.value"
        type="button"
        class="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 text-xs sm:text-sm rounded-md transition-all whitespace-nowrap"
        :class="modelValue === opt.value
          ? 'bg-surface-raised text-text shadow-sm'
          : 'text-text-muted hover:text-text'"
        @click="emit('update:modelValue', opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>
  </div>
</template>
