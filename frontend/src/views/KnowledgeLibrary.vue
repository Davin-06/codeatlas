<template>
  <div class="library-page shell">
    <header class="workspace-header">
      <div>
        <p class="breadcrumb"><router-link to="/">首页</router-link><span>/</span> 我的知识库</p>
        <h1>把收藏变成自己的学习系统。</h1>
        <p>按主题建立多个知识库，添加站内知识或自己的笔记，需要时导出或生成分享链接。</p>
      </div>
      <button type="button" @click="showCreate = !showCreate">{{ showCreate ? '取消创建' : '新建知识库' }}</button>
    </header>

    <form v-if="showCreate" class="library-create-bar" @submit.prevent="createLibrary">
      <label><span>知识库名称</span><input v-model.trim="createForm.name" required maxlength="80" placeholder="例如：Python 进阶路线" /></label>
      <label><span>一句话说明</span><input v-model.trim="createForm.description" maxlength="500" placeholder="这个知识库准备用来整理什么？" /></label>
      <button type="submit" :disabled="isSaving">{{ isSaving ? '创建中…' : '确认创建' }}</button>
    </form>

    <div v-if="message.text" :class="['workspace-message', message.type]" role="status">{{ message.text }}</div>

    <div v-if="libraries.length" class="library-workspace">
      <aside class="library-sidebar">
        <div class="library-sidebar-title"><span>我的目录</span><small>{{ libraries.length }} 个</small></div>
        <button v-for="library in libraries" :key="library.id" type="button" :class="{ active: selectedId === library.id }" @click="selectLibrary(library.id)">
          <span><strong>{{ library.name }}</strong><small>{{ library.entry_count }} 条知识</small></span>
          <i v-if="library.share" :class="library.share.status" aria-label="已分享"></i>
        </button>
      </aside>

      <main v-if="selected" class="library-content">
        <header class="library-content-header">
          <div>
            <span>{{ selected.share ? '公开分享中' : '仅自己可见' }}</span>
            <h2>{{ selected.name }}</h2>
            <p>{{ selected.description || '还没有说明，可以在设置中补充。' }}</p>
            <router-link v-if="selected.forked_from_share_id" class="library-origin" :to="`/share/${selected.forked_from_share_id}`">⑂ 源自一个公开知识库</router-link>
          </div>
          <div class="library-actions">
            <button type="button" @click="showSettings = !showSettings">设置</button>
            <button type="button" @click="showCustomEntry = !showCustomEntry">添加笔记</button>
          </div>
        </header>

        <section v-if="showSettings" class="library-settings-panel">
          <form @submit.prevent="saveLibrary">
            <label><span>名称</span><input v-model.trim="editForm.name" required maxlength="80" /></label>
            <label><span>说明</span><textarea v-model.trim="editForm.description" rows="3" maxlength="500"></textarea></label>
            <button type="submit">保存资料</button>
          </form>
          <div class="library-share-settings">
            <strong>分享与导出</strong>
            <p>分享链接只展示这个知识库中的条目，不包含账号和其他私人内容。</p>
            <div v-if="selected.share" class="share-link-row">
              <input :value="shareUrl" readonly aria-label="分享链接" />
              <button type="button" @click="copyShare">{{ copied ? '已复制' : '复制链接' }}</button>
              <button type="button" class="danger" @click="cancelShare">关闭分享</button>
            </div>
            <button v-else type="button" @click="createShare">生成公开分享链接</button>
            <div class="export-actions">
              <button type="button" @click="exportLibrary('json')">导出 JSON</button>
              <button type="button" @click="exportLibrary('csv')">导出 CSV</button>
              <button type="button" class="danger" @click="deleteLibrary">删除知识库</button>
            </div>
          </div>
        </section>

        <form v-if="showCustomEntry" class="custom-entry-form" @submit.prevent="addCustomEntry">
          <div><strong>添加自己的学习笔记</strong><button type="button" @click="showCustomEntry = false">关闭</button></div>
          <label><span>标题</span><input v-model.trim="entryForm.title" required maxlength="160" placeholder="这条笔记讲什么？" /></label>
          <label><span>内容</span><textarea v-model.trim="entryForm.content" required rows="4" placeholder="记录结论、示例或待验证的问题。"></textarea></label>
          <div class="custom-entry-grid">
            <label><span>领域</span><input v-model.trim="entryForm.domain" placeholder="自建资料" /></label>
            <label><span>主题</span><input v-model.trim="entryForm.category" placeholder="学习笔记" /></label>
          </div>
          <button type="submit">添加到知识库</button>
        </form>

        <section class="library-entry-section" aria-labelledby="library-entry-title">
          <div class="library-entry-heading">
            <div><h2 id="library-entry-title">知识条目</h2><p>站内内容保留原文链接，自建笔记保留完整文本。</p></div>
            <router-link to="/knowledge">去知识索引添加 <span>→</span></router-link>
          </div>

          <div v-if="selected.entries?.length" class="library-entry-list">
            <article v-for="entry in selected.entries" :key="entry.id">
              <div>
                <p><span>{{ entry.domain }}</span><span>{{ entry.category }}</span><span>{{ entry.version }}</span></p>
                <h3>{{ entry.title }}</h3>
                <small>{{ entry.content }}</small>
              </div>
              <div>
                <router-link v-if="entry.knowledge_id" :to="entry.source_path">阅读原文</router-link>
                <button type="button" @click="removeEntry(entry)">移除</button>
              </div>
            </article>
          </div>
          <div v-else class="library-empty">
            <span aria-hidden="true">＋</span>
            <h3>这个知识库还是空的</h3>
            <p>可以从知识详情页添加，也可以在这里写一条自己的笔记。</p>
            <router-link to="/knowledge">浏览知识索引</router-link>
          </div>
        </section>
      </main>
    </div>

    <div v-else-if="!isLoading" class="empty-state library-first-empty">
      <span aria-hidden="true">{＋}</span>
      <h2>先创建第一个个人知识库</h2>
      <p>例如“Python 入门”“比赛准备”或“服务器运维”，以后可以随时调整。</p>
      <button type="button" @click="showCreate = true">创建知识库</button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { knowledgeBaseService, shareService } from '../services/api'

const libraries = ref([])
const route = useRoute()
const selected = ref(null)
const selectedId = ref('')
const showCreate = ref(false)
const showSettings = ref(false)
const showCustomEntry = ref(false)
const isLoading = ref(true)
const isSaving = ref(false)
const copied = ref(false)
const message = reactive({ type: '', text: '' })
const createForm = reactive({ name: '', description: '' })
const editForm = reactive({ name: '', description: '' })
const entryForm = reactive({ title: '', content: '', domain: '自建资料', category: '学习笔记', version: '通用' })

const shareUrl = computed(() => selected.value?.share ? `${window.location.origin}${selected.value.share.url}` : '')

onMounted(async () => {
  await loadLibraries()
  if (route.query.from === 'fork') showMessage('success', '已复制为独立知识库，现在可以自由编辑、导出或重新发布。')
})

async function loadLibraries(preferredId = selectedId.value) {
  isLoading.value = true
  try {
    const response = await knowledgeBaseService.getKnowledgeBases()
    libraries.value = response.data
    const nextId = preferredId && libraries.value.some((item) => item.id === preferredId) ? preferredId : libraries.value[0]?.id
    if (nextId) await selectLibrary(nextId)
    else selected.value = null
  } catch (error) {
    showError(error, '无法读取个人知识库。')
  } finally {
    isLoading.value = false
  }
}

async function selectLibrary(id) {
  selectedId.value = id
  const response = await knowledgeBaseService.getKnowledgeBase(id)
  selected.value = response.data
  Object.assign(editForm, { name: selected.value.name, description: selected.value.description || '' })
  showSettings.value = false
  showCustomEntry.value = false
}

async function createLibrary() {
  isSaving.value = true
  try {
    const response = await knowledgeBaseService.createKnowledgeBase(createForm)
    Object.assign(createForm, { name: '', description: '' })
    showCreate.value = false
    await loadLibraries(response.data.id)
    showMessage('success', '个人知识库已经创建。')
  } catch (error) {
    showError(error, '创建失败。')
  } finally {
    isSaving.value = false
  }
}

async function saveLibrary() {
  try {
    await knowledgeBaseService.updateKnowledgeBase(selectedId.value, editForm)
    await loadLibraries(selectedId.value)
    showSettings.value = true
    showMessage('success', '知识库资料已经更新。')
  } catch (error) {
    showError(error, '保存失败。')
  }
}

async function deleteLibrary() {
  if (!window.confirm(`确定删除“${selected.value.name}”吗？其中的条目和分享链接都会一并删除。`)) return
  await knowledgeBaseService.deleteKnowledgeBase(selectedId.value)
  selectedId.value = ''
  await loadLibraries()
  showMessage('success', '知识库已经删除。')
}

async function addCustomEntry() {
  try {
    await knowledgeBaseService.addEntry(selectedId.value, entryForm)
    Object.assign(entryForm, { title: '', content: '', domain: '自建资料', category: '学习笔记', version: '通用' })
    showCustomEntry.value = false
    await loadLibraries(selectedId.value)
    showMessage('success', '笔记已经加入知识库。')
  } catch (error) {
    showError(error, '添加失败。')
  }
}

async function removeEntry(entry) {
  if (!window.confirm(`从知识库移除“${entry.title}”吗？`)) return
  await knowledgeBaseService.removeEntry(selectedId.value, entry.id)
  await loadLibraries(selectedId.value)
}

async function createShare() {
  const response = await shareService.createShare(selectedId.value)
  await loadLibraries(selectedId.value)
  showSettings.value = true
  showMessage('success', '公开分享链接已经生成。')
  return response
}

async function cancelShare() {
  if (!window.confirm('关闭后原分享链接将立即失效，确定继续吗？')) return
  await shareService.cancelShare(selectedId.value)
  await loadLibraries(selectedId.value)
  showSettings.value = true
}

async function copyShare() {
  await navigator.clipboard.writeText(shareUrl.value)
  copied.value = true
  window.setTimeout(() => { copied.value = false }, 1600)
}

async function exportLibrary(format) {
  const blob = await knowledgeBaseService.exportKnowledgeBase(selectedId.value, format)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${selected.value.name}.${format}`
  link.click()
  URL.revokeObjectURL(url)
}

function showMessage(type, text) {
  message.type = type
  message.text = text
}

function showError(error, fallback) {
  showMessage('error', error.response?.data?.message || fallback)
}
</script>
