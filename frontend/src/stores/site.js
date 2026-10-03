import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { siteService } from '../services/api'

const DEFAULT_SITE_NAME = '知图 CodeAtlas'
const DEFAULT_TAGLINE = '开放的计算机知识地图'

// 站点标识（名称 / 副标题 / Logo）全局共享：
// 头部品牌区、浏览器标签标题、favicon 都从这里取，保证全站一致。
export const useSiteStore = defineStore('site', () => {
  const siteName = ref(DEFAULT_SITE_NAME)
  const siteTagline = ref(DEFAULT_TAGLINE)
  const logoUrl = ref('')
  const loaded = ref(false)

  const displayName = computed(() => siteName.value || DEFAULT_SITE_NAME)
  const displayTagline = computed(() => siteTagline.value || DEFAULT_TAGLINE)

  // 品牌名拆成主名与英文副名：原设计是「知图 <i>CodeAtlas</i>」两段式
  const brandParts = computed(() => {
    const name = displayName.value
    const match = name.match(/^(\S+)\s+(.+)$/)
    return match ? { primary: match[1], secondary: match[2] } : { primary: name, secondary: '' }
  })

  function apply(next) {
    siteName.value = next?.siteName || DEFAULT_SITE_NAME
    siteTagline.value = next?.siteTagline || DEFAULT_TAGLINE
    logoUrl.value = next?.logoUrl || ''
    loaded.value = true
  }

  async function load() {
    try {
      const response = await siteService.getSite()
      apply(response.data)
    } catch {
      // 拉取失败时保留默认标识，不影响页面可用性
      loaded.value = true
    }
    syncDocumentTitle()
    applyFavicon()
  }

  // 没有自定义 Logo 时用内置 SVG，保持原版视觉
  function refresh(next) {
    apply(next)
    syncDocumentTitle()
    applyFavicon()
  }

  // 标签页标题：全站统一为「站点名 · 副标题」形式
  function syncDocumentTitle(suffix = '') {
    document.title = suffix ? `${suffix} · ${displayName.value}` : `${displayName.value} · ${displayTagline.value}`
  }

  // 有自定义 Logo 时同步到地址栏图标
  function applyFavicon() {
    const link = document.querySelector('link[rel="icon"]')
    if (!link) return
    if (logoUrl.value) {
      link.setAttribute('href', logoUrl.value)
      link.removeAttribute('type')
    } else {
      link.setAttribute('href', '/favicon.svg?v=2')
      link.setAttribute('type', 'image/svg+xml')
    }
  }

  return {
    siteName, siteTagline, logoUrl, loaded,
    displayName, displayTagline, brandParts,
    load, refresh, syncDocumentTitle, applyFavicon
  }
})

export { DEFAULT_SITE_NAME, DEFAULT_TAGLINE }
