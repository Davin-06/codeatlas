<template>
  <div class="notifications-page shell">
    <header class="workspace-header notification-header">
      <div><p class="breadcrumb"><router-link to="/">首页</router-link><span>/</span> 通知</p><h1>消息中心</h1><p>查看系统公告、内容更新和管理员发送的提醒。</p></div>
      <button v-if="unreadCount" type="button" @click="markAllRead">全部标为已读</button>
    </header>
    <div class="notification-summary"><span>{{ unreadCount }}</span><p><strong>条未读消息</strong><small>已读状态会跟随你的账号保存</small></p></div>
    <div v-if="isLoading" class="page-loading">正在读取通知…</div>
    <section v-else-if="notices.length" class="notification-list" aria-label="通知列表">
      <article v-for="notice in notices" :key="notice.id" :class="{ unread: !notice.read }">
        <span class="notice-dot" aria-hidden="true"></span>
        <div><p>{{ formatDate(notice.created_at) }}<span v-if="!notice.read">新消息</span></p><h2>{{ notice.title }}</h2><div>{{ notice.content }}</div></div>
        <button v-if="!notice.read" type="button" @click="markRead(notice)">标为已读</button>
        <span v-else class="notice-read">已读</span>
      </article>
    </section>
    <div v-else class="empty-state notification-empty"><span>✓</span><h2>暂时没有新通知</h2><p>重要公告和学习提醒会出现在这里。</p><router-link to="/knowledge">继续学习</router-link></div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { notificationService } from '../services/api'

const notices = ref([])
const isLoading = ref(true)
const unreadCount = computed(() => notices.value.filter((item) => !item.read).length)

onMounted(load)
async function load() {
  try { notices.value = (await notificationService.getNotifications()).data }
  finally { isLoading.value = false }
}
async function markRead(notice) {
  await notificationService.markRead(notice.id)
  notice.read = true
  syncBadge()
}
async function markAllRead() {
  await notificationService.markAllRead()
  notices.value.forEach((item) => { item.read = true })
  syncBadge()
}
function syncBadge() {
  window.dispatchEvent(new CustomEvent('codeatlas:notifications-changed', {
    detail: { unread: notices.value.filter((item) => !item.read).length }
  }))
}
function formatDate(value) {
  return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}
</script>
