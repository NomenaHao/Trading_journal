import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api/client'
import { getUserAvatarUrl } from '../utils/avatar'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))
  const token = ref(localStorage.getItem('token'))
  const loading = ref(false)
  const error = ref(null)

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  const avatarUrl = computed(() => getUserAvatarUrl(user.value))

  function setUser(userData, bumpAvatar = false) {
    const next = { ...userData }
    if (bumpAvatar || userData.avatar !== user.value?.avatar) {
      next.avatarUpdatedAt = Date.now()
    } else if (user.value?.avatarUpdatedAt) {
      next.avatarUpdatedAt = user.value.avatarUpdatedAt
    }
    user.value = next
    localStorage.setItem('user', JSON.stringify(user.value))
  }

  function setSession(newToken, newUser) {
    token.value = newToken
    setUser(newUser)
    localStorage.setItem('token', newToken)
  }

  function clearSession() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  async function login(username, password) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.post('/auth/login', { username, password })
      setSession(data.token, data.user)
      return data.user
    } catch (e) {
      error.value = e.response?.data?.error || 'Erreur de connexion.'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function register(name, username, password) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.post('/auth/register', { name, username, password })
      setSession(data.token, data.user)
      return data.user
    } catch (e) {
      error.value = e.response?.data?.error || 'Erreur lors de l\'inscription.'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchMe() {
    if (!token.value) return null
    try {
      const { data } = await api.get('/auth/me')
      setUser(data)
      return data
    } catch {
      clearSession()
      return null
    }
  }

  async function updateProfile(payload) {
    const { data } = await api.put('/profile', payload)
    setUser(data)
    return data
  }

  async function uploadAvatar(file) {
    const image = await readImageAsDataUrl(file)
    const { data } = await api.put('/profile/avatar', { image })
    setUser(data, true)
    return data
  }

  async function removeAvatar() {
    const { data } = await api.delete('/profile/avatar')
    setUser(data, true)
    return data
  }

  async function changePassword(currentPassword, newPassword) {
    await api.put('/profile/password', { currentPassword, newPassword })
  }

  function readImageAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('Fichier image requis.'))
        return
      }
      if (file.size > 2 * 1024 * 1024) {
        reject(new Error('Image trop volumineuse (max 2 Mo).'))
        return
      }
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('Impossible de lire l\'image.'))
      reader.readAsDataURL(file)
    })
  }

  function logout() {
    clearSession()
  }

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    avatarUrl,
    login,
    register,
    fetchMe,
    updateProfile,
    uploadAvatar,
    removeAvatar,
    changePassword,
    logout,
  }
})
