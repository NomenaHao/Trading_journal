<script setup>
import { ref, watch, onUnmounted } from 'vue'

defineProps({
  beforeImage: { type: String, default: '' },
  afterImage: { type: String, default: '' },
  variant: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'inline'].includes(v),
  },
})

const lightboxUrl = ref('')
const lightboxLabel = ref('')

function openLightbox(url, label) {
  lightboxUrl.value = url
  lightboxLabel.value = label
}

function closeLightbox() {
  lightboxUrl.value = ''
}

function onEscape(event) {
  if (event.key === 'Escape') closeLightbox()
}

watch(lightboxUrl, (url) => {
  if (url) {
    document.addEventListener('keydown', onEscape)
    document.body.style.overflow = 'hidden'
  } else {
    document.removeEventListener('keydown', onEscape)
    document.body.style.overflow = ''
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', onEscape)
  document.body.style.overflow = ''
})
</script>

<template>
  <div
    v-if="beforeImage || afterImage"
    class="trade-images"
    :class="`trade-images--${variant}`"
  >
    <div class="trade-images-row">
      <figure v-if="beforeImage" class="trade-image-card">
        <button
          type="button"
          class="trade-image-btn"
          aria-label="Voir la capture avant"
           @click="openLightbox(beforeImage, '')"
        >
          <img :src="beforeImage" alt="" class="trade-image" />
          <span class="trade-image-overlay">
            <span class="trade-image-zoom">⤢</span>
          </span>
        </button>
      </figure>

      <span v-if="beforeImage && afterImage" class="trade-image-arrow" aria-hidden="true">→</span>

      <figure v-if="afterImage" class="trade-image-card">
        <button
          type="button"
          class="trade-image-btn"
          aria-label="Voir la capture après"
          @click="openLightbox(afterImage, '')"
        >
          <img :src="afterImage" alt="" class="trade-image" />
          <span class="trade-image-overlay">
            <span class="trade-image-zoom">⤢</span>
          </span>
        </button>
      </figure>
    </div>

    <Teleport to="body">
      <div
        v-if="lightboxUrl"
        class="lightbox"
        role="dialog"
        aria-modal="true"
        :aria-label="lightboxLabel"
        @click.self="closeLightbox"
      >
        <button type="button" class="lightbox-close" aria-label="Fermer" @click="closeLightbox">✕</button>
        <p class="lightbox-label">{{ lightboxLabel }}</p>
        <img :src="lightboxUrl" :alt="`Capture ${lightboxLabel.toLowerCase()}`" class="lightbox-img" />
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.trade-images-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.trade-images--default .trade-images-row {
  gap: 0.75rem;
}

.trade-image-card {
  margin: 0;
  min-width: 0;
}

.trade-image-btn {
  position: relative;
  display: block;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  background: #0a0a0a;
  cursor: zoom-in;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}

.trade-image-btn:hover {
  border-color: var(--color-accent);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
}

.trade-image-btn:hover .trade-image-overlay {
  opacity: 1;
}

.trade-image {
  display: block;
  object-fit: cover;
  background: #000;
}

/* Default — cartes mobile */
.trade-images--default {
  width: 100%;
}

.trade-images--default .trade-images-row {
  justify-content: center;
}

.trade-images--default .trade-image-card {
  flex: 1;
  max-width: 240px;
}

.trade-images--default .trade-image-card:only-child {
  max-width: 280px;
}

.trade-images--default .trade-image-btn {
  width: 100%;
  border-radius: 10px;
}

.trade-images--default .trade-image {
  width: 100%;
  height: 140px;
}

.trade-images--default .trade-image-arrow {
  align-self: center;
  padding-top: 0.5rem;
}

/* Inline — colonne tableau */
.trade-images--inline .trade-image-btn {
  width: 72px;
  height: 52px;
  border-radius: 6px;
}

.trade-images--inline .trade-image {
  width: 100%;
  height: 100%;
}

.trade-image-arrow {
  flex-shrink: 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  opacity: 0.6;
}

.trade-image-badge {
  position: absolute;
  left: 0.3rem;
  bottom: 0.3rem;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  font-size: 0.55rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #fff;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  pointer-events: none;
}

.trade-image-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  opacity: 0;
  transition: opacity 0.15s;
  pointer-events: none;
}

.trade-image-zoom {
  font-size: 1rem;
  color: #fff;
  line-height: 1;
}

/* Lightbox */
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.88);
  backdrop-filter: blur(6px);
}

.lightbox-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.15s;
}

.lightbox-close:hover {
  background: rgba(255, 255, 255, 0.15);
}

.lightbox-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.6);
}

.lightbox-img {
  max-width: min(92vw, 1100px);
  max-height: 82vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}
</style>
