<template>
  <a class="skip-link" href="#main-content">跳到主要内容</a>
  <div class="app-shell">
    <header class="site-header">
      <div class="shell header-inner">
        <details ref="brandEl" class="brand" :open="brandMenuOpen" @toggle="handleBrandToggle">
          <summary :aria-label="`${site.displayName} 首页与账号菜单`">
            <span class="brand-mark" aria-hidden="true">
              <img v-if="site.logoUrl" :src="site.logoUrl" alt="" />
              <svg v-else viewBox="0 0 64 64">
                <path class="brand-route" d="M18 19h18c7 0 11 4 11 10s-4 10-11 10H26" />
                <path class="brand-stem" d="M18 19v27" />
                <circle cx="18" cy="19" r="5" />
                <circle cx="47" cy="29" r="5" />
                <circle cx="25" cy="46" r="5" />
              </svg>
            </span>
            <span class="brand-copy">
              <strong>{{ site.brandParts.primary }}<i v-if="site.brandParts.secondary">{{ ' ' + site.brandParts.secondary }}</i></strong>
              <small>{{ site.displayTagline }}</small>
            </span>
          </summary>
          <div class="brand-menu">
            <router-link to="/">发现首页</router-link>
            <router-link to="/knowledge">知识索引</router-link>
            <router-link to="/explore">共享广场</router-link>
            <router-link to="/favorites">我的收藏</router-link>
            <template v-if="auth.isAuthenticated">
              <router-link to="/library">我的知识库</router-link>
              <router-link to="/notifications">消息中心 <span v-if="unreadCount">{{ unreadCount }}</span></router-link>
              <router-link to="/account">账号设置</router-link>
              <router-link v-if="auth.isAdmin" to="/admin">管理中心</router-link>
              <router-link to="/manage">资料维护</router-link>
              <button type="button" @click="logout">退出登录</button>
            </template>
            <template v-else>
              <router-link to="/manage">资料维护</router-link>
              <router-link to="/login">登录</router-link>
              <router-link class="brand-menu-join" to="/register">注册新账号</router-link>
            </template>
          </div>
        </details>

        <nav class="main-nav" aria-label="主导航">
          <router-link to="/">发现</router-link>
          <router-link to="/knowledge">知识索引</router-link>
          <router-link to="/explore">共享广场</router-link>
          <router-link v-if="auth.isAuthenticated" to="/library">我的知识库</router-link>
          <router-link to="/manage">资料维护</router-link>
        </nav>

        <div class="header-tools">
          <button class="header-import" type="button" @click="importDialog?.open()">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3v12m-4-4 4 4 4-4M5 20h14" />
            </svg>
            <span>导入知识</span>
          </button>
          <button class="header-action" type="button" aria-keyshortcuts="/ Control+K Meta+K" @click="quickSearch?.open()">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m21 21-4.35-4.35m2.35-5.15a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
            </svg>
            <span>检索</span>
            <kbd>/</kbd>
          </button>
          <template v-if="auth.isAuthenticated">
            <router-link class="header-notification" to="/notifications" aria-label="查看通知">
              <span aria-hidden="true">◇</span><i v-if="unreadCount">{{ unreadCount > 9 ? '9+' : unreadCount }}</i>
            </router-link>
            <details class="account-menu">
              <summary><span>{{ userInitial }}</span><strong>{{ auth.user?.username }}</strong></summary>
              <div>
                <p><strong>{{ auth.user?.username }}</strong><small>{{ auth.user?.email }}</small></p>
                <router-link to="/library">我的知识库</router-link>
                <router-link to="/favorites">我的收藏</router-link>
                <router-link to="/notifications">消息中心 <span v-if="unreadCount">{{ unreadCount }}</span></router-link>
                <router-link to="/account">账号设置</router-link>
                <router-link v-if="auth.isAdmin" to="/admin">管理中心</router-link>
                <button type="button" @click="logout">退出登录</button>
              </div>
            </details>
          </template>
          <div v-else class="header-auth-links"><router-link to="/login">登录</router-link><router-link class="header-join" to="/register">注册</router-link></div>
        </div>
      </div>
    </header>

    <main id="main-content">
      <router-view />
    </main>

    <footer class="site-footer">
      <div class="shell footer-inner">
        <div>
          <strong>知图 · CodeAtlas</strong>
          <p>把零散的问题与经验，连接成每个人都能使用的知识路径。</p>
        </div>
        <nav class="footer-links" aria-label="页脚导航">
          <router-link to="/knowledge">知识索引</router-link>
          <router-link to="/explore">共享广场</router-link>
          <router-link to="/favorites">我的收藏</router-link>
          <router-link v-if="auth.isAuthenticated" to="/library">我的知识库</router-link>
          <router-link v-if="auth.isAdmin" to="/admin">管理中心</router-link>
          <router-link to="/manage">资料维护</router-link>
          <span>Vue 3 + Node API</span>
        </nav>
      </div>
    </footer>

    <ImportKnowledgeDialog ref="importDialog" @imported="handleImported" />
    <QuickSearchPalette ref="quickSearch" />
    <div v-if="toastMessage" class="site-toast" role="status">{{ toastMessage }}</div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ImportKnowledgeDialog from './components/ImportKnowledgeDialog.vue'
import QuickSearchPalette from './components/QuickSearchPalette.vue'
import { notificationService } from './services/api'
import { useAuthStore } from './stores/auth'
import { useSiteStore } from './stores/site'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const site = useSiteStore()
const importDialog = ref(null)
const quickSearch = ref(null)
const toastMessage = ref('')
let toastTimer
const unreadCount = ref(0)
const brandMenuOpen = ref(false)
const brandEl = ref(null)
const userInitial = computed(() => auth.user?.username?.slice(0, 1).toUpperCase() || 'U')

// 原生 <details> 的 open 是 DOM 属性，切换登录态/路由后需要显式同步，
// 否则菜单会停在展开状态（例如点“退出登录”后仍挂着）。
function closeBrandMenu() {
  brandMenuOpen.value = false
  if (brandEl.value) brandEl.value.open = false
}

// 品牌菜单在路由跳转后自动收起，避免遮挡内容
watch(() => route.fullPath, () => { closeBrandMenu() })
// 登录态切换（登录/退出）时菜单项会整块替换，同步收起避免残留展开状态
watch(() => auth.isAuthenticated, () => { closeBrandMenu() })

onMounted(async () => {
  window.addEventListener('keydown', handleShortcut)
  window.addEventListener('codeatlas:notifications-changed', handleNotificationsChanged)
  window.addEventListener('codeatlas:site-changed', handleSiteChanged)
  // 站点标识先拉一次，未登录页面也要显示自定义名称与 Logo
  await site.load()
  await auth.initialize()
  if (auth.isAuthenticated) {
    try {
      const response = await notificationService.getNotifications()
      unreadCount.value = response.data.filter((item) => !item.read).length
    } catch { unreadCount.value = 0 }
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleShortcut)
  window.removeEventListener('codeatlas:notifications-changed', handleNotificationsChanged)
  window.removeEventListener('codeatlas:site-changed', handleSiteChanged)
  window.clearTimeout(toastTimer)
})

// 管理后台改完站点标识后广播，头部立即刷新，无需刷新页面
function handleSiteChanged(event) {
  site.refresh(event.detail || {})
}

function handleNotificationsChanged(event) {
  unreadCount.value = Number(event.detail?.unread) || 0
}

// <details> 的 open 状态需要回写，才能让 Vue 控制的 :open 与原生展开保持一致
function handleBrandToggle(event) {
  brandMenuOpen.value = event.target.open
}

async function handleShortcut(event) {
  const target = event.target
  const isTyping = target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement
    || target?.isContentEditable
  const isSlash = event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey
  const isCommandSearch = event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)
  if ((!isSlash && !isCommandSearch) || isTyping) return
  event.preventDefault()
  quickSearch.value?.open()
}

async function handleImported(result) {
  const location = result.scope === 'shared' ? '共享知识库' : '当前浏览器（服务器离线）'
  toastMessage.value = `已导入 ${result.count} 条知识到${location}`
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toastMessage.value = '' }, 3200)
  await router.push({ name: 'Knowledge', query: { source: 'imported' } })
}

async function logout() {
  closeBrandMenu()
  await auth.logout()
  unreadCount.value = 0
  await router.push('/')
}
</script>
