<script setup>
import { ref } from 'vue'
import { readImageAsDataUrl } from '../utils/image'

defineProps({
  label: { type: String, required: true },
  optional: { type: Boolean, default: false },
  preview: { type: String, default: '' },
})

const emit = defineEmits(['update', 'remove'])

const fileInput = ref(null)
const error = ref('')
const loading = ref(false)

function pickImage() {
  fileInput.value?.click()
}

async function onFileSelected(event) {
  const file = event.target.files?.[0]
  if (!file) return

  error.value = ''
  loading.value = true
  try {
    const dataUrl = await readImageAsDataUrl(file)
    emit('update', dataUrl)
  } catch (e) {
    error.value = e.message || 'Erreur lors du chargement.'
  } finally {
    loading.value = false
    event.target.value = ''
  }
}

function removeImage() {
  error.value = ''
  emit('remove')
}
</script>

<template>
  <div class="image-slot">
    <label class="field-label">
      {{ label }}
      <span v-if="optional" class="text-text-muted normal-case tracking-normal">(optionnel)</span>
    </label>

    <div v-if="preview" class="preview-wrap">
      <img :src="preview" :alt="label" class="preview-img" />
      <div class="preview-actions">
        <button type="button" class="slot-btn" :disabled="loading" @click="pickImage">
          {{ loading ? 'Chargement…' : 'Changer' }}
        </button>
        <button type="button" class="slot-btn slot-btn-danger" @click="removeImage">
          Retirer
        </button>
      </div>
    </div>

    <button
      v-else
      type="button"
      class="upload-btn"
      :disabled="loading"
      @click="pickImage"
    >
      {{ loading ? 'Chargement…' : 'Ajouter une image' }}
    </button>

    <input
      ref="fileInput"
      type="file"
      accept="image/png,image/jpeg,image/jpg,image/webp"
      class="hidden"
      @change="onFileSelected"
    />

    <p v-if="error" class="text-xs text-loss mt-2">{{ error }}</p>
  </div>
</template>

<style scoped>
.field-label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  margin-bottom: 0.5rem;
}

.preview-wrap {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
  background: var(--color-surface-overlay);
}

.preview-img {
  display: block;
  width: 100%;
  max-height: 180px;
  object-fit: contain;
  background: #000;
}

.preview-actions {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
  border-top: 1px solid var(--color-border-subtle);
}

.upload-btn,
.slot-btn {
  width: 100%;
  padding: 0.65rem 0.75rem;
  border-radius: 8px;
  border: 1px dashed var(--color-border);
  background: var(--color-surface-overlay);
  color: var(--color-text-muted);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.15s;
}

.preview-actions .slot-btn {
  width: auto;
  flex: 1;
  border-style: solid;
}

.upload-btn:hover:not(:disabled),
.slot-btn:hover:not(:disabled) {
  color: var(--color-text);
  border-color: var(--color-accent);
}

.slot-btn-danger:hover {
  color: var(--color-loss);
  border-color: var(--color-loss);
}

.upload-btn:disabled,
.slot-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

.hidden {
  display: none;
}
</style>
