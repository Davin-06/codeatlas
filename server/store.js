import { randomUUID } from 'node:crypto'
import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { demoKnowledge, filterKnowledge, normalizeTags } from '../frontend/src/data/demoData.js'

const MAX_TEXT = 20_000

function cleanText(value, fallback = '', maxLength = MAX_TEXT) {
  return String(value ?? fallback).trim().slice(0, maxLength)
}

function cleanList(value) {
  const items = Array.isArray(value)
    ? value
    : String(value || '').split(/\r?\n|\s*\|\s*/)
  return items.map((item) => cleanText(item, '', 500)).filter(Boolean).slice(0, 12)
}

export function validateKnowledge(input, { partial = false } = {}) {
  const errors = []
  if (!partial || input.title !== undefined) {
    if (!cleanText(input.title, '', 160)) errors.push('title 不能为空')
  }
  if (!partial || input.content !== undefined) {
    if (!cleanText(input.content)) errors.push('content 不能为空')
  }
  if (errors.length) return { errors }

  const normalized = {}
  const assign = (key, value) => {
    if (!partial || input[key] !== undefined) normalized[key] = value
  }

  assign('title', cleanText(input.title, '', 160))
  assign('content', cleanText(input.content))
  assign('domain', cleanText(input.domain, '自建资料', 40))
  assign('category', cleanText(input.category, '自建资料', 60))
  assign('level', cleanText(input.level, '入门', 20))
  assign('version', cleanText(input.version, '通用', 30))
  assign('author', cleanText(input.author, '知识贡献者', 60))
  assign('code', cleanText(input.code, '', MAX_TEXT))
  assign('principle', cleanText(input.principle, '', MAX_TEXT))
  assign('key_points', cleanList(input.key_points))
  assign('pitfalls', cleanList(input.pitfalls))
  assign('exercises', cleanList(input.exercises))
  assign('reading_time', Math.max(1, Math.min(120, Number.parseInt(input.reading_time, 10) || 5)))
  assign('tags', normalizeTags(input.tags).slice(0, 10).map((tag) => cleanText(tag, '', 30)))

  return { value: normalized, errors: [] }
}

export class KnowledgeStore {
  constructor(filePath) {
    this.filePath = filePath
    this.writeQueue = Promise.resolve()
    this.initializePromise = null
  }

  async initialize() {
    if (!this.initializePromise) {
      this.initializePromise = this.#initialize().catch((error) => {
        this.initializePromise = null
        throw error
      })
    }
    return this.initializePromise
  }

  async #initialize() {
    await mkdir(path.dirname(this.filePath), { recursive: true })
    try {
      const raw = await readFile(this.filePath, 'utf8')
      const current = JSON.parse(raw)
      if (!Array.isArray(current)) throw new Error('知识库数据格式无效')

      const builtInIds = new Set(demoKnowledge.map((item) => String(item.id)))
      const customItems = current.filter((item) => item.imported || !builtInIds.has(String(item.id)))
      const synchronized = [...customItems, ...demoKnowledge]
      if (JSON.stringify(current) !== JSON.stringify(synchronized)) {
        await this.#write(synchronized)
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      await this.#write(demoKnowledge)
    }
  }

  async all() {
    await this.initialize()
    const raw = await readFile(this.filePath, 'utf8')
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  }

  async query(filters = {}) {
    const items = filterKnowledge(await this.all(), filters)
    const order = filters.order === 'asc' ? 1 : -1
    return items.sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')) * order)
  }

  async find(id) {
    return (await this.all()).find((item) => String(item.id) === String(id)) || null
  }

  async import(items) {
    const prepared = []
    const errors = []
    items.forEach((item, index) => {
      const result = validateKnowledge(item)
      if (result.errors.length) {
        errors.push(`第 ${index + 1} 条：${result.errors.join('、')}`)
        return
      }
      prepared.push({
        id: `club-${randomUUID()}`,
        ...result.value,
        imported: true,
        created_at: item.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    })

    if (!prepared.length) return { imported: [], errors }
    await this.#update((current) => [...prepared, ...current])
    return { imported: prepared, errors }
  }

  async create(item) {
    const result = validateKnowledge(item)
    if (result.errors.length) return result
    const value = {
      id: `club-${randomUUID()}`,
      ...result.value,
      imported: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    await this.#update((current) => [value, ...current])
    return { value, errors: [] }
  }

  async update(id, changes) {
    const result = validateKnowledge(changes, { partial: true })
    if (result.errors.length) return result
    let updated = null
    await this.#update((current) => current.map((item) => {
      if (String(item.id) !== String(id)) return item
      updated = { ...item, ...result.value, updated_at: new Date().toISOString() }
      return updated
    }))
    return { value: updated, errors: [] }
  }

  async remove(id) {
    let removed = null
    await this.#update((current) => current.filter((item) => {
      if (String(item.id) !== String(id)) return true
      removed = item
      return false
    }))
    return removed
  }

  async #update(transform) {
    const operation = this.writeQueue.then(async () => {
      const current = await this.all()
      await this.#write(transform(current))
    })
    this.writeQueue = operation.catch(() => {})
    await operation
  }

  async #write(data) {
    const temporary = `${this.filePath}.tmp`
    await writeFile(temporary, JSON.stringify(data, null, 2), 'utf8')
    try {
      await copyFile(this.filePath, `${this.filePath}.bak`)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    await rename(temporary, this.filePath)
  }
}
