<script setup>
import { computed } from 'vue'
import { getUserAvatarUrl } from '../utils/avatar'

const props = defineProps({
  user: { type: Object, default: null },
  size: { type: String, default: 'md' },
})

const avatarUrl = computed(() => getUserAvatarUrl(props.user))

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'avatar-sm'
    case 'lg':
      return 'avatar-lg'
    default:
      return 'avatar-md'
  }
})
</script>

<template>
  <img
    :src="avatarUrl"
    :alt="user?.name ? `Avatar de ${user.name}` : 'Avatar utilisateur'"
    class="avatar"
    :class="sizeClass"
    loading="lazy"
    decoding="async"
  />
</template>

<style scoped>
.avatar {
  border-radius: 9999px;
  object-fit: cover;
  background: var(--color-surface-overlay);
  border: 1px solid var(--color-border-subtle);
  flex-shrink: 0;
}

.avatar-sm {
  width: 1.75rem;
  height: 1.75rem;
}

.avatar-md {
  width: 2rem;
  height: 2rem;
}

.avatar-lg {
  width: 3rem;
  height: 3rem;
}
</style>
