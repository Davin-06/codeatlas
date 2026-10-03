<template>
  <div :class="['slider-verification', { verified, loading: isLoading, error: errorMessage }]">
    <div class="slider-track">
      <div class="slider-progress" :style="{ width: `${value}%` }"></div>
      <span class="slider-label" aria-hidden="true">
        {{ verified ? '验证通过' : isVerifying ? '正在验证…' : '按住滑块，拖到最右侧' }}
      </span>
      <input
        v-model.number="value"
        type="range"
        min="0"
        max="100"
        step="1"
        :disabled="disabled || verified || isLoading || isVerifying"
        :aria-label="verified ? '滑块验证已通过' : '向右拖动完成验证'"
        @pointerdown="startPointer"
        @input="recordMovement"
        @change="finish"
        @keydown="startKeyboard"
      />
      <span class="slider-thumb-icon" :style="{ left: `calc(${value}% - ${value * 0.44}px)` }" aria-hidden="true">
        <svg v-if="verified" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>
        <svg v-else viewBox="0 0 24 24"><path d="M5 12h14m-5-5 5 5-5 5" /></svg>
      </span>
    </div>
    <div class="slider-help">
      <small>{{ errorMessage || (verified ? '本次验证 5 分钟内有效' : '用于减少机器批量发送验证码') }}</small>
      <button v-if="errorMessage" type="button" @click="reset">重新验证</button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { authService } from '../services/api'

defineProps({ disabled: Boolean })
const emit = defineEmits(['verified', 'reset'])

const value = ref(0)
const challengeId = ref('')
const verified = ref(false)
const isLoading = ref(false)
const isVerifying = ref(false)
const errorMessage = ref('')
let startedAt = 0
let inputMethod = 'pointer'
let trail = []

defineExpose({ reset })
onMounted(loadChallenge)

async function loadChallenge() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const response = await authService.getVerificationChallenge()
    challengeId.value = response.data.challenge_id
  } catch {
    errorMessage.value = '验证组件加载失败，请刷新后重试'
  } finally {
    isLoading.value = false
  }
}

function startPointer() {
  inputMethod = 'pointer'
  beginMovement()
}

function startKeyboard() {
  inputMethod = 'keyboard'
  beginMovement()
}

function beginMovement() {
  if (startedAt) return
  startedAt = performance.now()
  trail = [{ position: value.value / 100, time: 0 }]
  errorMessage.value = ''
}

function recordMovement() {
  if (!startedAt) beginMovement()
  trail.push({
    position: value.value / 100,
    time: Math.round(performance.now() - startedAt)
  })
  if (trail.length > 80) trail = trail.filter((_, index) => index % 2 === 0)
}

async function finish() {
  if (value.value < 100) {
    value.value = 0
    startedAt = 0
    trail = []
    return
  }
  if (!trail.length || trail.at(-1).position < 0.98) recordMovement()
  isVerifying.value = true
  try {
    const response = await authService.verifySlider({
      challenge_id: challengeId.value,
      elapsed: Math.round(performance.now() - startedAt),
      trail,
      method: inputMethod
    })
    verified.value = true
    emit('verified', response.data.slider_token)
  } catch (error) {
    value.value = 0
    const failureMessage = error.response?.data?.message || '验证没有通过，请重新拖动'
    await loadChallenge()
    errorMessage.value = failureMessage
  } finally {
    isVerifying.value = false
  }
}

async function reset() {
  value.value = 0
  challengeId.value = ''
  verified.value = false
  errorMessage.value = ''
  startedAt = 0
  trail = []
  emit('reset')
  await loadChallenge()
}
</script>
