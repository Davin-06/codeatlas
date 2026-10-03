<template>
  <div class="admin-page shell">
    <header class="workspace-header admin-header">
      <div>
        <p class="breadcrumb"><router-link to="/">首页</router-link><span>/</span> 管理中心</p>
        <h1>站点控制台</h1>
        <p>用户、公开分享、站内通知与系统运行状态集中在这里。</p>
      </div>
      <span v-if="unlocked" class="admin-live"><i></i> 管理连接正常</span>
    </header>

    <section v-if="!unlocked" class="admin-unlock">
      <div>
        <span aria-hidden="true">⌁</span>
        <h2>需要管理员身份</h2>
        <p>登录管理员账号，或输入部署时配置的 IMPORT_KEY。密钥只保存在当前页面内存中。</p>
      </div>
      <form @submit.prevent="unlock">
        <input v-model="managementKey" type="password" autocomplete="current-password" placeholder="输入管理密钥" />
        <button type="submit" :disabled="loading">{{ loading ? '验证中…' : '进入控制台' }}</button>
      </form>
      <router-link v-if="!auth.isAuthenticated" to="/login?redirect=/admin">使用管理员账号登录</router-link>
      <p v-if="error" class="admin-error">{{ error }}</p>
    </section>

    <template v-else>
      <nav class="admin-tabs" aria-label="管理模块">
        <button
          v-for="item in tabs"
          :key="item.id"
          type="button"
          :class="{ active: tab === item.id }"
          @click="switchTab(item.id)"
        >
          <span>{{ item.mark }}</span>{{ item.label }}
        </button>
      </nav>
      <div v-if="error" class="workspace-message error">{{ error }}</div>

      <section v-if="tab === 'overview'" class="admin-overview">
        <div class="admin-stat-grid">
          <article><span>账号</span><strong>{{ stats.users?.total ?? '—' }}</strong><small>已注册用户</small></article>
          <article><span>内容</span><strong>{{ stats.knowledge ?? '—' }}</strong><small>公共知识条目</small></article>
          <article><span>个人库</span><strong>{{ stats.libraries ?? '—' }}</strong><small>{{ stats.entries ?? 0 }} 条收藏与笔记</small></article>
          <article><span>公开</span><strong>{{ stats.published ?? '—' }}</strong><small>{{ stats.stars ?? 0 }} 次收藏 · {{ stats.forks ?? 0 }} 次复制</small></article>
        </div>

        <ul v-if="stats.users" class="admin-user-breakdown">
          <li><span>账号总数</span><strong>{{ stats.users.total ?? 0 }}</strong></li>
          <li><span>正常使用</span><strong>{{ stats.users.active ?? 0 }}</strong></li>
          <li><span>已停用</span><strong>{{ stats.users.disabled ?? 0 }}</strong></li>
          <li><span>管理员</span><strong>{{ stats.users.admins ?? 0 }}</strong></li>
        </ul>
        <div class="admin-system-strip" v-if="stats.system">
          <div>
            <span class="status-pulse"></span>
            <p>
              <strong>服务运行正常</strong>
              <small>Node {{ stats.system.node }} · 已运行 {{ formatUptime(stats.system.uptime_seconds) }}</small>
            </p>
          </div>
          <dl>
            <div><dt>内存</dt><dd>{{ stats.system.memory_mb }} MB</dd></div>
            <div><dt>存储</dt><dd>{{ storageName(stats.system.storage) }}</dd></div>
            <div><dt>缓存周期</dt><dd>{{ stats.system.cache_ttl_seconds }} 秒</dd></div>
            <div><dt>日志级别</dt><dd>{{ logLevelName(stats.system.log_level) }}</dd></div>
          </dl>
        </div>
        <div class="admin-shortcuts">
          <button type="button" @click="switchTab('notices')">
            <span>＋</span><strong>发布一条通知</strong><small>向全体或指定用户发送站内消息</small>
          </button>
          <button type="button" @click="switchTab('shares')">
            <span>↗</span><strong>检查公开分享</strong><small>审核、暂停或删除用户知识库</small>
          </button>
          <button type="button" @click="switchTab('system')">
            <span>⌘</span><strong>系统与邮箱</strong><small>注册开关、缓存、日志和 SMTP</small>
          </button>
        </div>
      </section>

      <section v-else-if="tab === 'users'" class="admin-panel">
        <header>
          <div><h2>用户账号</h2><p>搜索账号，调整角色或停用访问。</p></div>
          <input v-model.trim="userKeyword" type="search" placeholder="搜索昵称或邮箱" @input="loadUsers" />
        </header>
        <div class="admin-table-wrap">
          <table>
            <thead>
              <tr><th>用户</th><th>角色</th><th>状态</th><th>注册时间</th><th>操作</th></tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td>
                  <strong>{{ user.username }}</strong><small>{{ user.email }}</small>
                  <span v-if="user.protected" class="state-chip locked" title="已锁定为系统管理员，任何人不可修改或删除">🔒 已锁定</span>
                </td>
                <td>
                  <select
                    :value="user.role"
                    :disabled="!canConfigure || user.id === auth.user?.id || user.protected"
                    @change="changeRole(user, $event.target.value)"
                  >
                    <option value="user">用户</option>
                    <option value="admin">管理员</option>
                    <option value="system_admin">系统管理员</option>
                  </select>
                </td>
                <td><span :class="['state-chip', user.status]">{{ user.status === 'active' ? '正常' : '已停用' }}</span></td>
                <td>{{ shortDate(user.created_at) }}</td>
                <td>
                  <template v-if="user.protected">
                    <span class="locked-note">受保护账号</span>
                  </template>
                  <template v-else-if="user.id === auth.user?.id">
                    <button type="button" @click="toggleUser(user)">
                      {{ user.status === 'active' ? '停用' : '启用' }}
                    </button>
                    <span>当前账号</span>
                  </template>
                  <template v-else>
                    <button type="button" @click="toggleUser(user)">
                      {{ user.status === 'active' ? '停用' : '启用' }}
                    </button>
                    <button v-if="canConfigure" class="text-danger" type="button" @click="removeUser(user)">删除</button>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-else-if="tab === 'shares'" class="admin-panel">
        <header>
          <div><h2>公开知识库</h2><p>只显示创建过分享链接的个人知识库。</p></div>
          <span>{{ sharedLibraries.length }} 个</span>
        </header>
        <div v-if="sharedLibraries.length" class="admin-share-list">
          <article v-for="library in sharedLibraries" :key="library.id">
            <div>
              <span :class="['state-chip', library.share?.status]">{{ shareStatus(library.share?.status) }}</span>
              <h3>{{ library.name }}</h3>
              <p>{{ library.description || '没有说明' }}</p>
              <small>{{ library.owner?.username || '未知用户' }} · {{ library.entry_count }} 条内容</small>
            </div>
            <div>
              <a v-if="library.share" :href="library.share.url" target="_blank">预览</a>
              <button v-if="library.share?.status !== 'published'" @click="moderateShare(library, 'approve')">通过</button>
              <button v-if="library.share?.status === 'published'" @click="moderateShare(library, 'reject')">暂停</button>
              <button class="text-danger" @click="removeLibrary(library)">删除</button>
            </div>
          </article>
        </div>
        <div v-else class="admin-empty">还没有用户公开分享知识库。</div>
      </section>

      <section v-else-if="tab === 'notices'" class="admin-notice-layout">
        <form class="admin-compose" @submit.prevent="sendNotice">
          <span>站内广播</span>
          <h2>发布新通知</h2>
          <label>标题<input v-model.trim="noticeForm.title" required maxlength="120" placeholder="例如：本周学习活动安排" /></label>
          <label>内容<textarea v-model.trim="noticeForm.content" required maxlength="2000" rows="7" placeholder="写清楚时间、事项和需要完成的动作。"></textarea></label>
          <label>
            发送范围
            <select v-model="noticeForm.audience">
              <option value="all">所有用户</option>
              <option value="users">指定用户</option>
            </select>
          </label>
          <label v-if="noticeForm.audience === 'users'">
            选择用户
            <select v-model="noticeForm.user_ids" multiple>
              <option v-for="user in users" :key="user.id" :value="user.id">{{ user.username }} · {{ user.email }}</option>
            </select>
            <small>按住 Ctrl / Cmd 可多选</small>
          </label>
          <button type="submit">发布通知</button>
        </form>
        <div class="admin-notice-history">
          <header><h2>发送记录</h2><span>{{ adminNotices.length }} 条</span></header>
          <article v-for="notice in adminNotices" :key="notice.id">
            <p><span>{{ notice.audience === 'all' ? '全体' : '定向' }}</span>{{ shortDate(notice.created_at) }} · {{ notice.read_count }} 人已读</p>
            <h3>{{ notice.title }}</h3>
            <div>{{ notice.content }}</div>
          </article>
          <div v-if="!adminNotices.length" class="admin-empty">还没有发送过通知。</div>
        </div>
      </section>

      <section v-else class="admin-system-layout">
        <form class="admin-panel system-settings site-identity" @submit.prevent="saveSettings">
          <header>
            <div><h2>站点标识</h2><p>修改后立即生效于页头品牌区、浏览器标签标题与地址栏图标。</p></div>
          </header>
          <div class="settings-grid">
            <label class="wide-field">站点名称<input v-model.trim="settings.siteName" maxlength="80" /></label>
            <label class="wide-field">站点副标题<input v-model.trim="settings.siteTagline" maxlength="120" /></label>
          </div>
          <div class="site-logo-row">
            <div class="site-logo-preview">
              <span class="brand-mark">
                <img v-if="settings.logoUrl" :src="settings.logoUrl" alt="当前 Logo" />
                <svg v-else viewBox="0 0 64 64" aria-hidden="true">
                  <path d="M18 19h18c7 0 11 4 11 10s-4 10-11 10H26" fill="none" stroke="#b9ed4d" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M18 19v27" fill="none" stroke="#f8fafc" stroke-width="6" stroke-linecap="round" />
                  <circle cx="18" cy="19" r="5" fill="#63d7c4" />
                  <circle cx="47" cy="29" r="5" fill="#b9ed4d" />
                  <circle cx="25" cy="46" r="5" fill="#63d7c4" />
                </svg>
              </span>
              <div>
                <strong>{{ settings.logoUrl ? '使用自定义 Logo' : '使用内置默认 Logo' }}</strong>
                <small>支持 PNG / JPG / WebP / GIF / SVG，不超过 1.5 MB</small>
              </div>
            </div>
            <div class="site-logo-actions">
              <label class="logo-upload-button">
                选择图片
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" @change="uploadLogo" />
              </label>
              <button v-if="settings.logoUrl" type="button" class="text-danger" :disabled="logoBusy" @click="resetLogo">恢复默认 Logo</button>
            </div>
          </div>
        </form>

        <form class="admin-panel system-settings" @submit.prevent="saveSettings">
          <header>
            <div><h2>系统配置</h2><p>影响注册入口、站点提示和服务器运行参数。</p></div>
          </header>
          <div class="settings-grid">
            <label>缓存周期（秒）<input v-model.number="settings.cacheTtlSeconds" type="number" min="0" max="86400" /></label>
            <label>
              日志级别
              <select v-model="settings.logLevel">
                <option value="error">仅错误</option>
                <option value="warn">警告及以上</option>
                <option value="info">常规信息</option>
                <option value="debug">调试详细</option>
              </select>
            </label>
            <label class="toggle-field">
              <input v-model="settings.registrationEnabled" type="checkbox" />
              <span><strong>开放新用户注册</strong><small>关闭后不能发送注册验证码或提交注册</small></span>
            </label>
            <label class="toggle-field">
              <input v-model="settings.maintenanceMode" type="checkbox" />
              <span><strong>维护模式标记</strong><small>用于后台记录当前维护状态</small></span>
            </label>
            <label class="wide-field">维护说明<textarea v-model.trim="settings.maintenanceMessage" rows="3" maxlength="300"></textarea></label>
          </div>
          <div class="system-form-actions">
            <button type="submit">保存系统配置</button>
            <router-link to="/manage/mail">配置 SMTP 验证码邮箱</router-link>
          </div>
        </form>
        <section class="admin-panel audit-panel">
          <header>
            <div><h2>审计日志</h2><p>最近的登录、注册、分享与管理操作。</p></div>
          </header>
          <ol>
            <li v-for="log in logs" :key="log.id">
              <span></span>
              <div>
                <strong>{{ actionName(log.action) }}</strong>
                <p>{{ log.actor_name }} · {{ shortDate(log.created_at) }}</p>
              </div>
            </li>
          </ol>
          <div v-if="!logs.length" class="admin-empty">暂时没有审计记录。</div>
        </section>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { adminService } from '../services/api'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const tabs = [{ id: 'overview', label: '概览', mark: '◫' }, { id: 'users', label: '用户', mark: '◎' }, { id: 'shares', label: '公开分享', mark: '↗' }, { id: 'notices', label: '通知', mark: '◇' }, { id: 'system', label: '系统', mark: '⌘' }]
const tab = ref('overview')
const managementKey = ref('')
const unlocked = ref(false)
const loading = ref(false)
const error = ref('')
const stats = ref({})
const users = ref([])
const sharedLibraries = ref([])
const adminNotices = ref([])
const logs = ref([])
const userKeyword = ref('')
const settings = reactive({ siteName: '', siteTagline: '', logoUrl: '', logoMime: '', registrationEnabled: true, maintenanceMode: false, maintenanceMessage: '', cacheTtlSeconds: 300, logLevel: 'info' })
const logoBusy = ref(false)
const noticeForm = reactive({ title: '', content: '', audience: 'all', user_ids: [] })
const canConfigure = computed(() => auth.isSystemAdmin || Boolean(managementKey.value))

onMounted(async () => {
  await auth.initialize()
  if (auth.isAdmin) await unlock()
})

async function unlock() {
  loading.value = true; error.value = ''
  try { await loadOverview(); unlocked.value = true }
  catch (cause) { error.value = cause.response?.data?.message || '管理员验证失败。' }
  finally { loading.value = false }
}
async function loadOverview() { stats.value = (await adminService.getStats(managementKey.value)).data }
async function switchTab(next) {
  tab.value = next; error.value = ''
  try {
    if (next === 'overview') await loadOverview()
    if (next === 'users') await loadUsers()
    if (next === 'shares') sharedLibraries.value = (await adminService.getKnowledgeBases({}, managementKey.value)).data
    if (next === 'notices') await Promise.all([loadNotices(), loadUsers()])
    if (next === 'system') await loadSystem()
  } catch (cause) { error.value = cause.response?.data?.message || '读取数据失败。' }
}
async function loadUsers() { users.value = (await adminService.getUsers({ keyword: userKeyword.value }, managementKey.value)).data }
async function changeRole(user, role) {
  try { await adminService.updateUser(user.id, { role }, managementKey.value); await loadUsers() }
  catch (cause) { error.value = cause.response?.data?.message || '调整角色失败。'; await loadUsers() }
}
async function toggleUser(user) {
  const action = user.status === 'active' ? adminService.disableUser : adminService.enableUser
  try { await action(user.id, managementKey.value); await loadUsers() }
  catch (cause) { error.value = cause.response?.data?.message || '调整状态失败。'; await loadUsers() }
}
async function removeUser(user) {
  if (!confirm(`永久删除账号“${user.username}”吗？`)) return
  try { await adminService.deleteUser(user.id, managementKey.value); await loadUsers() }
  catch (cause) { error.value = cause.response?.data?.message || '删除用户失败。' }
}
async function moderateShare(library, action) { await (action === 'approve' ? adminService.approveKnowledgeBase : adminService.rejectKnowledgeBase)(library.id, managementKey.value); await switchTab('shares') }
async function removeLibrary(library) { if (!confirm(`删除“${library.name}”及其中全部条目吗？`)) return; await adminService.deleteKnowledgeBase(library.id, managementKey.value); await switchTab('shares') }
async function loadNotices() { adminNotices.value = (await adminService.getNotifications({}, managementKey.value)).data }
async function sendNotice() { await adminService.sendNotification(noticeForm, managementKey.value); Object.assign(noticeForm, { title: '', content: '', audience: 'all', user_ids: [] }); await loadNotices() }
async function loadSystem() { Object.assign(settings, (await adminService.getSettings(managementKey.value)).data); logs.value = (await adminService.getAuditLogs({ limit: 60 }, managementKey.value)).data }
async function saveSettings() {
  try {
    Object.assign(settings, (await adminService.updateSettings(settings, managementKey.value)).data)
    broadcastSiteChanged()
    await loadOverview()
  } catch (cause) { error.value = cause.response?.data?.message || '保存站点标识失败。' }
}

// 通知全局：站点标识变了，页头品牌区与标签标题立即同步
function broadcastSiteChanged() {
  window.dispatchEvent(new CustomEvent('codeatlas:site-changed', {
    detail: { siteName: settings.siteName, siteTagline: settings.siteTagline, logoUrl: settings.logoUrl }
  }))
}

async function uploadLogo(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (file.size > 1_500_000) { error.value = '图片不能超过 1.5 MB'; return }
  logoBusy.value = true; error.value = ''
  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('读取图片失败'))
      reader.readAsDataURL(file)
    })
    const result = await adminService.uploadSiteLogo(dataUrl, managementKey.value)
    settings.logoUrl = result.data.logoUrl
    settings.logoMime = result.data.logoMime
    broadcastSiteChanged()
  } catch (cause) { error.value = cause.response?.data?.message || '上传 Logo 失败。' }
  finally { logoBusy.value = false }
}

async function resetLogo() {
  logoBusy.value = true; error.value = ''
  try {
    const result = await adminService.resetSiteLogo(managementKey.value)
    settings.logoUrl = result.data.logoUrl
    settings.logoMime = result.data.logoMime
    broadcastSiteChanged()
  } catch (cause) { error.value = cause.response?.data?.message || '恢复默认 Logo 失败。' }
  finally { logoBusy.value = false }
}
function shortDate(value) { return value ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—' }
function formatUptime(seconds) { const hours = Math.floor(seconds / 3600); return hours ? `${hours} 小时` : `${Math.max(1, Math.floor(seconds / 60))} 分钟` }
function shareStatus(value) { return ({ published: '公开中', rejected: '已暂停', pending: '待审核' })[value] || '未公开' }
function storageName(value) { return ({ json: 'JSON 文件', sqlite: 'SQLite', mysql: 'MySQL', postgres: 'PostgreSQL' })[value] || 'JSON 文件' }
function logLevelName(value) { return ({ error: '仅错误', warn: '警告及以上', info: '常规信息', debug: '调试详细' })[value] || '常规信息' }
function actionName(value) { return ({ 'user.register': '用户注册', 'user.login': '用户登录', 'user.password_reset': '重置密码', 'library.create': '创建知识库', 'library.delete': '删除知识库', 'library.share': '公开分享', 'library.fork': '复制公开知识库', 'admin.user_update': '调整用户', 'admin.user_delete': '删除用户', 'admin.library_delete': '删除共享知识库', 'admin.notification_send': '发布通知', 'system.settings_update': '更新系统配置', 'system.site_logo_update': '更换站点 Logo', 'system.site_logo_reset': '恢复默认 Logo', 'system.protected_account_promoted': '锁定管理员补正' })[value] || value }
</script>
