<template>
  <div class="account-page shell">
    <header class="workspace-header account-header">
      <div>
        <p class="breadcrumb"><router-link to="/">首页</router-link><span>/</span> 账号设置</p>
        <h1>管理你的账号</h1>
        <p>更新展示昵称或更换登录密码。邮箱作为登录凭据暂不支持直接修改。</p>
      </div>
    </header>
    <div class="account-settings-layout">
      <aside class="account-identity">
        <span>{{ initial }}</span>
        <h2>{{ auth.user?.username }}</h2>
        <p>{{ auth.user?.email }}</p>
        <dl>
          <div><dt>账号角色</dt><dd>{{ roleLabel }}</dd></div>
          <div><dt>账号状态</dt><dd>正常</dd></div>
        </dl>
      </aside>
      <div class="account-setting-panels">
        <form class="account-setting-card" @submit.prevent="saveProfile">
          <header>
            <span>01</span>
            <div><h2>公开资料</h2><p>昵称会显示在管理页面和你的账号菜单中。</p></div>
          </header>
          <label>昵称<input v-model.trim="profile.username" required minlength="2" maxlength="24" /></label>
          <p v-if="profileMessage.text" :class="['account-form-message', profileMessage.type]">{{ profileMessage.text }}</p>
          <button type="submit" :disabled="savingProfile">{{ savingProfile ? '保存中…' : '保存昵称' }}</button>
        </form>
        <form class="account-setting-card" @submit.prevent="changePassword">
          <header>
            <span>02</span>
            <div><h2>登录密码</h2><p>修改后所有设备都会退出，需要使用新密码重新登录。</p></div>
          </header>
          <label>当前密码<input v-model="password.current_password" type="password" required autocomplete="current-password" /></label>
          <label>新密码<input v-model="password.password" type="password" required minlength="8" autocomplete="new-password" placeholder="至少 8 位，同时包含字母和数字" /></label>
          <label>确认新密码<input v-model="password.confirm" type="password" required minlength="8" autocomplete="new-password" /></label>
          <p v-if="passwordMessage.text" :class="['account-form-message', passwordMessage.type]">{{ passwordMessage.text }}</p>
          <button type="submit" :disabled="savingPassword">{{ savingPassword ? '正在更新…' : '更新密码' }}</button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authService } from '../services/api'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const profile = reactive({ username: '' })
const password = reactive({ current_password: '', password: '', confirm: '' })
const profileMessage = reactive({ type: '', text: '' })
const passwordMessage = reactive({ type: '', text: '' })
const savingProfile = ref(false)
const savingPassword = ref(false)
const initial = computed(() => auth.user?.username?.slice(0, 1).toUpperCase() || 'U')
const roleLabel = computed(() => ({ user: '普通用户', admin: '管理员', system_admin: '系统管理员' })[auth.user?.role] || '普通用户')

onMounted(async () => {
  await auth.initialize()
  profile.username = auth.user?.username || ''
})

async function saveProfile() {
  savingProfile.value = true
  profileMessage.text = ''
  try {
    const response = await authService.updateProfile(profile)
    auth.user = response.data
    profileMessage.type = 'success'
    profileMessage.text = '昵称已经更新。'
  } catch (error) {
    profileMessage.type = 'error'
    profileMessage.text = error.response?.data?.message || '保存失败。'
  } finally {
    savingProfile.value = false
  }
}

async function changePassword() {
  passwordMessage.text = ''
  if (password.password !== password.confirm) {
    passwordMessage.type = 'error'
    passwordMessage.text = '两次输入的新密码不一致。'
    return
  }
  savingPassword.value = true
  try {
    await authService.updatePassword({ current_password: password.current_password, password: password.password })
    auth.clear()
    await router.replace('/login')
  } catch (error) {
    passwordMessage.type = 'error'
    passwordMessage.text = error.response?.data?.message || '密码更新失败。'
  } finally {
    savingPassword.value = false
  }
}
</script>
