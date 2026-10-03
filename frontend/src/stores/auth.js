import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { authService } from '../services/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const initialized = ref(false)
  const isAuthenticated = computed(() => Boolean(user.value))
  const isAdmin = computed(() => ['admin', 'system_admin'].includes(user.value?.role))
  const isSystemAdmin = computed(() => user.value?.role === 'system_admin')

  async function initialize() {
    if (initialized.value) return
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const response = await authService.getUser()
        user.value = response.data
      } catch {
        localStorage.removeItem('token')
      }
    }
    initialized.value = true
  }

  function acceptSession(data) {
    localStorage.setItem('token', data.token)
    user.value = data.user
    initialized.value = true
  }

  async function login(credentials) {
    const response = await authService.login(credentials)
    acceptSession(response.data)
    return response.data.user
  }

  async function logout() {
    try {
      if (localStorage.getItem('token')) await authService.logout()
    } finally {
      localStorage.removeItem('token')
      user.value = null
      initialized.value = true
    }
  }

  function clear() {
    localStorage.removeItem('token')
    user.value = null
  }

  return { user, initialized, isAuthenticated, isAdmin, isSystemAdmin, initialize, acceptSession, login, logout, clear }
})
