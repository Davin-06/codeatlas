<template>
  <div class="explore-page shell">
    <header class="explore-header">
      <div><p class="breadcrumb"><router-link to="/">首页</router-link><span>/</span> 共享广场</p><h1>沿着别人走过的路径，继续向前。</h1><p>这里展示用户主动公开的知识库。<br class="explore-mobile-break" />你可以阅读、收藏，也可以复制<br class="explore-mobile-break" />一份到自己的账号继续整理。</p></div>
      <router-link v-if="auth.isAuthenticated" to="/library">发布我的知识库</router-link>
      <router-link v-else to="/login?redirect=/explore">登录后收藏</router-link>
    </header>

    <nav class="explore-sort" aria-label="知识库排序">
      <button type="button" :class="{ active: sort === 'latest' }" @click="changeSort('latest')"><span>最新发布</span><small>按发布时间</small></button>
      <button type="button" :class="{ active: sort === 'stars' }" @click="changeSort('stars')"><span>收藏榜</span><small>按 Star 数量</small></button>
      <button v-if="auth.isAuthenticated" type="button" :class="{ active: sort === 'mine' }" @click="changeSort('mine')"><span>我的收藏</span><small>稍后继续使用</small></button>
    </nav>

    <div v-if="loading" class="page-loading">正在整理公开知识库…</div>
    <section v-else-if="libraries.length" class="explore-list">
      <router-link v-for="(library, index) in libraries" :key="library.id" :to="`/share/${library.share_id}`" class="explore-row">
        <span class="explore-rank">{{ String(index + 1).padStart(2, '0') }}</span>
        <div class="explore-main"><p>{{ library.owner?.username || '匿名整理者' }} · {{ formatDate(library.shared_at) }}</p><h2>{{ library.name }}</h2><div>{{ library.description || '整理者还没有填写说明。' }}</div></div>
        <dl><div><dt>知识</dt><dd>{{ library.entry_count }}</dd></div><div><dt>Star</dt><dd>{{ library.star_count }}</dd></div><div><dt>Fork</dt><dd>{{ library.fork_count }}</dd></div></dl>
        <span class="explore-open">打开 <i>→</i></span>
      </router-link>
    </section>
    <div v-else class="empty-state explore-empty"><span>↗</span><h2>{{ sort === 'mine' ? '还没有收藏知识库' : '还没有公开知识库' }}</h2><p v-if="sort === 'mine'">在公开知识库中点击收藏，<br class="explore-mobile-break" />以后就能从这里快速找回。</p><p v-else>创建知识库并生成公开链接后，<br class="explore-mobile-break" />它就会出现在这里。</p><button v-if="sort === 'mine'" type="button" @click="changeSort('latest')">浏览最新发布</button><router-link v-else :to="auth.isAuthenticated ? '/library' : '/register'">发布第一个知识库</router-link></div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { shareService } from '../services/api'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const sort = ref('latest')
const libraries = ref([])
const loading = ref(true)

onMounted(async () => { await auth.initialize(); await load() })
async function load() {
  loading.value = true
  try { libraries.value = (await shareService.getPublicLibraries(sort.value)).data }
  finally { loading.value = false }
}
async function changeSort(next) { if (sort.value === next) return; sort.value = next; await load() }
function formatDate(value) { return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(new Date(value)) }
</script>
