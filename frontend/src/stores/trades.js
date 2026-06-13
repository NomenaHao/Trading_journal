import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../api/client'

export const useTradesStore = defineStore('trades', () => {
  const trades = ref([])
  const performance = ref(null)
  const pairStats = ref([])
  const timeline = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchTrades(pair = null) {
    loading.value = true
    error.value = null
    try {
      const params = pair ? { pair } : {}
      const { data } = await api.get('/trades', { params })
      trades.value = data
    } catch (e) {
      error.value = 'Impossible de charger les trades.'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function addTrade(payload) {
    const { data } = await api.post('/trades', payload)
    trades.value.unshift(data)
    return data
  }

  async function deleteTrade(id) {
    await api.delete(`/trades/${id}`)
    trades.value = trades.value.filter((t) => t.id !== id)
  }

  async function updateTrade(id, payload) {
    const { data } = await api.put(`/trades/${id}`, payload)
    const index = trades.value.findIndex((t) => t.id === id)
    if (index !== -1) {
      trades.value[index] = data
    }
    return data
  }

  async function fetchPerformance(period = 'day') {
    const { data } = await api.get('/stats/performance', { params: { period } })
    performance.value = data
    return data
  }

  async function fetchPairStats(period = 'all') {
    const { data } = await api.get('/stats/by-pair', { params: { period } })
    pairStats.value = data
    return data
  }

  async function fetchTimeline(period = 'month') {
    const { data } = await api.get('/stats/timeline', { params: { period } })
    timeline.value = data
    return data
  }

  return {
    trades,
    performance,
    pairStats,
    timeline,
    loading,
    error,
    fetchTrades,
    addTrade,
    deleteTrade,
    updateTrade,
    fetchPerformance,
    fetchPairStats,
    fetchTimeline,
  }
})
