<template>
  <div class="auth-page">
    <div class="shell auth-shell compact-auth-shell">
      <section class="auth-intro login-intro" aria-labelledby="login-title">
        <router-link class="auth-back" to="/"><span aria-hidden="true">←</span> 返回首页</router-link>
        <div>
          <span class="auth-mark" aria-hidden="true">→</span>
          <p>继续你的知识路径</p>
          <h1 id="login-title">回到上次停下来的地方。</h1>
          <p>登录后可以访问个人知识库、管理分享、查看站内通知，并在不同设备间保持一致。</p>
        </div>
        <p class="auth-security-note">账号密码使用 scrypt 加密保存；登录令牌可随时退出并撤销。</p>
      </section>

      <section class="auth-card">
        <template v-if="mode === 'login'">
          <header>
            <span>账号登录</span>
            <h2>欢迎回来</h2>
            <p>使用注册邮箱和密码登录。</p>
            <router-link class="auth-switch-link" to="/register">还没有账号？立即注册</router-link>
          </header>
          <form @submit.prevent="login">
            <label class="auth-field"><span>邮箱地址</span><input v-model.trim="loginForm.email" type="email" autocomplete="email" required placeholder="name@example.com" /></label>
            <label class="auth-field">
              <span>密码</span>
              <div class="password-field">
                <input v-model="loginForm.password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" required placeholder="输入密码" />
                <button type="button" @click="showPassword = !showPassword">{{ showPassword ? '隐藏' : '显示' }}</button>
              </div>
            </label>
            <div class="login-options">
              <label><input v-model="loginForm.remember" type="checkbox" /> 保持登录 30 天</label>
              <button type="button" @click="switchMode('reset')">忘记密码？</button>
            </div>
            <div v-if="message.text" :class="['auth-message', message.type]" role="status">{{ message.text }}</div>
            <button class="auth-submit" type="submit" :disabled="isSubmitting">{{ isSubmitting ? '正在登录…' : '登录' }}</button>
          </form>
        </template>

        <template v-else>
          <header>
            <span>找回账号</span>
            <h2>重置密码</h2>
            <p>验证注册邮箱后设置新密码。</p>
            <button class="auth-switch-link as-button" type="button" @click="switchMode('login')">返回登录</button>
          </header>
          <form v-if="!resetComplete" @submit.prevent="resetPassword">
            <label class="auth-field">
              <span>注册邮箱</span>
              <div class="auth-input-row">
                <input v-model.trim="resetForm.email" type="email" required :disabled="codeSent" placeholder="name@example.com" />
                <button v-if="codeSent" type="button" @click="changeResetEmail">修改</button>
              </div>
            </label>
            <SliderVerification
              v-if="!codeSent || (!countdown && !sliderToken)"
              ref="slider"
              @verified="sliderToken = $event"
              @reset="sliderToken = ''"
            />
            <label class="auth-field">
              <span>邮箱验证码</span>
              <div class="auth-input-row code-row">
                <input v-model.trim="resetForm.code" inputmode="numeric" maxlength="6" required placeholder="6 位数字" />
                <button type="button" :disabled="!canSendCode" @click="sendResetCode">{{ countdown ? `${countdown}s 后重发` : isSending ? '发送中…' : '发送验证码' }}</button>
              </div>
            </label>
            <label class="auth-field"><span>新密码</span><input v-model="resetForm.password" type="password" minlength="8" required placeholder="至少 8 位，同时包含字母和数字" /></label>
            <label class="auth-field"><span>确认新密码</span><input v-model="resetForm.confirmPassword" type="password" minlength="8" required placeholder="再次输入新密码" /></label>
            <div v-if="message.text" :class="['auth-message', message.type]" role="status">{{ message.text }}</div>
            <button class="auth-submit" type="submit" :disabled="isSubmitting || !codeSent">{{ isSubmitting ? '正在重置…' : '确认重置密码' }}</button>
          </form>
          <div v-else class="reset-complete">
            <span aria-hidden="true">✓</span>
            <strong>密码已经更新</strong>
            <p>所有旧登录会话已经失效，请使用新密码重新登录。</p>
            <button type="button" @click="switchMode('login')">返回登录</button>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SliderVerification from '../components/SliderVerification.vue'
import { authService } from '../services/api'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const mode = ref(route.query.mode === 'reset' ? 'reset' : 'login')
const showPassword = ref(false)
const isSubmitting = ref(false)
const isSending = ref(false)
const slider = ref(null)
const sliderToken = ref('')
const codeSent = ref(false)
const countdown = ref(0)
const resetComplete = ref(false)
const message = reactive({ type: '', text: '' })
const loginForm = reactive({ email: '', password: '', remember: true })
const resetForm = reactive({ email: '', code: '', password: '', confirmPassword: '' })
let timer

const canSendCode = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetForm.email) && sliderToken.value && !countdown.value && !isSending.value)

onBeforeUnmount(() => window.clearInterval(timer))

async function login() {
  isSubmitting.value = true
  message.text = ''
  try {
    await auth.login(loginForm)
    await router.replace(String(route.query.redirect || '/library'))
  } catch (error) {
    message.type = 'error'
    message.text = error.response?.data?.message || '登录失败，请稍后重试。'
  } finally {
    isSubmitting.value = false
  }
}

async function sendResetCode() {
  if (!canSendCode.value) return
  isSending.value = true
  message.text = ''
  try {
    const response = await authService.sendVerificationCode(resetForm.email, sliderToken.value, 'reset')
    codeSent.value = true
    sliderToken.value = ''
    startCountdown(response.data.cooldown || 60)
    message.type = 'success'
    message.text = '重置验证码已经发送。'
  } catch (error) {
    message.type = 'error'
    message.text = error.response?.data?.message || '验证码发送失败。'
    sliderToken.value = ''
    await slider.value?.reset()
  } finally {
    isSending.value = false
  }
}

async function resetPassword() {
  if (resetForm.password !== resetForm.confirmPassword) {
    message.type = 'error'
    message.text = '两次输入的新密码不一致。'
    return
  }
  isSubmitting.value = true
  message.text = ''
  try {
    await authService.resetPassword({ email: resetForm.email, code: resetForm.code, password: resetForm.password })
    resetComplete.value = true
  } catch (error) {
    message.type = 'error'
    message.text = error.response?.data?.message || '密码重置失败。'
  } finally {
    isSubmitting.value = false
  }
}

function startCountdown(seconds) {
  window.clearInterval(timer)
  countdown.value = seconds
  timer = window.setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) window.clearInterval(timer)
  }, 1000)
}

function changeResetEmail() {
  codeSent.value = false
  countdown.value = 0
  resetForm.code = ''
  sliderToken.value = ''
  window.clearInterval(timer)
}

function switchMode(next) {
  mode.value = next
  message.text = ''
  resetComplete.value = false
}
</script>
