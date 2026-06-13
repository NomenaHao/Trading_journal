import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api/client'

export const useSettingsStore = defineStore('settings', () => {
  const accounts = ref([])
  const activeAccountId = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const settings = computed(() =>
    accounts.value.find((a) => a.id === activeAccountId.value) ?? null
  )

  function applyAccountsPayload(data) {
    accounts.value = data.accounts
    activeAccountId.value = data.activeAccountId
  }

  async function fetchAccounts() {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get('/accounts')
      applyAccountsPayload(data)
    } catch (e) {
      error.value = 'Impossible de charger les comptes.'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchSettings() {
    await fetchAccounts()
  }

  async function saveSettings(payload) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.put('/settings', payload)
      const idx = accounts.value.findIndex((a) => a.id === data.id)
      if (idx >= 0) accounts.value[idx] = data
      return data
    } catch (e) {
      error.value = e.response?.data?.error || 'Erreur lors de la sauvegarde.'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function activateAccount(id) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.post(`/accounts/${id}/activate`)
      applyAccountsPayload(data)
    } catch (e) {
      error.value = 'Impossible de changer de compte.'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createAccount(payload) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.post('/accounts', payload)
      applyAccountsPayload(data)
      return data
    } catch (e) {
      error.value = e.response?.data?.error || 'Erreur lors de la création du compte.'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteAccount(id) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.delete(`/accounts/${id}`)
      applyAccountsPayload(data)
    } catch (e) {
      error.value = e.response?.data?.error || 'Erreur lors de la suppression.'
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    accounts,
    activeAccountId,
    settings,
    loading,
    error,
    fetchAccounts,
    fetchSettings,
    saveSettings,
    activateAccount,
    createAccount,
    deleteAccount,
  }
})
