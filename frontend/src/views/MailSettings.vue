<template>
  <div class="mail-settings-page shell">
    <header class="manage-header mail-settings-header">
      <div>
        <p class="breadcrumb"><router-link to="/">首页</router-link><span>/</span><router-link to="/manage">资料维护</router-link><span>/</span> 验证码邮箱</p>
        <h1>配置验证码发件邮箱。</h1>
        <p>使用你自己的 SMTP 服务发送注册验证码。密码或授权码只保存在服务端，页面不会读取或显示已有密码。</p>
      </div>
      <router-link class="back-manage-link" to="/manage">返回资料维护</router-link>
    </header>

    <div class="mail-settings-layout">
      <form class="mail-settings-form" @submit.prevent="saveSettings">
        <section class="settings-access">
          <div v-if="!auth.isSystemAdmin">
            <span>管理员验证</span>
            <p>使用与资料维护相同的管理密钥。</p>
          </div>
          <div v-if="!auth.isSystemAdmin" class="settings-access-row">
            <input v-model="importKey" type="password" autocomplete="current-password" placeholder="输入 IMPORT_KEY" />
            <button type="button" :disabled="isLoading || !importKey" @click="loadSettings">{{ isLoading ? '读取中…' : '读取配置' }}</button>
          </div>
          <div v-else class="settings-admin-session"><span>系统管理员会话</span><p>已使用登录账号验证，无需再次输入管理密钥。</p></div>
        </section>

        <fieldset :disabled="!isUnlocked || isSaving">
          <legend>SMTP 连接</legend>
          <div class="provider-presets" aria-label="常用邮箱预设">
            <button v-for="provider in providers" :key="provider.name" type="button" :class="{ active: selectedProvider === provider.name }" @click="applyProvider(provider)">
              {{ provider.name }}
            </button>
          </div>

          <div class="settings-grid">
            <label class="wide-field"><span>SMTP 服务器 *</span><input v-model.trim="form.host" required placeholder="smtp.example.com" /></label>
            <label><span>端口 *</span><input v-model.number="form.port" type="number" min="1" max="65535" required /></label>
            <label>
              <span>加密方式</span>
              <select v-model="form.secure">
                <option :value="true">SSL（常用 465）</option>
                <option :value="false">STARTTLS（常用 587）</option>
              </select>
            </label>
            <label class="wide-field"><span>SMTP 用户名 *</span><input v-model.trim="form.username" required autocomplete="username" placeholder="通常填写完整邮箱地址" /></label>
            <label class="wide-field">
              <span>密码 / 邮箱授权码 <small>{{ passwordConfigured ? '留空则保持原密码' : '首次配置必填' }}</small></span>
              <div class="password-field">
                <input v-model="form.password" :type="showPassword ? 'text' : 'password'" :required="!passwordConfigured" autocomplete="new-password" placeholder="优先使用邮箱生成的 SMTP 授权码" />
                <button type="button" @click="showPassword = !showPassword">{{ showPassword ? '隐藏' : '显示' }}</button>
              </div>
            </label>
          </div>
        </fieldset>

        <fieldset :disabled="!isUnlocked || isSaving">
          <legend>发件人信息</legend>
          <div class="settings-grid">
            <label><span>发件人名称</span><input v-model.trim="form.fromName" required placeholder="知图 CodeAtlas" /></label>
            <label><span>发件邮箱 *</span><input v-model.trim="form.fromAddress" type="email" required placeholder="noreply@example.com" /></label>
          </div>
          <p class="settings-hint">部分邮箱要求发件邮箱与 SMTP 用户名保持一致。QQ、163 等个人邮箱通常应填写邮箱“授权码”，不是网页登录密码。</p>
        </fieldset>

        <div v-if="message.text" :class="['editor-message', message.type]" role="status">{{ message.text }}</div>
        <button class="editor-submit" type="submit" :disabled="!isUnlocked || isSaving">
          {{ isSaving ? '正在保存…' : '保存 SMTP 配置' }}
        </button>
      </form>

      <aside class="mail-settings-aside">
        <section>
          <span>当前状态</span>
          <strong><i :class="{ ready: passwordConfigured && isUnlocked }"></i>{{ statusLabel }}</strong>
          <dl>
            <div><dt>配置来源</dt><dd>{{ settingsSource }}</dd></div>
            <div><dt>密码状态</dt><dd>{{ passwordConfigured ? '已安全保存' : '尚未设置' }}</dd></div>
            <div><dt>发送端口</dt><dd>{{ form.port || '—' }}</dd></div>
          </dl>
        </section>

        <section class="mail-test-panel">
          <span>发送测试邮件</span>
          <p>请先保存配置，再发一封测试邮件确认授权码和端口可用。</p>
          <label><span>测试收件邮箱</span><input v-model.trim="testEmail" type="email" placeholder="your@email.com" /></label>
          <button type="button" :disabled="!isUnlocked || isTesting || !testEmail" @click="sendTest">
            {{ isTesting ? '正在连接 SMTP…' : '发送测试邮件' }}
          </button>
        </section>

        <section class="smtp-checklist">
          <span>上线前检查</span>
          <ul>
            <li>邮箱后台已开启 SMTP 服务</li>
            <li>使用授权码而不是登录密码</li>
            <li>域名已配置 SPF / DKIM</li>
            <li>生产环境必须使用 HTTPS</li>
          </ul>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { adminService } from '../services/api'
import { useAuthStore } from '../stores/auth'

const providers = [
  { name: '自定义', host: '', port: 465, secure: true },
  { name: 'QQ 邮箱', host: 'smtp.qq.com', port: 465, secure: true },
  { name: '网易 163', host: 'smtp.163.com', port: 465, secure: true },
  { name: '阿里企业邮', host: 'smtp.qiye.aliyun.com', port: 465, secure: true },
  { name: 'Outlook', host: 'smtp.office365.com', port: 587, secure: false }
]

const importKey = ref(sessionStorage.getItem('codeatlas.import-key') || '')
const auth = useAuthStore()
const selectedProvider = ref('自定义')
const isUnlocked = ref(false)
const isLoading = ref(false)
const isSaving = ref(false)
const isTesting = ref(false)
const showPassword = ref(false)
const passwordConfigured = ref(false)
const settingsSource = ref('尚未读取')
const testEmail = ref('')
const message = reactive({ type: '', text: '' })
const form = reactive({ host: '', port: 465, secure: true, username: '', password: '', fromName: '知图 CodeAtlas', fromAddress: '' })

const statusLabel = computed(() => {
  if (!isUnlocked.value) return '等待管理员验证'
  return passwordConfigured.value ? '配置已就绪' : '需要填写授权码'
})

onMounted(async () => {
  await auth.initialize()
  if (auth.isSystemAdmin) await loadSettings()
})

function applyProvider(provider) {
  selectedProvider.value = provider.name
  if (!provider.host) return
  form.host = provider.host
  form.port = provider.port
  form.secure = provider.secure
}

async function loadSettings() {
  isLoading.value = true
  message.text = ''
  try {
    const response = await adminService.getMailSettings(importKey.value)
    Object.assign(form, response.data, { password: '' })
    passwordConfigured.value = response.data.passwordConfigured
    settingsSource.value = response.data.source
    isUnlocked.value = true
    sessionStorage.setItem('codeatlas.import-key', importKey.value)
    detectProvider()
  } catch (error) {
    isUnlocked.value = false
    message.type = 'error'
    message.text = error.response?.data?.message || '无法读取 SMTP 配置。'
  } finally {
    isLoading.value = false
  }
}

async function saveSettings() {
  isSaving.value = true
  message.text = ''
  try {
    const response = await adminService.updateMailSettings(form, importKey.value)
    passwordConfigured.value = response.data.passwordConfigured
    settingsSource.value = response.data.source
    form.password = ''
    message.type = 'success'
    message.text = 'SMTP 配置已保存在服务端。请发送测试邮件确认连接。'
  } catch (error) {
    message.type = 'error'
    message.text = error.response?.data?.message || 'SMTP 配置保存失败。'
  } finally {
    isSaving.value = false
  }
}

async function sendTest() {
  isTesting.value = true
  message.text = ''
  try {
    await adminService.testMailSettings(testEmail.value, importKey.value)
    message.type = 'success'
    message.text = `测试邮件已发送至 ${testEmail.value}，请检查收件箱。`
  } catch (error) {
    message.type = 'error'
    message.text = error.response?.data?.message || '测试邮件发送失败。'
  } finally {
    isTesting.value = false
  }
}

function detectProvider() {
  selectedProvider.value = providers.find((provider) => provider.host === form.host)?.name || '自定义'
}
</script>
