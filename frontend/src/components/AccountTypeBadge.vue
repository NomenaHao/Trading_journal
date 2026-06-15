<script setup>
defineProps({
  type: {
    type: String,
    default: 'demo',
    validator: (v) => ['demo', 'real'].includes(v),
  },
  balanceCurrency: {
    type: String,
    default: 'usd',
  },
})
</script>

<template>
  <span
    class="account-badge"
    :class="type === 'real' ? 'account-badge-real' : 'account-badge-demo'"
  >
    {{ type === 'real' ? (balanceCurrency === 'usc' ? 'Réel · Cent' : 'Réel') : 'Démo' }}
  </span>
</template>

<style scoped>
.account-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.55rem;
  border-radius: 9999px;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  line-height: 1.2;
}

.account-badge-demo {
  background: #f59e0b18;
  color: #fbbf24;
  border: 1px solid #f59e0b40;
}

.account-badge-real {
  background: var(--color-profit-soft);
  color: var(--color-profit);
  border: 1px solid #34d39940;
}
</style>
