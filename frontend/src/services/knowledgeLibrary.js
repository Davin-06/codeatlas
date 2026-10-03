import { demoKnowledge, normalizeTags } from '../data/demoData.js'
import { normalizeArticleList } from './articleContent.js'

const STORAGE_KEY = 'codeatlas.imported-knowledge.v1'
const LEGACY_STORAGE_KEY = 'pyatlas.imported-knowledge.v1'
const REQUIRED_FIELDS = ['title', 'content']

function parseCsvRows(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    const next = text[index + 1]

    if (character === '"' && quoted && next === '"') {
      field += '"'
      index += 1
    } else if (character === '"') {
      quoted = !quoted
    } else if (character === ',' && !quoted) {
      row.push(field.trim())
      field = ''
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1
      row.push(field.trim())
      if (row.some(Boolean)) rows.push(row)
      row = []
      field = ''
    } else {
      field += character
    }
  }

  row.push(field.trim())
  if (row.some(Boolean)) rows.push(row)
  return rows
}

export function parseCsv(text) {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ''))
  if (rows.length < 2) throw new Error('CSV 至少需要一行表头和一行内容')

  const headers = rows[0].map((header) => header.trim().toLowerCase())
  return rows.slice(1).map((row) => Object.fromEntries(
    headers.map((header, index) => [header, row[index] || ''])
  ))
}

export function parseJson(text) {
  const parsed = JSON.parse(text)
  const items = Array.isArray(parsed) ? parsed : parsed.items
  if (!Array.isArray(items)) throw new Error('JSON 顶层应为数组，或包含 items 数组')
  return items
}

export function normalizeImportedItem(item, index = 0) {
  const missing = REQUIRED_FIELDS.filter((field) => !String(item[field] || '').trim())
  if (missing.length) throw new Error(`第 ${index + 1} 条缺少 ${missing.join('、')}`)

  const rawTags = item.tags || item.tag || []
  const tags = Array.isArray(rawTags)
    ? rawTags.map(String).map((tag) => tag.trim()).filter(Boolean)
    : normalizeTags(String(rawTags))

  return {
    id: item.id ? `imported-${String(item.id)}` : `imported-${Date.now()}-${index}`,
    domain: String(item.domain || item.language || '自建资料').trim(),
    level: String(item.level || '入门').trim(),
    title: String(item.title).trim(),
    content: String(item.content).trim(),
    version: String(item.version || '通用').trim(),
    category: String(item.category || '自建资料').trim(),
    tags,
    author: String(item.author || '知识贡献者').trim(),
    created_at: item.created_at || new Date().toISOString(),
    reading_time: Math.max(1, Number.parseInt(item.reading_time, 10) || 5),
    code: String(item.code || '').replace(/\\n/g, '\n'),
    principle: String(item.principle || '').trim(),
    key_points: normalizeArticleList(item.key_points),
    pitfalls: normalizeArticleList(item.pitfalls),
    exercises: normalizeArticleList(item.exercises),
    imported: true
  }
}

export async function parseKnowledgeFile(file) {
  const text = await file.text()
  const extension = file.name.split('.').pop()?.toLowerCase()
  const rawItems = extension === 'json' ? parseJson(text) : parseCsv(text)
  const items = []
  const errors = []

  rawItems.forEach((item, index) => {
    try {
      items.push(normalizeImportedItem(item, index))
    } catch (error) {
      errors.push(error.message)
    }
  })

  if (!items.length) throw new Error(errors[0] || '文件里没有可导入的知识条目')
  return { items, errors }
}

export function getImportedKnowledge() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveImportedKnowledge(items) {
  const existing = getImportedKnowledge()
  const byId = new Map(existing.map((item) => [String(item.id), item]))
  items.forEach((item) => byId.set(String(item.id), item))
  const saved = Array.from(byId.values())
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
  window.dispatchEvent(new CustomEvent('codeatlas:knowledge-imported', {
    detail: { count: items.length }
  }))
  return saved
}

export function getLocalKnowledge() {
  return [...getImportedKnowledge(), ...demoKnowledge]
}

export function findLocalKnowledge(id) {
  return getLocalKnowledge().find((item) => String(item.id) === String(id)) || null
}

export const csvTemplate = `title,content,domain,category,level,version,tags,author,reading_time,code,principle,key_points,pitfalls,exercises
二分查找入门,"在有序数组中每次排除一半搜索空间。",计算机基础,算法与数据结构,入门,通用,"二分查找,算法",算法学习组,8,"while left <= right:\\n    mid = (left + right) // 2","二分查找通过比较中点不断缩小候选区间。","统一区间定义|每轮必须缩小范围","边界更新不一致|无序数据不能直接使用","验证空数组|查找重复元素"`
