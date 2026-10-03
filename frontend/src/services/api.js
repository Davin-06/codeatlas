import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    return Promise.reject(error)
  }
)

export const authService = {
  getVerificationChallenge() {
    return api.get('/auth/verification-challenge')
  },

  verifySlider(data) {
    return api.post('/auth/verify-slider', data)
  },

  sendVerificationCode(email, sliderToken, purpose = 'register') {
    return api.post('/auth/send-verification-code', { email, slider_token: sliderToken, purpose })
  },

  register(data) {
    return api.post('/auth/register', data)
  },

  login(data) {
    return api.post('/auth/login', data)
  },

  logout() {
    return api.post('/auth/logout')
  },

  getUser() {
    return api.get('/auth/user')
  },

  updateProfile(data) {
    return api.put('/auth/user/profile', data)
  },

  updatePassword(data) {
    return api.put('/auth/user/password', data)
  },

  resetPassword(data) {
    return api.post('/auth/reset-password', data)
  }
}

export const knowledgeService = {
  getHealth() {
    return api.get('/health')
  },

  getVersions() {
    return api.get('/knowledge/versions')
  },

  getCategories() {
    return api.get('/knowledge/categories')
  },

  getTags() {
    return api.get('/knowledge/tags')
  },

  getKnowledgeList(params) {
    return api.get('/knowledge', { params })
  },

  getKnowledgeDetail(id) {
    return api.get(`/knowledge/${id}`)
  },

  importKnowledge(items, importKey = '') {
    return api.post('/knowledge/import', { items }, {
      headers: importKey ? { 'X-Import-Key': importKey } : {}
    })
  },

  createKnowledge(data, importKey = '') {
    return api.post('/knowledge', data, {
      headers: importKey ? { 'X-Import-Key': importKey } : {}
    })
  },

  updateKnowledge(id, data, importKey = '') {
    return api.put(`/knowledge/${id}`, data, {
      headers: importKey ? { 'X-Import-Key': importKey } : {}
    })
  },

  deleteKnowledge(id, importKey = '') {
    return api.delete(`/knowledge/${id}`, {
      headers: importKey ? { 'X-Import-Key': importKey } : {}
    })
  }
}

// 分类注册表：内置分类 + 用户自建分类，发布内容与首页索引共用
export const categoryService = {
  getCategories() {
    return api.get('/categories')
  },

  createCategory(data, importKey = '') {
    return api.post('/categories', data, {
      headers: importKey ? { 'X-Import-Key': importKey } : {}
    })
  },

  removeCategory(name, importKey = '') {
    return api.delete(`/categories/${encodeURIComponent(name)}`, {
      headers: importKey ? { 'X-Import-Key': importKey } : {}
    })
  }
}

export const knowledgeBaseService = {
  getKnowledgeBases() {
    return api.get('/knowledge-base')
  },

  createKnowledgeBase(data) {
    return api.post('/knowledge-base', data)
  },

  getKnowledgeBase(id) {
    return api.get(`/knowledge-base/${id}`)
  },

  updateKnowledgeBase(id, data) {
    return api.put(`/knowledge-base/${id}`, data)
  },

  deleteKnowledgeBase(id) {
    return api.delete(`/knowledge-base/${id}`)
  },

  addEntry(knowledgeBaseId, data) {
    return api.post(`/knowledge-base/${knowledgeBaseId}/entries`, data)
  },

  updateEntry(knowledgeBaseId, entryId, data) {
    return api.put(`/knowledge-base/${knowledgeBaseId}/entries/${entryId}`, data)
  },

  removeEntry(knowledgeBaseId, entryId) {
    return api.delete(`/knowledge-base/${knowledgeBaseId}/entries/${entryId}`)
  },

  exportKnowledgeBase(id, format) {
    return api.get(`/knowledge-base/${id}/export?format=${format}`, { responseType: 'blob' })
  }
}

export const shareService = {
  getPublicLibraries(sort = 'latest') {
    return api.get('/explore/libraries', { params: { sort } })
  },

  createShare(knowledgeBaseId) {
    return api.post(`/knowledge-base/${knowledgeBaseId}/share`)
  },

  cancelShare(knowledgeBaseId) {
    return api.delete(`/knowledge-base/${knowledgeBaseId}/share`)
  },

  getSharedKnowledgeBase(shareId) {
    return api.get(`/share/${shareId}`)
  },

  getSharedEntries(shareId) {
    return api.get(`/share/${shareId}/entries`)
  },

  star(shareId) {
    return api.post(`/share/${shareId}/star`)
  },

  unstar(shareId) {
    return api.delete(`/share/${shareId}/star`)
  },

  fork(shareId) {
    return api.post(`/share/${shareId}/fork`)
  }
}

export const notificationService = {
  getNotifications() {
    return api.get('/notifications')
  },

  markRead(id) {
    return api.post(`/notifications/${id}/read`)
  },

  markAllRead() {
    return api.post('/notifications/read-all')
  }
}

function adminHeaders(importKey = '') {
  return importKey ? { 'X-Import-Key': importKey } : {}
}

export const adminService = {
  getMailSettings(importKey = '') {
    return api.get('/admin/mail-settings', {
      headers: importKey ? { 'X-Import-Key': importKey } : {}
    })
  },

  updateMailSettings(data, importKey = '') {
    return api.put('/admin/mail-settings', data, {
      headers: importKey ? { 'X-Import-Key': importKey } : {}
    })
  },

  testMailSettings(email, importKey = '') {
    return api.post('/admin/mail-settings/test', { email }, {
      headers: importKey ? { 'X-Import-Key': importKey } : {}
    })
  },

  getUsers(params, importKey = '') {
    return api.get('/admin/users', { params, headers: adminHeaders(importKey) })
  },

  updateUser(id, data, importKey = '') {
    return api.put(`/admin/users/${id}`, data, { headers: adminHeaders(importKey) })
  },

  deleteUser(id, importKey = '') {
    return api.delete(`/admin/users/${id}`, { headers: adminHeaders(importKey) })
  },

  disableUser(id, importKey = '') {
    return api.post(`/admin/users/${id}/disable`, {}, { headers: adminHeaders(importKey) })
  },

  enableUser(id, importKey = '') {
    return api.post(`/admin/users/${id}/enable`, {}, { headers: adminHeaders(importKey) })
  },

  getKnowledgeBases(params, importKey = '') {
    return api.get('/admin/knowledge-bases', { params, headers: adminHeaders(importKey) })
  },

  deleteKnowledgeBase(id, importKey = '') {
    return api.delete(`/admin/knowledge-bases/${id}`, { headers: adminHeaders(importKey) })
  },

  approveKnowledgeBase(id, importKey = '') {
    return api.post(`/admin/knowledge-bases/${id}/approve`, {}, { headers: adminHeaders(importKey) })
  },

  rejectKnowledgeBase(id, importKey = '') {
    return api.post(`/admin/knowledge-bases/${id}/reject`, {}, { headers: adminHeaders(importKey) })
  },

  getStats(importKey = '') {
    return api.get('/admin/stats', { headers: adminHeaders(importKey) })
  },

  getNotifications(params, importKey = '') {
    return api.get('/admin/notifications', { params, headers: adminHeaders(importKey) })
  },

  sendNotification(data, importKey = '') {
    return api.post('/admin/notifications', data, { headers: adminHeaders(importKey) })
  },

  getSettings(importKey = '') {
    return api.get('/admin/settings', { headers: adminHeaders(importKey) })
  },

  updateSettings(data, importKey = '') {
    return api.put('/admin/settings', data, { headers: adminHeaders(importKey) })
  },

  getLogs(params, importKey = '') {
    return api.get('/admin/logs', { params, headers: adminHeaders(importKey) })
  },

  getAuditLogs(params, importKey = '') {
    return api.get('/admin/audit-logs', { params, headers: adminHeaders(importKey) })
  },

  uploadSiteLogo(dataUrl, importKey = '') {
    return api.post('/admin/site/logo', { dataUrl }, { headers: adminHeaders(importKey), timeout: 30000 })
  },

  resetSiteLogo(importKey = '') {
    return api.delete('/admin/site/logo', { headers: adminHeaders(importKey) })
  }
}

export const siteService = {
  getSite() {
    return api.get('/site')
  }
}

export default api
