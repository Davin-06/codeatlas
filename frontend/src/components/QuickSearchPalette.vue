<template>
  <dialog ref="dialog" class="quick-search-dialog" @click.self="close" @close="reset">
    <div class="quick-search-panel" @keydown="handleKeydown">
      <header class="quick-search-input">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m21 21-4.35-4.35m2.35-5.15a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
        </svg>
        <label class="sr-only" for="quick-search-field">快速搜索知识</label>
        <input
          id="quick-search-field"
          ref="input"
          v-model="query"
          type="search"
          placeholder="搜索概念、报错、命令或工具…"
          autocomplete="off"
          :aria-activedescendant="activeResultId"
          aria-controls="quick-search-results"
          @input="selectedIndex = 0"
        />
        <kbd>ESC</kbd>
      </header>

      <div class="quick-search-domains" aria-label="按领域浏览">
        <button v-for="domain in domains" :key="domain.slug" type="button" @click="openDomain(domain.slug)">
          <span>{{ domain.symbol }}</span>{{ domain.name }}
        </button>
      </div>

      <section class="quick-search-results" aria-live="polite">
        <div class="quick-search-caption">
          <span>{{ resultCaption }}</span>
          <small v-if="query.trim()">{{ results.length }} 条最相关内容</small>
          <small v-else>↑↓ 选择 · Enter 打开</small>
        </div>

        <div v-if="results.length" id="quick-search-results" role="listbox">
          <button
            v-for="(item, index) in results"
            :id="`quick-result-${item.id}`"
            :key="item.id"
            type="button"
            role="option"
            :aria-selected="selectedIndex === index"
            :class="{ active: selectedIndex === index }"
            @mouseenter="selectedIndex = index"
            @click="openArticle(item)"
          >
            <span class="quick-result-mark">{{ domainMark(item.domain) }}</span>
            <span class="quick-result-copy">
              <strong>{{ item.title }}</strong>
              <small>{{ item.domain }} · {{ item.category }} · {{ item.reading_time || 5 }} 分钟</small>
            </span>
            <span v-if="favoriteIds.includes(String(item.id))" class="quick-result-saved" aria-label="已收藏">★</span>
            <span v-else class="quick-result-arrow" aria-hidden="true">↗</span>
          </button>
        </div>

        <div v-else class="quick-search-empty">
          <strong>没有找到直接匹配的内容</strong>
          <p>换一个更短的关键词，或者在完整索引中组合筛选。</p>
        </div>
      </section>

      <footer class="quick-search-footer">
        <span>支持标题、正文、标签与版本搜索</span>
        <button type="button" @click="openAllResults">
          {{ query.trim() ? '查看全部搜索结果' : '打开完整知识索引' }} <span aria-hidden="true">→</span>
        </button>
      </footer>
    </div>
  </dialog>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { demoDomains, normalizeTags } from '../data/demoData'
import { knowledgeService } from '../services/api'
import { getImportedKnowledge, getLocalKnowledge } from '../services/knowledgeLibrary'
import { getFavoriteIds, getRecentIds, resolveIds } from '../services/userLibrary'

const router = useRouter()
const dialog = ref(null)
const input = ref(null)
const query = ref('')
const items = ref(getLocalKnowledge())
const selectedIndex = ref(0)
const favoriteIds = ref(getFavoriteIds())
const domains = demoDomains

const resultCaption = computed(() => query.value.trim() ? '快速搜索结果' : (getRecentIds().length ? '最近阅读' : '推荐阅读'))
const results = computed(() => {
  const term = query.value.trim().toLocaleLowerCase('zh-CN')
  if (!term) {
    const recent = resolveIds(getRecentIds(), items.value)
    return (recent.length ? recent : items.value.slice(0, 6)).slice(0, 6)
  }

  return items.value
    .map((item) => ({ item, score: matchScore(item, term) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || String(b.item.created_at || '').localeCompare(String(a.item.created_at || '')))
    .slice(0, 8)
    .map(({ item }) => item)
})
const activeResultId = computed(() => results.value[selectedIndex.value] ? `quick-result-${results.value[selectedIndex.value].id}` : undefined)

defineExpose({ open })

async function open() {
  favoriteIds.value = getFavoriteIds()
  selectedIndex.value = 0
  dialog.value?.showModal()
  await nextTick()
  input.value?.focus()
  refreshItems()
}

function close() {
  dialog.value?.close()
}

function reset() {
  query.value = ''
  selectedIndex.value = 0
}

async function refreshItems() {
  try {
    const response = await knowledgeService.getKnowledgeList({ per_page: 2000, order: 'desc' })
    const serverItems = response.data?.data || []
    const byId = new Map([...getImportedKnowledge(), ...serverItems].map((item) => [String(item.id), item]))
    items.value = Array.from(byId.values())
  } catch {
    items.value = getLocalKnowledge()
  }
}

function matchScore(item, term) {
  const title = String(item.title || '').toLocaleLowerCase('zh-CN')
  const tags = normalizeTags(item.tags).join(' ').toLocaleLowerCase('zh-CN')
  const summary = [item.content, item.domain, item.category, item.version, item.code]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('zh-CN')
  let score = 0
  if (title === term) score += 100
  if (title.startsWith(term)) score += 55
  if (title.includes(term)) score += 35
  if (tags.includes(term)) score += 22
  if (summary.includes(term)) score += 10
  return score
}

function handleKeydown(event) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    selectedIndex.value = results.value.length ? (selectedIndex.value + 1) % results.value.length : 0
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    selectedIndex.value = results.value.length ? (selectedIndex.value - 1 + results.value.length) % results.value.length : 0
  }
  if (event.key === 'Enter' && results.value[selectedIndex.value]) {
    event.preventDefault()
    openArticle(results.value[selectedIndex.value])
  }
}

async function openArticle(item) {
  close()
  await router.push(`/knowledge/${item.id}`)
}

async function openDomain(domain) {
  close()
  await router.push({ name: 'Knowledge', query: { domain } })
}

async function openAllResults() {
  const keyword = query.value.trim()
  close()
  await router.push({ name: 'Knowledge', query: keyword ? { keyword } : {} })
}

function domainMark(domain) {
  return domains.find((item) => item.name === domain)?.symbol || 'KB'
}

function syncLibrary() {
  favoriteIds.value = getFavoriteIds()
}

window.addEventListener('codeatlas:library-changed', syncLibrary)
onBeforeUnmount(() => window.removeEventListener('codeatlas:library-changed', syncLibrary))
</script>
