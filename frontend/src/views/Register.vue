<template>
  <div class="auth-page">
    <div class="shell auth-shell">
      <section class="auth-intro" aria-labelledby="register-title">
        <router-link class="auth-back" to="/"><span aria-hidden="true">←</span> 返回首页</router-link>
        <div>
          <span class="auth-mark" aria-hidden="true">@</span>
          <p>创建你的知识身份</p>
          <h1 id="register-title">收藏、整理，并把学到的东西留下来。</h1>
          <p>完成邮箱验证即可创建账号。当前注册只收集必要信息，知识搜索和公开阅读始终无需登录。</p>
        </div>
        <ul>
          <li><span>✓</span> 收藏常用知识与阅读进度</li>
          <li><span>✓</span> 建立自己的知识目录</li>
          <li><span>✓</span> 后续可选择公开分享</li>
        </ul>
      </section>

      <section class="auth-card">
        <template v-if="!registeredUser">
          <header>
            <span>新用户注册</span>
            <h2>用邮箱创建账号</h2>
            <p>验证码有效期为 10 分钟。</p>
            <router-link class="auth-switch-link" to="/login">已有账号？直接登录</router-link>
          </header>

          <form @submit.prevent="register">
            <label class="auth-field">
              <span>邮箱地址</span>
              <div class="auth-input-row">
                <input v-model.trim="form.email" type="email" autocomplete="email" required placeholder="name@example.com" :disabled="codeSent" @input="clearMessage" />
                <button v-if="codeSent" type="button" @click="changeEmail">修改</button>
              </div>
            </label>

            <SliderVerification
              v-if="!codeSent || (!countdown && !sliderToken)"
              ref="slider"
              :disabled="isSending"
              @verified="sliderToken = $event"
              @reset="sliderToken = ''"
            />

            <label class="auth-field">
              <span>邮箱验证码</span>
              <div class="auth-input-row code-row">
                <input v-model.trim="form.code" inputmode="numeric" autocomplete="one-time-code" required maxlength="6" placeholder="6 位数字" />
                <button type="button" :disabled="!canSendCode" @click="sendCode">
                  {{ countdown ? `${countdown}s 后重发` : isSending ? '发送中…' : codeSent ? '重新发送' : '发送验证码' }}
                </button>
              </div>
              <small v-if="codeSent" class="field-success">验证码已发送至 {{ maskedEmail }}，请检查收件箱和垃圾邮件。</small>
            </label>

            <label class="auth-field">
              <span>昵称</span>
              <input v-model.trim="form.username" autocomplete="username" required minlength="2" maxlength="24" placeholder="2–24 位文字、数字或下划线" />
            </label>

            <label class="auth-field">
              <span>密码</span>
              <div class="password-field">
                <input v-model="form.password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" required minlength="8" maxlength="128" placeholder="至少 8 位，同时包含字母和数字" />
                <button type="button" @click="showPassword = !showPassword">{{ showPassword ? '隐藏' : '显示' }}</button>
              </div>
            </label>

            <label class="auth-field">
              <span>确认密码</span>
              <input v-model="form.confirmPassword" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" required placeholder="再次输入密码" />
            </label>

            <label class="auth-consent">
              <input v-model="accepted" type="checkbox" required />
              <span>我了解账号仅用于同步个人知识数据，不影响匿名浏览公开内容。</span>
            </label>

            <div v-if="message.text" :class="['auth-message', message.type]" role="status">{{ message.text }}</div>
            <button class="auth-submit" type="submit" :disabled="isSubmitting || !codeSent || !accepted">
              {{ isSubmitting ? '正在创建账号…' : '创建账号' }}
            </button>
          </form>
        </template>

        <div v-else class="auth-success">
          <span aria-hidden="true">✓</span>
          <p>邮箱验证完成</p>
          <h2>欢迎你，{{ registeredUser.username }}</h2>
          <p>账号已经创建并登录，可以开始建立个人知识库、收藏内容并生成分享链接。</p>
          <router-link to="/library">创建个人知识库 <span aria-hidden="true">→</span></router-link>
          <router-link class="secondary" to="/">返回首页</router-link>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import SliderVerification from '../components/SliderVerification.vue'
import { authService } from '../services/api'
import { useAuthStore } from '../stores/auth'

const slider = ref(null)
const sliderToken = ref('')
const codeSent = ref(false)
const maskedEmail = ref('')
const countdown = ref(0)
const isSending = ref(false)
const isSubmitting = ref(false)
const showPassword = ref(false)
const accepted = ref(false)
const registeredUser = ref(null)
const message = reactive({ type: '', text: '' })
const form = reactive({ email: '', code: '', username: '', password: '', confirmPassword: '' })
const auth = useAuthStore()
let countdownTimer

const canSendCode = computed(() => {
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
  return validEmail && Boolean(sliderToken.value) && !countdown.value && !isSending.value
})

onBeforeUnmount(() => window.clearInterval(countdownTimer))

async function sendCode() {
  if (!canSendCode.value) return
  isSending.value = true
  clearMessage()
  try {
    const response = await authService.sendVerificationCode(form.email, sliderToken.value)
    codeSent.value = true
    maskedEmail.value = response.data.masked_email
    sliderToken.value = ''
    startCountdown(response.data.cooldown || 60)
    message.type = 'success'
    message.text = '验证码邮件已发出。'
  } catch (error) {
    message.type = 'error'
    message.text = error.response?.data?.message || '验证码发送失败，请稍后重试。'
    sliderToken.value = ''
    await slider.value?.reset()
  } finally {
    isSending.value = false
  }
}

function startCountdown(seconds) {
  window.clearInterval(countdownTimer)
  countdown.value = seconds
  countdownTimer = window.setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) window.clearInterval(countdownTimer)
  }, 1000)
}

async function changeEmail() {
  codeSent.value = false
  form.code = ''
  maskedEmail.value = ''
  countdown.value = 0
  window.clearInterval(countdownTimer)
  sliderToken.value = ''
  await slider.value?.reset()
}

async function register() {
  clearMessage()
  if (form.password !== form.confirmPassword) {
    message.type = 'error'
    message.text = '两次输入的密码不一致。'
    return
  }
  isSubmitting.value = true
  try {
    const response = await authService.register({
      email: form.email,
      code: form.code,
      username: form.username,
      password: form.password
    })
    auth.acceptSession(response.data)
    registeredUser.value = response.data.user
  } catch (error) {
    message.type = 'error'
    message.text = error.response?.data?.message || '注册失败，请检查信息后重试。'
  } finally {
    isSubmitting.value = false
  }
}

function clearMessage() {
  message.text = ''
}
</script>
