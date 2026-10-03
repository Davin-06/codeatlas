<template>
  <div class="index-page shell">
    <header class="index-header club-index-header">
      <div>
        <p class="breadcrumb"><router-link to="/">首页</router-link><span>/</span> 知识索引</p>
        <h1>把问题说出来，答案会自己收拢。</h1>
        <p>支持搜索概念、报错、命令和标签；不确定准确名称时，输入一两个关键字也可以。</p>
      </div>
      <div class="index-stat" aria-label="当前知识数量">
        <strong>{{ allKnowledge.length }}</strong>
        <span>条知识内容</span>
      </div>
    </header>

    <nav class="domain-tabs" aria-label="知识领域">
      <button
        type="button"
        :class="{ active: !selectedDomain && !importedOnly && !favoriteOnly }"
        @click="selectDomain('')"
      >
        <span>全部</span><small>{{ allKnowledge.length }}</small>
      </button>
      <button
        v-for="domain in domains"
        :key="domain.name"
        type="button"
        :class="{ active: selectedDomain === domain.slug }"
        @click="selectDomain(domain.slug)"
      >
        <span>{{ domain.name }}</span><small>{{ domainCount(domain.slug) }}</small>
      </button>
      <button
        v-if="importedCount"
        type="button"
        :class="{ active: importedOnly }"
        @click="toggleImported"
      >
        <span>自行添加</span><small>{{ importedCount }}</small>
      </button>
      <button
        v-if="favoriteCount"
        type="button"
        :class="{ active: favoriteOnly }"
        @click="toggleFavorites"
      >
        <span>我的收藏</span><small>{{ favoriteCount }}</small>
      </button>
    </nav>

    <form class="filter-bar club-filter-bar" role="search" @submit.prevent="applyFilters">
      <div class="filter-search">
        <label for="index-search">搜索全部内容</label>
        <div>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m21 21-4.35-4.35m2.35-5.15a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
          </svg>
          <input
            id="index-search"
            ref="searchInput"
            v-model="searchKeyword"
            type="search"
            placeholder="例如：内存泄漏、二分查找、CMake"
            autocomplete="off"
            @input="queueSearch"
          />
          <button v-if="searchKeyword" class="search-clear" type="button" aria-label="清除搜索词" @click="clearKeyword">×</button>
          <kbd v-else>/</kbd>
        </div>
      </div>
      <div class="filter-control">
        <label for="category-filter">知识主题</label>
        <select id="category-filter" v-model="selectedCategory" @change="applyFilters">
          <option value="">全部主题</option>
          <option v-for="category in categoryOptions" :key="category" :value="category">
            {{ category }}
          </option>
        </select>
      </div>
      <div class="filter-control">
        <label for="level-filter">学习难度</label>
        <select id="level-filter" v-model="selectedLevel" @change="applyFilters">
          <option value="">全部难度</option>
          <option value="入门">入门</option>
          <option value="进阶">进阶</option>
          <option value="项目">项目实践</option>
        </select>
      </div>
      <div class="filter-control version-control">
        <label for="version-filter">版本 / 环境</label>
        <select id="version-filter" v-model="selectedVersion" @change="applyFilters">
          <option value="">全部版本</option>
          <option v-for="version in versionOptions" :key="version" :value="version">{{ version }}</option>
        </select>
      </div>
      <button class="filter-submit" type="submit">开始查找 <span aria-hidden="true">→</span></button>
    </form>

    <div class="search-suggestions" aria-label="搜索建议">
      <span>试试这些</span>
      <button v-for="term in suggestions" :key="term" type="button" @click="quickSearch(term)">{{ term }}</button>
    </div>

    <div v-if="activeFilters.length" class="filter-chips" aria-label="当前筛选条件">
      <span>当前筛选</span>
      <button v-for="filter in activeFilters" :key="filter.key" type="button" @click="removeFilter(filter.key)">
        {{ filter.label }} <span aria-hidden="true">×</span>
      </button>
    </div>

    <div class="active-filter-row">
      <p>
        <span :class="['source-indicator', { live: isServerConnected }]" aria-hidden="true"></span>
        {{ isServerConnected ? '共享知识库已连接' : '离线浏览模式' }} · 找到 {{ totalItems }} 条结果
        <template v-if="importedCount"> · 含 {{ importedCount }} 条自行添加内容</template>
      </p>
      <button v-if="hasFilters" type="button" @click="clearFilters">清除全部筛选</button>
    </div>

    <section aria-live="polite">
      <div v-if="knowledgeList.length" class="knowledge-results">
        <router-link
          v-for="item in knowledgeList"
          :key="item.id"
          :to="`/knowledge/${item.id}`"
          class="knowledge-row"
        >
          <div class="knowledge-row-main">
            <div class="knowledge-kicker">
              <span>{{ item.domain || 'Python' }}</span>
              <span>{{ item.category }}</span>
              <span>{{ item.level || '入门' }}</span>
              <span v-if="item.imported" class="imported-badge">已导入</span>
              <span v-if="favoriteIds.includes(String(item.id))" class="saved-badge">★ 已收藏</span>
            </div>
            <h2>{{ item.title }}</h2>
            <p>{{ item.content }}</p>
            <div class="tag-list" aria-label="标签">
              <span v-for="tag in normalizeTags(item.tags).slice(0, 4)" :key="tag"># {{ tag }}</span>
            </div>
          </div>
          <div class="knowledge-row-meta">
            <span>{{ item.version || '通用' }}</span>
            <span>{{ item.author || '知识贡献者' }}</span>
            <span>{{ item.reading_time || 5 }} 分钟</span>
            <span class="row-arrow" aria-hidden="true">↗</span>
          </div>
        </router-link>
      </div>

      <div v-else class="empty-state">
        <span aria-hidden="true">{ ? }</span>
        <h2>没有找到完全匹配的内容</h2>
        <p>试试更短的关键词，或者清除领域和难度限制。</p>
        <button type="button" @click="clearFilters">查看全部知识</button>
      </div>
    </section>

    <nav v-if="totalPages > 1" class="pagination" aria-label="分页">
      <button type="button" :disabled="currentPage === 1" @click="changePage(currentPage - 1)">
        <span aria-hidden="true">←</span> 上一页
      </button>
      <span>第 <strong>{{ currentPage }}</strong> 页，共 {{ totalPages }} 页</span>
      <button type="button" :disabled="currentPage === totalPages" @click="changePage(currentPage + 1)">
        下一页 <span aria-hidden="true">→</span>
      </button>
    </nav>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { demoDomains, filterKnowledge, normalizeTags } from '../data/demoData'
import { knowledgeService } from '../services/api'
import { getImportedKnowledge, getLocalKnowledge } from '../services/knowledgeLibrary'
import { getFavoriteIds } from '../services/userLibrary'

const route = useRoute()
const router = useRouter()
const searchInput = ref(null)
const domains = ref(demoDomains)
const allKnowledge = ref(getLocalKnowledge())
const isServerConnected = ref(false)
const selectedDomain = ref('')
const selectedCategory = ref('')
const selectedLevel = ref('')
const selectedVersion = ref('')
const searchKeyword = ref('')
const importedOnly = ref(false)
const favoriteOnly = ref(false)
const favoriteIds = ref(getFavoriteIds())
const currentPage = ref(1)
const pageSize = 9
const suggestions = ['指针', 'HTTP', 'Git 冲突', '二分查找', 'Linux 排障', '机器学习']
let searchTimer

const importedCount = computed(() => allKnowledge.value.filter((item) => item.imported).length)
const favoriteCount = computed(() => allKnowledge.value.filter((item) => favoriteIds.value.includes(String(item.id))).length)
const categoryOptions = computed(() => [...new Set(allKnowledge.value
  .filter((item) => !selectedDomain.value || item.domain === selectedDomain.value)
  .map((item) => item.category)
  .filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN')))
const versionOptions = computed(() => [...new Set(allKnowledge.value
  .filter((item) => !selectedDomain.value || item.domain === selectedDomain.value)
  .map((item) => item.version)
  .filter(Boolean))])
const filteredKnowledge = computed(() => {
  const source = importedOnly.value
    ? allKnowledge.value.filter((item) => item.imported)
    : favoriteOnly.value
      ? allKnowledge.value.filter((item) => favoriteIds.value.includes(String(item.id)))
      : allKnowledge.value
  return filterKnowledge(source, {
    domain: selectedDomain.value,
    category: selectedCategory.value,
    level: selectedLevel.value,
    version: selectedVersion.value,
    keyword: searchKeyword.value
  })
})
const totalItems = computed(() => filteredKnowledge.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / pageSize)))
const knowledgeList = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredKnowledge.value.slice(start, start + pageSize)
})
const hasFilters = computed(() => Boolean(
  selectedDomain.value || selectedCategory.value || selectedLevel.value
  || selectedVersion.value || searchKeyword.value || importedOnly.value || favoriteOnly.value
))
const activeFilters = computed(() => [
  selectedDomain.value && { key: 'domain', label: `领域：${selectedDomain.value}` },
  selectedCategory.value && { key: 'category', label: `主题：${selectedCategory.value}` },
  selectedLevel.value && { key: 'level', label: `难度：${selectedLevel.value}` },
  selectedVersion.value && { key: 'version', label: `环境：${selectedVersion.value}` },
  searchKeyword.value && { key: 'keyword', label: `搜索：${searchKeyword.value}` },
  importedOnly.value && { key: 'source', label: '自行添加' },
  favoriteOnly.value && { key: 'saved', label: '我的收藏' }
].filter(Boolean))

watch(() => route.fullPath, syncFromRoute, { immediate: true })
watch(totalPages, (pages) => {
  if (currentPage.value > pages) currentPage.value = pages
})

onMounted(() => {
  window.addEventListener('codeatlas:knowledge-imported', refreshKnowledge)
  window.addEventListener('codeatlas:library-changed', refreshFavorites)
  refreshKnowledge()
  if (route.query.focus === 'search') nextTick(() => searchInput.value?.focus())
})
onBeforeUnmount(() => {
  window.removeEventListener('codeatlas:knowledge-imported', refreshKnowledge)
  window.removeEventListener('codeatlas:library-changed', refreshFavorites)
  window.clearTimeout(searchTimer)
})

async function refreshKnowledge() {
  const localImports = getImportedKnowledge()
  try {
    const response = await knowledgeService.getKnowledgeList({ per_page: 2000, order: 'desc' })
    const serverItems = response.data?.data || []
    allKnowledge.value = [...localImports, ...serverItems]
    isServerConnected.value = true
  } catch {
    allKnowledge.value = getLocalKnowledge()
    isServerConnected.value = false
  }
}

function syncFromRoute() {
  selectedDomain.value = String(route.query.domain || '')
  selectedCategory.value = String(route.query.category || '')
  selectedLevel.value = String(route.query.level || '')
  selectedVersion.value = String(route.query.version || '')
  searchKeyword.value = String(route.query.keyword || '')
  importedOnly.value = route.query.source === 'imported'
  favoriteOnly.value = route.query.saved === '1'
  currentPage.value = Math.max(1, Number.parseInt(route.query.page, 10) || 1)
}

function createQuery(overrides = {}) {
  const values = {
    domain: selectedDomain.value,
    category: selectedCategory.value,
    level: selectedLevel.value,
    version: selectedVersion.value,
    keyword: searchKeyword.value.trim(),
    source: importedOnly.value ? 'imported' : '',
    saved: favoriteOnly.value ? '1' : '',
    ...overrides
  }
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value))
}

function applyFilters() {
  router.push({ name: 'Knowledge', query: createQuery() })
}

function selectDomain(domain) {
  selectedDomain.value = domain
  selectedCategory.value = ''
  selectedVersion.value = ''
  importedOnly.value = false
  favoriteOnly.value = false
  router.push({ name: 'Knowledge', query: createQuery({ domain, category: '', version: '', source: '', saved: '' }) })
}

function toggleImported() {
  importedOnly.value = !importedOnly.value
  favoriteOnly.value = false
  router.push({ name: 'Knowledge', query: createQuery({ source: importedOnly.value ? 'imported' : '', saved: '' }) })
}

function toggleFavorites() {
  favoriteOnly.value = !favoriteOnly.value
  importedOnly.value = false
  router.push({ name: 'Knowledge', query: createQuery({ saved: favoriteOnly.value ? '1' : '', source: '' }) })
}

function quickSearch(term) {
  searchKeyword.value = term
  router.push({ name: 'Knowledge', query: createQuery({ keyword: term }) })
}

function queueSearch() {
  window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    router.replace({ name: 'Knowledge', query: createQuery({ keyword: searchKeyword.value.trim(), page: '' }) })
  }, 320)
}

function clearKeyword() {
  window.clearTimeout(searchTimer)
  searchKeyword.value = ''
  router.push({ name: 'Knowledge', query: createQuery({ keyword: '', page: '' }) })
  nextTick(() => searchInput.value?.focus())
}

function removeFilter(key) {
  if (key === 'domain') selectedDomain.value = ''
  if (key === 'category') selectedCategory.value = ''
  if (key === 'level') selectedLevel.value = ''
  if (key === 'version') selectedVersion.value = ''
  if (key === 'keyword') searchKeyword.value = ''
  if (key === 'source') importedOnly.value = false
  if (key === 'saved') favoriteOnly.value = false
  router.push({ name: 'Knowledge', query: createQuery({ [key]: '', page: '' }) })
}

function clearFilters() {
  router.push({ name: 'Knowledge' })
}

function changePage(page) {
  router.push({ query: { ...route.query, page } })
  window.scrollTo({ top: 360, behavior: 'smooth' })
}

function domainCount(domain) {
  return allKnowledge.value.filter((item) => item.domain === domain).length
}

function refreshFavorites() {
  favoriteIds.value = getFavoriteIds()
}
</script>
