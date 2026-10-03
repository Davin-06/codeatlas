<template>
  <div class="detail-page shell">
    <div v-if="isLoading" class="detail-loading" aria-label="正在加载知识详情">
      <i></i><span></span><span></span><span></span>
    </div>

    <template v-else-if="article">
      <nav class="breadcrumb" aria-label="面包屑">
        <router-link to="/">首页</router-link>
        <span>/</span>
        <router-link to="/knowledge">知识索引</router-link>
        <span>/</span>
        <span>{{ article.category }}</span>
      </nav>

      <div class="detail-layout">
        <article class="article">
          <header class="article-header">
            <div class="article-overline">
              <span>{{ article.domain || 'Python' }}</span>
              <span>{{ article.version }}</span>
              <span>{{ article.category }}</span>
              <span>{{ readingMinutes }} 分钟阅读</span>
            </div>
            <h1>{{ article.title }}</h1>
            <p>{{ article.content }}</p>
            <div class="article-byline">
              <span class="avatar" aria-hidden="true">{{ domainMark }}</span>
              <span>
                <strong>{{ article.author || '知图编辑组' }}</strong>
                <small>更新于 {{ formatDate(article.created_at) }}</small>
              </span>
            </div>
            <div class="article-save-actions">
              <button class="article-save-button" type="button" :class="{ selected: saved }" @click="toggleSaved">
                <span aria-hidden="true">{{ saved ? '★' : '☆' }}</span>
                {{ saved ? '已收藏到当前浏览器' : '收藏这篇知识' }}
              </button>
              <button class="article-library-button" type="button" @click="openLibraryPicker"><span aria-hidden="true">＋</span> 加入个人知识库</button>
              <router-link v-if="favoriteCount" class="article-library-button" to="/favorites"><span aria-hidden="true">☆</span> 查看我的收藏（{{ favoriteCount }}）</router-link>
            </div>
          </header>

          <section id="objectives" class="learning-objectives" aria-labelledby="objectives-title">
            <div>
              <span aria-hidden="true">✓</span>
              <h2 id="objectives-title">学完这篇，你应该能够</h2>
            </div>
            <ul>
              <li v-for="objective in articleContent.objectives" :key="objective">{{ objective }}</li>
            </ul>
          </section>

          <section id="principle" aria-labelledby="principle-title">
            <h2 id="principle-title">核心原理</h2>
            <p v-for="paragraph in articleContent.principles" :key="paragraph">{{ paragraph }}</p>
            <ul class="key-point-list">
              <li v-for="(point, index) in articleContent.keyPoints" :key="point">
                <span>{{ index + 1 }}</span><p>{{ point }}</p>
              </li>
            </ul>
            <div class="note-block">
              <span aria-hidden="true">i</span>
              <p><strong>学习建议</strong>{{ articleContent.tip }}</p>
            </div>
          </section>

          <section id="walkthrough" aria-labelledby="walkthrough-title">
            <h2 id="walkthrough-title">分步理解</h2>
            <ol class="walkthrough-list">
              <li v-for="(step, index) in articleContent.steps" :key="step.title">
                <span>{{ index + 1 }}</span>
                <div><h3>{{ step.title }}</h3><p>{{ step.body }}</p></div>
              </li>
            </ol>
          </section>

          <section id="example" aria-labelledby="example-title">
            <div class="article-section-title">
              <div><h2 id="example-title">最小可运行示例</h2><p>先让结果可重复，再逐步改动。</p></div>
              <button type="button" :aria-label="copied ? '代码已复制' : '复制代码'" @click="copyCode">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 8h11v11H8zM5 16H4V5h11v1" />
                </svg>
                {{ copied ? '已复制' : '复制' }}
              </button>
            </div>
            <div class="article-code">
              <div><span></span><span></span><span></span><small>{{ articleContent.file }}</small></div>
              <pre><code>{{ article.code || fallbackCode }}</code></pre>
            </div>
          </section>

          <section id="pitfalls" aria-labelledby="pitfalls-title">
            <h2 id="pitfalls-title">常见误区与排查</h2>
            <ul class="pitfall-list">
              <li v-for="pitfall in articleContent.pitfalls" :key="pitfall">
                <span aria-hidden="true">!</span><p>{{ pitfall }}</p>
              </li>
            </ul>
          </section>

          <section id="practice" aria-labelledby="practice-title">
            <h2 id="practice-title">练习与项目检查</h2>
            <div class="exercise-list">
              <article v-for="(exercise, index) in articleContent.exercises" :key="exercise">
                <span>{{ ['入门', '进阶', '实践'][index] || `练习 ${index + 1}` }}</span>
                <p>{{ exercise.replace(/^(入门|进阶|实践)：/, '') }}</p>
              </article>
            </div>
            <h3 class="check-heading">放进真实项目之前</h3>
            <ul class="check-list">
              <li v-for="item in articleContent.checklist" :key="item"><span aria-hidden="true">✓</span>{{ item }}</li>
            </ul>
          </section>

          <section id="related" class="related-reading" aria-labelledby="related-title">
            <div class="article-section-title">
              <div><h2 id="related-title">继续沿着这条路径学习</h2><p>同领域、同主题的相关内容。</p></div>
              <router-link to="/knowledge">返回知识索引</router-link>
            </div>
            <div>
              <router-link v-for="item in relatedArticles" :key="item.id" :to="`/knowledge/${item.id}`">
                <small>{{ item.domain }} · {{ item.level }}</small>
                <strong>{{ item.title }}</strong>
                <span aria-hidden="true">→</span>
              </router-link>
            </div>
          </section>

          <footer class="article-footer">
            <p>这篇内容有帮助吗？</p>
            <div>
              <button type="button" @click="feedback = 'useful'" :class="{ selected: feedback === 'useful' }">有帮助</button>
              <button type="button" @click="feedback = 'improve'" :class="{ selected: feedback === 'improve' }">可以更好</button>
            </div>
            <small v-if="feedback">已记录，感谢你的反馈。</small>
          </footer>
        </article>

        <aside class="article-aside">
          <nav class="aside-block article-toc" aria-label="本文目录">
            <p>本文目录</p>
            <a href="#objectives">学习目标</a>
            <a href="#principle">核心原理</a>
            <a href="#walkthrough">分步理解</a>
            <a href="#example">最小示例</a>
            <a href="#pitfalls">常见误区</a>
            <a href="#practice">练习与检查</a>
          </nav>
          <div class="aside-block">
            <p>知识坐标</p>
            <dl>
              <div><dt>领域</dt><dd>{{ article.domain || 'Python' }}</dd></div>
              <div><dt>版本</dt><dd>{{ article.version || '通用' }}</dd></div>
              <div><dt>主题</dt><dd>{{ article.category }}</dd></div>
              <div><dt>数据源</dt><dd>{{ articleSource }}</dd></div>
            </dl>
          </div>
          <div class="aside-block">
            <p>相关标签</p>
            <div class="aside-tags">
              <router-link
                v-for="tag in normalizeTags(article.tags)"
                :key="tag"
                :to="`/knowledge?keyword=${encodeURIComponent(tag)}`"
              >
                # {{ tag }}
              </router-link>
            </div>
          </div>
          <button class="aside-copy-link" type="button" @click="copyLink">
            <span aria-hidden="true">↗</span>{{ linkCopied ? '链接已复制' : '复制本文链接' }}
          </button>
          <router-link v-if="nextArticle" class="aside-next" :to="`/knowledge/${nextArticle.id}`">
            <small>继续阅读</small>
            <strong>{{ nextArticle.title }}</strong>
            <span aria-hidden="true">→</span>
          </router-link>
        </aside>
      </div>
    </template>

    <div v-else class="empty-state detail-empty">
      <span aria-hidden="true">404</span>
      <h1>没有找到这条知识</h1>
      <p>它可能已被移动，或者链接本身不完整。</p>
      <router-link to="/knowledge">返回知识索引</router-link>
    </div>

    <div v-if="showLibraryPicker" class="dialog-backdrop" @click.self="showLibraryPicker = false">
      <section class="library-picker" role="dialog" aria-modal="true" aria-labelledby="library-picker-title">
        <header><div><span>保存到账号</span><h2 id="library-picker-title">加入个人知识库</h2><p>选择一个目录，这篇知识会保留站内原文链接。</p></div><button type="button" aria-label="关闭" @click="showLibraryPicker = false">×</button></header>
        <div v-if="pickerLoading" class="page-loading">正在读取知识库…</div>
        <div v-else-if="personalLibraries.length" class="library-picker-list">
          <button v-for="library in personalLibraries" :key="library.id" type="button" :disabled="addingLibraryId === library.id" @click="addToLibrary(library)"><span><strong>{{ library.name }}</strong><small>{{ library.entry_count }} 条知识 · {{ library.description || '没有说明' }}</small></span><i>{{ addingLibraryId === library.id ? '添加中…' : '加入' }}</i></button>
        </div>
        <div v-else class="library-picker-empty"><p>你还没有个人知识库。</p><router-link to="/library">先创建一个知识库</router-link></div>
        <p v-if="pickerMessage" :class="['picker-message', { error: pickerError }]">{{ pickerMessage }}</p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { knowledgeBaseService, knowledgeService } from '../services/api'
import { normalizeTags } from '../data/demoData'
import { buildArticleContent } from '../services/articleContent'
import { findLocalKnowledge, getLocalKnowledge } from '../services/knowledgeLibrary'
import { getFavoriteIds, isFavorite, recordRecent, toggleFavorite } from '../services/userLibrary'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const article = ref(null)
const isLoading = ref(true)
const copied = ref(false)
const linkCopied = ref(false)
const feedback = ref('')
const saved = ref(false)
const favoriteCount = ref(getFavoriteIds().length)
const showLibraryPicker = ref(false)
const pickerLoading = ref(false)
const personalLibraries = ref([])
const addingLibraryId = ref('')
const pickerMessage = ref('')
const pickerError = ref(false)
const articleContent = computed(() => buildArticleContent(article.value || {}))
const readingMinutes = computed(() => Math.max(8, Number(article.value?.reading_time) || 8))
const articleSource = computed(() => article.value?.imported ? '自行添加' : '内置知识')
const fallbackCode = computed(() => {
  const examples = {
    'C++': '#include <iostream>\n\nint main() {\n    std::cout << "Keep learning!";\n}',
    'Web 开发': '<main>\n  <h1>Keep learning!</h1>\n</main>',
    计算机基础: '输入 → 处理过程 → 输出\n先用小例子验证，再总结规律',
    工程实践: '目标 → 最小步骤 → 验证 → 记录 → 改进',
    'AI 与数据': 'baseline = evaluate(data)\nresult = run_experiment(data)\ncompare(baseline, result)'
  }
  return examples[article.value?.domain]
    || 'def learn(topic):\n    result = knowledge.find(topic)\n    return result'
})
const domainMark = computed(() => {
  const marks = { Python: 'PY', 'C++': 'C+', 计算机基础: 'CS', 工程实践: 'DEV', 'Web 开发': 'WEB', 'AI 与数据': 'AI' }
  return marks[article.value?.domain] || 'KB'
})

const corpus = ref(getLocalKnowledge())

const relatedArticles = computed(() => {
  if (!article.value) return []
  const items = corpus.value.filter((item) => String(item.id) !== String(article.value.id))
  const currentTags = new Set(normalizeTags(article.value.tags))
  return items
    .map((item) => {
      const sharedTags = normalizeTags(item.tags).filter((tag) => currentTags.has(tag)).length
      return {
        ...item,
        relevance: Number(item.domain === article.value.domain) * 2
          + Number(item.category === article.value.category)
          + sharedTags
      }
    })
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 3)
})

const nextArticle = computed(() => {
  const items = corpus.value
  if (!items.length) return null
  const sameDomain = items.filter((item) => item.domain === article.value?.domain)
  const pool = sameDomain.length > 1 ? sameDomain : items
  const currentIndex = pool.findIndex((item) => String(item.id) === String(article.value?.id))
  const next = pool[(currentIndex + 1) % pool.length]
  return next && String(next.id) !== String(article.value?.id) ? next : null
})

watch(() => route.params.id, loadArticle, { immediate: true })
onMounted(() => {
  loadCorpus()
  window.addEventListener('codeatlas:library-changed', refreshFavoriteCount)
})
onBeforeUnmount(() => {
  window.removeEventListener('codeatlas:library-changed', refreshFavoriteCount)
})

async function loadCorpus() {
  try {
    const response = await knowledgeService.getKnowledgeList({ per_page: 2000, order: 'desc' })
    const serverItems = response.data?.data || []
    if (serverItems.length) {
      const byId = new Map([...getLocalKnowledge(), ...serverItems].map((item) => [String(item.id), item]))
      corpus.value = Array.from(byId.values())
    }
  } catch {
    corpus.value = getLocalKnowledge()
  }
}

async function loadArticle() {
  isLoading.value = true
  copied.value = false
  linkCopied.value = false
  feedback.value = ''
  try {
    const response = await knowledgeService.getKnowledgeDetail(route.params.id)
    if (!response.data) throw new Error('Missing article')
    article.value = response.data
  } catch {
    article.value = findLocalKnowledge(route.params.id)
  } finally {
    isLoading.value = false
    if (article.value) {
      saved.value = isFavorite(article.value.id)
      recordRecent(article.value.id)
    }
  }
}

function refreshFavoriteCount() {
  favoriteCount.value = getFavoriteIds().length
}

function toggleSaved() {
  if (!article.value) return
  saved.value = toggleFavorite(article.value.id)
  refreshFavoriteCount()
}
async function openLibraryPicker() {
  if (!auth.isAuthenticated) {
    await router.push({ name: 'Login', query: { redirect: route.fullPath } })
    return
  }
  showLibraryPicker.value = true
  pickerLoading.value = true
  pickerMessage.value = ''
  try {
    personalLibraries.value = (await knowledgeBaseService.getKnowledgeBases()).data
  } catch (error) {
    pickerError.value = true
    pickerMessage.value = error.response?.data?.message || '读取个人知识库失败。'
  } finally {
    pickerLoading.value = false
  }
}

async function addToLibrary(library) {
  addingLibraryId.value = library.id
  pickerMessage.value = ''
  pickerError.value = false
  try {
    await knowledgeBaseService.addEntry(library.id, { knowledge_id: article.value.id })
    library.entry_count += 1
    pickerMessage.value = `已加入“${library.name}”。`
  } catch (error) {
    pickerError.value = true
    pickerMessage.value = error.response?.data?.message || '添加失败。'
  } finally {
    addingLibraryId.value = ''
  }
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    linkCopied.value = true
    window.setTimeout(() => { linkCopied.value = false }, 1600)
  } catch {
    linkCopied.value = false
  }
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(article.value.code || fallbackCode.value)
    copied.value = true
    window.setTimeout(() => { copied.value = false }, 1600)
  } catch {
    copied.value = false
  }
}

function formatDate(date) {
  if (!date) return '近期'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(date))
}
</script>
