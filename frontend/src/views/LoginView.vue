<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import ThemeSwitcher from '../components/ThemeSwitcher.vue'

const router = useRouter()
const authStore = useAuthStore()

const mode = ref('login')
const form = ref({
  name: '',
  username: '',
  password: '',
})

async function submit() {
  try {
    if (mode.value === 'login') {
      await authStore.login(form.value.username, form.value.password)
    } else {
      await authStore.register(form.value.name, form.value.username, form.value.password)
    }
    router.push('/')
  } catch {
    // error shown via authStore.error
  }
}

function switchMode(newMode) {
  mode.value = newMode
  authStore.error = null
}
</script>

<template>
  <div class="login-page min-h-screen min-h-dvh flex items-center justify-center p-4 relative">
    <div class="login-theme-switcher">
      <ThemeSwitcher />
    </div>

    <div class="login-card w-full max-w-md">
      <header class="text-center mb-8">
        <p class="text-[10px] uppercase tracking-[0.2em] text-text-muted mb-2">Trading Journal</p>
        <h1 class="text-2xl font-semibold tracking-tight">
          {{ mode === 'login' ? 'Connexion' : 'Créer un compte' }}
        </h1>
        <p class="text-sm text-text-muted mt-2">
          {{ mode === 'login' ? 'Accédez à votre journal de trading' : 'Commencez à suivre vos performances' }}
        </p>
      </header>

      <form class="space-y-4" @submit.prevent="submit">
        <div v-if="mode === 'register'">
          <label class="field-label">Nom affiché</label>
          <input
            v-model="form.name"
            type="text"
            class="field-input"
            placeholder="Votre nom"
            required
          />
        </div>

        <div>
          <label class="field-label">Nom d'utilisateur</label>
          <input
            v-model="form.username"
            type="text"
            class="field-input"
            placeholder="ex: trader_pro"
            autocapitalize="off"
            autocomplete="username"
            minlength="3"
            maxlength="20"
            pattern="[a-zA-Z0-9_]{3,20}"
            required
          />
          <p v-if="mode === 'register'" class="text-xs text-text-muted mt-1.5">
            3 à 20 caractères : lettres, chiffres et underscore
          </p>
        </div>

        <div>
          <label class="field-label">Mot de passe</label>
          <input
            v-model="form.password"
            type="password"
            class="field-input"
            placeholder="••••••••"
            autocomplete="current-password"
            minlength="6"
            required
          />
        </div>

        <p v-if="authStore.error" class="text-xs text-loss">{{ authStore.error }}</p>

        <button
          type="submit"
          class="w-full py-3 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          :disabled="authStore.loading"
        >
          {{ authStore.loading
            ? 'Chargement…'
            : mode === 'login' ? 'Se connecter' : 'S\'inscrire' }}
        </button>
      </form>

      <p class="text-center text-sm text-text-muted mt-6">
        <template v-if="mode === 'login'">
          Pas encore de compte ?
          <button type="button" class="text-accent hover:underline ml-1" @click="switchMode('register')">
            S'inscrire
          </button>
        </template>
        <template v-else>
          Déjà un compte ?
          <button type="button" class="text-accent hover:underline ml-1" @click="switchMode('login')">
            Se connecter
          </button>
        </template>
      </p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  background: var(--color-surface);
}

.login-theme-switcher {
  position: absolute;
  top: 1rem;
  right: 1rem;
}

.login-card {
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border-subtle);
  border-radius: 16px;
  padding: 2rem;
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
</style>
