<template>
  <div class="share-page shell">
    <nav class="breadcrumb"><router-link to="/">首页</router-link><span>/</span> 公开知识库</nav>
    <div v-if="isLoading" class="page-loading" role="status">正在打开分享内容…</div>
    <section v-else-if="library" class="share-sheet">
      <header class="share-hero">
        <div><span class="share-owner-label">{{ library.owner?.username || '知图用户' }} 的公开知识库</span><h1>{{ library.name }}</h1><p>{{ library.description || '这个知识库暂时没有说明。' }}</p></div>
        <div class="share-stamp"><strong>开放</strong><span>任何人可阅读</span></div>
      </header>
      <div class="share-toolbar">
        <div class="share-meta"><span>{{ library.entries.length }} 条知识</span><span>★ {{ library.star_count }} 收藏</span><span>⑂ {{ library.fork_count }} 次复制</span><span>发布于 {{ formatDate(library.shared_at) }}</span></div>
        <div class="share-actions">
          <button type="button" :class="{ active: library.starred }" :disabled="actionLoading" @click="toggleStar">{{ library.starred ? '★ 已收藏' : '☆ 收藏' }}</button>
          <button type="button" :disabled="actionLoading" @click="forkLibrary">⑂ 复制到我的知识库</button>
          <button type="button" @click="copyLink">{{ copied ? '链接已复制' : '复制链接' }}</button>
        </div>
      </div>
      <p v-if="actionMessage" :class="['share-action-message', { error: actionError }]" role="status">{{ actionMessage }}</p>
      <div v-if="library.entries.length" class="shared-entry-list">
        <article v-for="(entry, index) in library.entries" :key="entry.id">
          <span class="shared-entry-index">{{ String(index + 1).padStart(2, '0') }}</span>
          <div><p>{{ entry.domain }} · {{ entry.category }} · {{ entry.version }}</p><h2>{{ entry.title }}</h2><div class="shared-entry-content">{{ entry.content }}</div></div>
          <router-link v-if="entry.knowledge_id" :to="entry.source_path">阅读站内原文 <span>→</span></router-link>
        </article>
      </div>
      <div v-else class="library-empty"><span>∅</span><h2>这个分享还没有内容</h2><p>整理者添加知识后，这里会自动更新。</p></div>
    </section>
    <div v-else class="empty-state share-missing"><span>404</span><h1>分享链接不可用</h1><p>{{ errorMessage }}</p><router-link to="/knowledge">浏览公开知识</router-link></div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { shareService } from '../services/api'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const library = ref(null)
const isLoading = ref(true)
const copied = ref(false)
const actionLoading = ref(false)
const actionMessage = ref('')
const actionError = ref(false)
const errorMessage = ref('它可能已关闭、被管理员暂停，或地址不完整。')

onMounted(async () => {
  await auth.initialize()
  try {
    const response = await shareService.getSharedKnowledgeBase(route.params.shareId)
    library.value = response.data
  } catch (error) {
    errorMessage.value = error.response?.data?.message || errorMessage.value
  } finally {
    isLoading.value = false
  }
})

async function requireLogin() {
  if (auth.isAuthenticated) return true
  await router.push({ name: 'Login', query: { redirect: route.fullPath } })
  return false
}

async function toggleStar() {
  if (!await requireLogin()) return
  actionLoading.value = true
  actionMessage.value = ''
  try {
    const response = library.value.starred
      ? await shareService.unstar(route.params.shareId)
      : await shareService.star(route.params.shareId)
    library.value.starred = response.data.starred
    library.value.star_count = response.data.star_count
    actionMessage.value = response.data.starred ? '已加入收藏榜。' : '已取消收藏。'
    actionError.value = false
  } catch (error) {
    actionMessage.value = error.response?.data?.message || '操作失败，请稍后重试。'
    actionError.value = true
  } finally {
    actionLoading.value = false
  }
}

async function forkLibrary() {
  if (!await requireLogin()) return
  actionLoading.value = true
  actionMessage.value = ''
  try {
    await shareService.fork(route.params.shareId)
    await router.push({ name: 'KnowledgeLibrary', query: { from: 'fork' } })
  } catch (error) {
    actionMessage.value = error.response?.data?.message || '复制失败，请稍后重试。'
    actionError.value = true
  } finally {
    actionLoading.value = false
  }
}

async function copyLink() {
  await navigator.clipboard.writeText(window.location.href)
  copied.value = true
  window.setTimeout(() => { copied.value = false }, 1600)
}

function formatDate(value) {
  return value ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(new Date(value)) : '近期'
}
</script>
