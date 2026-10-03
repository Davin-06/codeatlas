<template>
  <div class="home-page">
    <section class="hero shell">
      <div class="hero-copy">
        <div class="availability">
          <span class="status-dot" aria-hidden="true"></span>
          从编程入门到工程进阶
          <span>·</span>
          <span>{{ sourceLabel }}</span>
        </div>
        <h1>让每一次搜索，<span>都更接近真正理解。</span></h1>
        <p class="hero-lead">
          从 Python、C++ 到算法、网络、Web 与 AI，把零散概念和实践经验连接起来。无论刚开始学习，还是正在排查真实问题，都能更快找到清楚、可运行的答案。
        </p>

        <form class="hero-search" role="search" @submit.prevent="search">
          <label class="sr-only" for="hero-search-input">搜索计算机知识</label>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m21 21-4.35-4.35m2.35-5.15a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
          </svg>
          <input
            id="hero-search-input"
            v-model="searchKeyword"
            type="search"
            placeholder="输入概念、报错或工具，例如“指针”“HTTP”"
            autocomplete="off"
          />
          <button type="submit">搜索知识</button>
        </form>

        <div class="quick-paths" aria-label="热门搜索">
          <span>大家在看</span>
          <router-link to="/knowledge?keyword=指针">指针</router-link>
          <router-link to="/knowledge?keyword=HTTP">HTTP</router-link>
          <router-link to="/knowledge?keyword=Git">Git</router-link>
          <router-link to="/knowledge?keyword=机器学习">机器学习</router-link>
        </div>
      </div>

      <div class="code-stage" aria-label="代码示例">
        <div class="code-stage-top">
          <div class="window-dots" aria-hidden="true"><i></i><i></i><i></i></div>
          <span>knowledge_map.py</span>
          <span class="run-state"><i></i> 可运行</span>
        </div>
        <pre><code><span class="code-muted"># 把问题连接到可用的答案</span>
<span class="code-keyword">def</span> <span class="code-function">explore</span>(question, level=<span class="code-string">"入门"</span>):
    paths = atlas.search(
        question,
        level=level,
        include=[<span class="code-string">"概念"</span>, <span class="code-string">"示例"</span>]
    )
    <span class="code-keyword">return</span> paths.best()</code></pre>
        <div class="code-stage-result">
          <span>OUT</span>
          <p><strong>12</strong> 条相关知识 · 0.08 秒</p>
          <span aria-hidden="true">↗</span>
        </div>
      </div>
    </section>

    <section class="start-guide shell" aria-labelledby="start-guide-title">
      <div class="start-guide-intro">
        <span>第一次使用？</span>
        <strong id="start-guide-title">三步找到需要的内容</strong>
      </div>
      <ol>
        <li><b>1</b><span><strong>直接搜索</strong><small>概念、报错和工具名都可以</small></span></li>
        <li><b>2</b><span><strong>缩小范围</strong><small>按领域、主题和难度筛选</small></span></li>
        <li><b>3</b><span><strong>继续沉淀</strong><small>导入资料或录入自己的经验</small></span></li>
      </ol>
      <router-link to="/knowledge?focus=search">立即查找 <span aria-hidden="true">→</span></router-link>
    </section>

    <section class="explore-section shell" aria-labelledby="explore-title">
      <div class="section-heading">
        <div>
          <p>选择一条学习路径</p>
          <h2 id="explore-title">按领域浏览，按问题查找。</h2>
        </div>
        <router-link class="text-link" to="/knowledge">查看完整索引 <span>→</span></router-link>
      </div>

      <div class="explore-layout">
        <aside class="version-rail domain-rail" aria-label="知识领域">
          <router-link
            v-for="(domain, index) in domains"
            :key="domain.name"
            :to="`/knowledge?domain=${encodeURIComponent(domain.slug)}`"
            :class="{ active: index === 0 }"
          >
            <span class="version-node" aria-hidden="true"></span>
            <span>
              <strong>{{ domain.name }}</strong>
              <small>{{ domain.description }}</small>
            </span>
            <span aria-hidden="true">→</span>
          </router-link>
        </aside>

        <div class="category-index">
          <router-link
            v-for="category in categories"
            :key="category.name"
            :to="`/knowledge?category=${encodeURIComponent(category.name)}`"
            class="category-row"
          >
            <span class="category-symbol" aria-hidden="true">{{ category.symbol || '{}' }}</span>
            <span class="category-copy">
              <strong>{{ category.name }}</strong>
              <small>{{ category.description }}</small>
            </span>
            <span class="category-count">{{ category.count || '—' }} 篇</span>
            <span class="category-arrow" aria-hidden="true">↗</span>
          </router-link>
        </div>
      </div>
    </section>

    <section class="featured-section">
      <div class="shell">
        <div class="section-heading compact">
          <div>
            <p>本周值得读</p>
            <h2>不只告诉你怎么写，也解释为什么。</h2>
          </div>
        </div>

        <div class="featured-layout">
          <router-link v-if="featured" :to="`/knowledge/${featured.id}`" class="featured-lead">
            <div class="featured-meta">
              <span>编辑精选</span>
              <span>{{ featured.reading_time || 6 }} 分钟阅读</span>
            </div>
            <h3>{{ featured.title }}</h3>
            <p>{{ featured.content }}</p>
            <div class="featured-code" aria-hidden="true">
              <span>01</span><code>{{ codeLines(featured)[0] }}</code>
              <span>02</span><code>{{ codeLines(featured)[1] }}</code>
              <span>03</span><code>{{ codeLines(featured)[2] }}</code>
            </div>
            <span class="read-action">开始阅读 <span>→</span></span>
          </router-link>

          <div class="reading-list">
            <router-link
              v-for="(item, index) in secondaryFeatured"
              :key="item.id"
              :to="`/knowledge/${item.id}`"
            >
              <span class="list-index">0{{ index + 1 }}</span>
              <span class="list-copy">
                <small>{{ item.domain }} · {{ item.category }}</small>
                <strong>{{ item.title }}</strong>
                <span>{{ item.reading_time || 5 }} 分钟阅读</span>
              </span>
              <span class="list-arrow" aria-hidden="true">↗</span>
            </router-link>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { demoDomains } from '../data/demoData'
import { knowledgeService } from '../services/api'
import { getImportedKnowledge, getLocalKnowledge } from '../services/knowledgeLibrary'
import { useCategoryStore } from '../stores/categories'

const router = useRouter()
const categoryStore = useCategoryStore()
const searchKeyword = ref('')
const domains = ref(demoDomains)
// 分类不再写死：来自服务端注册表（内置 7 个 + 用户发布时自建的全部）
const categories = computed(() => categoryStore.displayCategories)
const allKnowledge = ref(getLocalKnowledge())
const curatedIds = [203, 104, 301, 7, 205]
const popularKnowledge = ref(selectFeatured(allKnowledge.value))

const featured = computed(() => popularKnowledge.value[0])
const secondaryFeatured = computed(() => popularKnowledge.value.slice(1, 5))
const sourceLabel = computed(() => `${allKnowledge.value.length} 条知识可检索`)

onMounted(() => {
  window.addEventListener('codeatlas:knowledge-imported', handleKnowledgeChanged)
  window.addEventListener('codeatlas:categories-changed', loadCategories)
  loadCategories()
  refreshFeatured()
})
onBeforeUnmount(() => {
  window.removeEventListener('codeatlas:knowledge-imported', handleKnowledgeChanged)
  window.removeEventListener('codeatlas:categories-changed', loadCategories)
})

function loadCategories() {
  categoryStore.load()
}

// 内容变化会改变每个分类的篇数与新增分类，两个刷新一起做
function handleKnowledgeChanged() {
  loadCategories()
  refreshFeatured()
}

function selectFeatured(items) {
  const imported = items.filter((item) => item.imported).slice(0, 1)
  const curated = curatedIds.map((id) => items.find((item) => String(item.id) === String(id))).filter(Boolean)
  const picked = [...imported, ...curated]
  const pickedIds = new Set(picked.map((item) => String(item.id)))
  // 精选条目被删除时用最新内容补齐，避免首页留空
  const fallback = items.filter((item) => !pickedIds.has(String(item.id)))
  return [...picked, ...fallback].slice(0, 5)
}

async function refreshFeatured() {
  try {
    const response = await knowledgeService.getKnowledgeList({ per_page: 2000, order: 'desc' })
    allKnowledge.value = [...getImportedKnowledge(), ...(response.data?.data || [])]
  } catch {
    allKnowledge.value = getLocalKnowledge()
  }
  popularKnowledge.value = selectFeatured(allKnowledge.value)
}

function search() {
  const keyword = searchKeyword.value.trim()
  router.push({ name: 'Knowledge', query: keyword ? { keyword } : {} })
}

function codeLines(item) {
  const lines = (item.code || 'def learn(topic):\n    return find(topic)\n# keep exploring').split('\n')
  return [lines[0] || '', lines[1] || '', lines[2] || '']
}
</script>
