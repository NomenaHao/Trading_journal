<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import UserAvatar from '../components/UserAvatar.vue'

const authStore = useAuthStore()
const fileInput = ref(null)

const profileForm = ref({
  name: '',
  email: '',
})

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const profileMessage = ref('')
const profileError = ref('')
const passwordMessage = ref('')
const passwordError = ref('')
const avatarError = ref('')
const savingProfile = ref(false)
const savingPassword = ref(false)
const uploadingAvatar = ref(false)

onMounted(() => {
  loadProfile()
})

function loadProfile() {
  if (!authStore.user) return
  profileForm.value = {
    name: authStore.user.name || '',
    email: authStore.user.email || '',
  }
}

async function saveProfile() {
  profileMessage.value = ''
  profileError.value = ''
  savingProfile.value = true
  try {
    await authStore.updateProfile({
      name: profileForm.value.name,
      email: profileForm.value.email,
    })
    profileMessage.value = 'Profil mis à jour.'
  } catch (e) {
    profileError.value = e.response?.data?.error || 'Erreur lors de la mise à jour.'
  } finally {
    savingProfile.value = false
  }
}

async function changePassword() {
  passwordMessage.value = ''
  passwordError.value = ''

  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    passwordError.value = 'Les mots de passe ne correspondent pas.'
    return
  }

  savingPassword.value = true
  try {
    await authStore.changePassword(
      passwordForm.value.currentPassword,
      passwordForm.value.newPassword
    )
    passwordMessage.value = 'Mot de passe modifié.'
    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
  } catch (e) {
    passwordError.value = e.response?.data?.error || 'Erreur lors du changement de mot de passe.'
  } finally {
    savingPassword.value = false
  }
}

function pickAvatar() {
  fileInput.value?.click()
}

async function onAvatarSelected(event) {
  const file = event.target.files?.[0]
  if (!file) return

  avatarError.value = ''
  uploadingAvatar.value = true
  try {
    await authStore.uploadAvatar(file)
  } catch (e) {
    avatarError.value = e.response?.data?.error || e.message || 'Erreur lors du téléversement.'
  } finally {
    uploadingAvatar.value = false
    event.target.value = ''
  }
}

async function removeAvatar() {
  avatarError.value = ''
  uploadingAvatar.value = true
  try {
    await authStore.removeAvatar()
  } catch (e) {
    avatarError.value = e.response?.data?.error || 'Erreur lors de la suppression.'
  } finally {
    uploadingAvatar.value = false
  }
}
</script>

<template>
  <div class="page p-4 sm:p-6 lg:p-8 max-w-xl mx-auto w-full">
    <header class="mb-6 sm:mb-8">
      <h2 class="text-xl sm:text-2xl font-semibold tracking-tight">Profil</h2>
      <p class="text-text-muted text-sm mt-1">Photo, nom, email et mot de passe</p>
    </header>

    <section class="panel p-4 sm:p-6 mb-6">
      <h3 class="text-sm font-medium mb-4">Photo de profil</h3>
      <div class="flex flex-col sm:flex-row sm:items-center gap-4">
        <UserAvatar :user="authStore.user" size="lg" class="avatar-preview" />
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="btn-secondary"
            :disabled="uploadingAvatar"
            @click="pickAvatar"
          >
            {{ uploadingAvatar ? 'Chargement…' : 'Changer la photo' }}
          </button>
          <button
            v-if="authStore.user?.avatar"
            type="button"
            class="btn-secondary"
            :disabled="uploadingAvatar"
            @click="removeAvatar"
          >
            Supprimer
          </button>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          class="hidden"
          @change="onAvatarSelected"
        />
      </div>
      <p class="text-xs text-text-muted mt-3">PNG, JPG ou WEBP — max 2 Mo</p>
      <p v-if="avatarError" class="text-xs text-loss mt-2">{{ avatarError }}</p>
    </section>

    <form class="panel p-4 sm:p-6 mb-6 space-y-4" @submit.prevent="saveProfile">
      <h3 class="text-sm font-medium">Informations</h3>

      <div>
        <label class="field-label">Nom d'utilisateur</label>
        <input
          :value="authStore.user?.username"
          type="text"
          class="field-input opacity-70"
          disabled
        />
        <p class="text-xs text-text-muted mt-1">Le nom d'utilisateur ne peut pas être modifié.</p>
      </div>

      <div>
        <label class="field-label">Nom affiché</label>
        <input v-model="profileForm.name" type="text" class="field-input" required />
      </div>

      <div>
        <label class="field-label">Email</label>
        <input
          v-model="profileForm.email"
          type="email"
          class="field-input"
          placeholder="vous@email.com"
        />
      </div>

      <p v-if="profileError" class="text-xs text-loss">{{ profileError }}</p>
      <p v-if="profileMessage" class="text-xs text-profit">{{ profileMessage }}</p>

      <button
        type="submit"
        class="btn-primary w-full sm:w-auto"
        :disabled="savingProfile"
      >
        {{ savingProfile ? 'Enregistrement…' : 'Enregistrer le profil' }}
      </button>
    </form>

    <form class="panel p-4 sm:p-6 space-y-4" @submit.prevent="changePassword">
      <h3 class="text-sm font-medium">Mot de passe</h3>

      <div>
        <label class="field-label">Mot de passe actuel</label>
        <input v-model="passwordForm.currentPassword" type="password" class="field-input" required />
      </div>

      <div>
        <label class="field-label">Nouveau mot de passe</label>
        <input
          v-model="passwordForm.newPassword"
          type="password"
          class="field-input"
          minlength="6"
          required
        />
      </div>

      <div>
        <label class="field-label">Confirmer le mot de passe</label>
        <input
          v-model="passwordForm.confirmPassword"
          type="password"
          class="field-input"
          minlength="6"
          required
        />
      </div>

      <p v-if="passwordError" class="text-xs text-loss">{{ passwordError }}</p>
      <p v-if="passwordMessage" class="text-xs text-profit">{{ passwordMessage }}</p>

      <button
        type="submit"
        class="btn-primary w-full sm:w-auto"
        :disabled="savingPassword"
      >
        {{ savingPassword ? 'Modification…' : 'Modifier le mot de passe' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.panel {
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border-subtle);
  border-radius: 12px;
}

.field-label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  margin-bottom: 0.5rem;
}

.field-input {
  width: 100%;
  background: var(--color-surface-overlay);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.625rem 0.75rem;
  color: var(--color-text);
  font-size: 0.875rem;
  outline: none;
}

.field-input:focus {
  border-color: var(--color-accent);
}

.field-input:disabled {
  cursor: not-allowed;
}

.btn-primary {
  padding: 0.65rem 1.25rem;
  border-radius: 8px;
  background: var(--color-accent);
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
}

.btn-primary:disabled {
  opacity: 0.5;
}

.btn-secondary {
  padding: 0.55rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-overlay);
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.btn-secondary:hover:not(:disabled) {
  color: var(--color-text);
}

.btn-secondary:disabled {
  opacity: 0.5;
}

:deep(.avatar-lg) {
  width: 4rem;
  height: 4rem;
}
</style>
