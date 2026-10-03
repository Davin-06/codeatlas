<template>
  <div class="favorites-page shell">
    <header class="workspace-header">
      <div>
        <p class="breadcrumb"><router-link to="/">首页</router-link><span>/</span> 我的收藏</p>
        <h1>把读过的好内容留在手边。</h1>
        <p>收藏保存在当前浏览器，无需登录也能使用。需要长期保存或跨设备整理时，可以加入个人知识库。</p>
      </div>
      <button v-if="favorites.length" type="button" @click="clearAll">清空收藏</button>
    </header>

    <div class="library-entry-section">
      <div class="library-entry-heading">
        <div><h2>收藏的知识</h2><p>共 {{ favorites.length }} 条，最近收藏排在前面。</p></div>
        <router-link to="/knowledge">去知识索引添加 <span>→</span></router-link>
      </div>

      <div v-if="isLoading" class="page-loading">正在读取收藏…</div>

      <div v-else-if="favorites.length" class="library-entry-list">
        <article v-for="item in favorites" :key="item.id">
          <div>
            <p><span>{{ item.domain }}</span><span>{{ item.category }}</span><span>{{ item.version || '通用' }}</span></p>
            <h3>{{ item.title }}</h3>
            <small>{{ item.content }}</small>
          </div>
          <div>
            <router-link :to="`/knowledge/${item.id}`">阅读原文</router-link>
            <button type="button" :disabled="addingId === item.id" @click="addToLibrary(item)">
              {{ addingId === item.id ? '添加中…' : '加入知识库' }}
            </button>
            <button type="button" class="text-danger" @click="remove(item)">取消收藏</button>
          </div>
        </article>
      </div>

      <div v-else class="library-empty">
        <span aria-hidden="true">☆</span>
        <h3>还没有收藏任何知识</h3>
        <p>在知识详情页点击“收藏这篇知识”，之后就能从这里快速回看。</p>
        <router-link to="/knowledge">浏览知识索引</router-link>
      </div>
    </div>

    <div v-if="message.text" :class="['workspace-message', message.type]" role="status">{{ message.text }}</div>

    <div v-if="recent.length" class="library-entry-section">
      <div class="library-entry-heading">
        <div><h2>最近阅读</h2><p>最近打开过的 {{ recent.length }} 条内容，方便继续上次的思路。</p></div>
      </div>
      <div class="library-entry-list">
        <article v-for="item in recent" :key="item.id">
          <div>
            <p><span>{{ item.domain }}</span><span>{{ item.category }}</span></p>
            <h3>{{ item.title }}</h3>
            <small>{{ item.content }}</small>
          </div>
          <div>
            <router-link :to="`/knowledge/${item.id}`">继续阅读</router-link>
          </div>
        </article>
      </div>
    </div>

    <div v-if="showPicker" class="dialog-backdrop" @click.self="showPicker = false">
      <section class="library-picker" role="dialog" aria-modal="true" aria-labelledby="favorite-picker-title">
        <header>
          <div><span>保存到账号</span><h2 id="favorite-picker-title">加入个人知识库</h2><p>选择目标目录，这条知识会保留站内原文链接。</p></div>
          <button type="button" aria-label="关闭" @click="showPicker = false">×</button>
        </header>
        <div v-if="pickerLoading" class="page-loading">正在读取知识库…</div>
        <div v-else-if="personalLibraries.length" class="library-picker-list">
          <button v-for="lib in personalLibraries" :key="lib.id" type="button" :disabled="addingId === lib.id" @click="confirmAdd(lib)">
            <span><strong>{{ lib.name }}</strong><small>{{ lib.entry_count }} 条知识 · {{ lib.description || '没有说明' }}</small></span>
            <i>{{ addingId === lib.id ? '添加中…' : '加入' }}</i>
          </button>
        </div>
        <div v-else class="library-picker-empty">
          <p>你还没有个人知识库。</p>
          <router-link to="/library">先创建一个知识库</router-link>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { knowledgeBaseService, knowledgeService } from '../services/api'
import { getLocalKnowledge } from '../services/knowledgeLibrary'
import { clearFavorites, getFavoriteIds, getRecentIds, removeFavorite, resolveIds } from '../services/userLibrary'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const favorites = ref([])
const recent = ref([])
const isLoading = ref(true)
const addingId = ref('')
const showPicker = ref(false)
const pickerLoading = ref(false)
const personalLibraries = ref([])
const pendingItem = ref(null)
const message = reactive({ type: '', text: '' })

onMounted(load)

async function load() {
  isLoading.value = true
  const ids = getFavoriteIds()
  let items = getLocalKnowledge()
  try {
    const response = await knowledgeService.getKnowledgeList({ per_page: 2000, order: 'desc' })
    const serverItems = response.data?.data || []
    const byId = new Map([...items, ...serverItems].map((item) => [String(item.id), item]))
    items = Array.from(byId.values())
  } catch {
    // 服务不可用时退回本地数据
  }
  favorites.value = resolveIds(ids, items)
  const favoriteIdSet = new Set(favorites.value.map((item) => String(item.id)))
  recent.value = resolveIds(getRecentIds(), items).filter((item) => !favoriteIdSet.has(String(item.id)))
  isLoading.value = false
}

function remove(item) {
  removeFavorite(item.id)
  favorites.value = favorites.value.filter((entry) => String(entry.id) !== String(item.id))
  showMessage('success', `已取消收藏“${item.title}”。`)
}

function clearAll() {
  if (!window.confirm('确定清空全部收藏吗？此操作只影响当前浏览器。')) return
  clearFavorites()
  favorites.value = []
  showMessage('success', '收藏已经清空。')
}

async function addToLibrary(item) {
  if (!auth.isAuthenticated) {
    await router.push({ name: 'Login', query: { redirect: '/favorites' } })
    return
  }
  pendingItem.value = item
  showPicker.value = true
  pickerLoading.value = true
  try {
    personalLibraries.value = (await knowledgeBaseService.getKnowledgeBases()).data
  } catch (error) {
    showMessage('error', error.response?.data?.message || '读取个人知识库失败。')
    showPicker.value = false
  } finally {
    pickerLoading.value = false
  }
}

async function confirmAdd(library) {
  addingId.value = library.id
  try {
    await knowledgeBaseService.addEntry(library.id, { knowledge_id: pendingItem.value.id })
    library.entry_count += 1
    showMessage('success', `“${pendingItem.value.title}”已加入“${library.name}”。`)
    showPicker.value = false
  } catch (error) {
    showMessage('error', error.response?.data?.message || '添加失败。')
  } finally {
    addingId.value = ''
  }
}

function showMessage(type, text) {
  message.type = type
  message.text = text
}
</script>
