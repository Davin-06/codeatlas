import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { categoryService, knowledgeService } from '../services/api'

// 内置分类兜底名单：只在服务器完全不可达时用于渲染首页，
// 正常运行时以服务端返回的注册表（内置 + 用户自建）为准。
const FALLBACK_CATEGORIES = [
  { name: '语言基础', description: '语法、类型系统和语言特性', symbol: '{}', builtin: true },
  { name: '算法与数据结构', description: '复杂度、经典结构与解题方法', symbol: 'O(n)', builtin: true },
  { name: '系统与网络', description: '操作系统、网络和计算机组成', symbol: '01', builtin: true },
  { name: '开发工具', description: 'Git、Linux、构建、调试与编辑器', symbol: '>_', builtin: true },
  { name: '项目实践', description: '从想法到可协作交付的完整项目', symbol: '↗', builtin: true },
  { name: 'Web 与安全', description: '浏览器、接口设计与常见安全边界', symbol: '://', builtin: true },
  { name: '数据与智能', description: '数据分析、机器学习与模型应用', symbol: 'Σ', builtin: true }
]

// 分类图标：内置的沿用原设计，自建的按名称稳定派生一个短标记
const SYMBOL_PRESETS = {
  语言基础: '{}',
  算法与数据结构: 'O(n)',
  系统与网络: '01',
  开发工具: '>_',
  项目实践: '↗',
  'Web 与安全': '://',
  数据与智能: 'Σ'
}

function pickSymbol(name, index) {
  if (SYMBOL_PRESETS[name]) return SYMBOL_PRESETS[name]
  const derived = String(name || '').trim()
  if (/^[\x20-\x7e]+$/.test(derived) && derived.length <= 3) return derived
  return ['◇', '◈', '◉', '▣', '◆'][index % 5]
}

export const useCategoryStore = defineStore('categories', () => {
  const items = ref([])
  const loaded = ref(false)

  // 按名称归一化：去重、去空，并补上 symbol / count 等展示字段
  function normalize(list) {
    const seen = new Set()
    const result = []
    ;(Array.isArray(list) ? list : []).forEach((entry) => {
      const name = String(entry?.name || '').trim()
      if (!name || seen.has(name)) return
      seen.add(name)
      result.push({
        name,
        description: String(entry?.description || '').trim() || '用户自定义分类',
        count: Number.isFinite(entry?.count) ? entry.count : 0,
        builtin: Boolean(entry?.builtin)
      })
    })
    return result.map((entry, index) => ({ ...entry, symbol: pickSymbol(entry.name, index) }))
  }

  // 首页分类索引用的列表：过滤掉 0 篇的自建空分类，保持版面紧凑
  const displayCategories = computed(() => {
    const source = items.value.length ? items.value : normalize(FALLBACK_CATEGORIES)
    const populated = source.filter((entry) => entry.count > 0)
    return populated.length ? populated : source
  })

  const names = computed(() => displayCategories.value.map((entry) => entry.name))
  // 发布表单用的全量名单：包含还没人发布过的自建分类
  const allNames = computed(() => (items.value.length ? items.value : normalize(FALLBACK_CATEGORIES)).map((entry) => entry.name))

  function apply(next) {
    items.value = normalize(next)
    loaded.value = true
  }

  async function load() {
    try {
      // 用带篇数的接口，首页分类索引要显示「N 篇」
      const response = await knowledgeService.getCategories()
      apply(response.data)
    } catch {
      // 服务器不可达时保留兜底名单，页面照常可用
      if (!items.value.length) apply(FALLBACK_CATEGORIES)
    }
  }

  // 发布表单只需要名字，用不带篇数的轻量接口即可
  async function loadNames() {
    try {
      const response = await categoryService.getCategories()
      apply(response.data)
    } catch {
      if (!items.value.length) apply(FALLBACK_CATEGORIES)
    }
  }

  // 发布成功后调用：把新分类立刻插进本地列表，无需重新拉取
  function remember(name) {
    const clean = String(name || '').trim()
    if (!clean) return
    if (items.value.some((entry) => entry.name === clean)) return
    items.value = normalize([...items.value, { name: clean, description: '用户自定义分类', builtin: false }])
  }

  return { items, loaded, displayCategories, names, allNames, load, loadNames, apply, remember }
})

export { FALLBACK_CATEGORIES }
