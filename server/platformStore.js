import { randomBytes, randomUUID } from 'node:crypto'
import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

const DEFAULT_SETTINGS = {
  siteName: '知图 CodeAtlas',
  siteTagline: '开放的计算机知识地图',
  logoUrl: '',
  logoMime: '',
  registrationEnabled: true,
  maintenanceMode: false,
  maintenanceMessage: '',
  cacheTtlSeconds: 300,
  logLevel: 'info',
  storageDriver: 'json'
}

function cleanText(value, maxLength = 500) {
  return String(value || '').trim().slice(0, maxLength)
}

// Logo 地址白名单：只允许站内相对路径（/uploads/...）或 data:image/ 内联图。
// 不允许 http(s) 外链，避免管理员被诱导填入第三方地址造成隐私/跳板问题。
export const DEFAULT_CATEGORIES = [
  { name: '语言基础', description: '语法、类型系统和语言特性' },
  { name: '算法与数据结构', description: '复杂度、经典结构与解题方法' },
  { name: '系统与网络', description: '操作系统、网络和计算机组成' },
  { name: '开发工具', description: 'Git、Linux、构建、调试与编辑器' },
  { name: '项目实践', description: '从想法到可协作交付的完整项目' },
  { name: 'Web 与安全', description: '浏览器、接口设计与常见安全边界' },
  { name: '数据与智能', description: '数据分析、机器学习与模型应用' }
]

function sanitizeLogoUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw.slice(0, 300)
  if (/^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/i.test(raw)) return raw.slice(0, 400_000)
  return ''
}

function publicLibrary(library, data) {
  const entries = data.entries.filter((entry) => entry.library_id === library.id)
  return {
    ...library,
    entry_count: entries.length,
    star_count: data.stars.filter((star) => star.library_id === library.id).length,
    fork_count: data.libraries.filter((item) => item.forked_from_library_id === library.id).length,
    share: library.share_id ? {
      id: library.share_id,
      status: library.share_status || 'published',
      url: `/share/${library.share_id}`
    } : null
  }
}

export class PlatformStore {
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
      const data = JSON.parse(await readFile(this.filePath, 'utf8'))
      if (!data || typeof data !== 'object') throw new Error('平台数据格式无效')
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      await this.#write(this.#emptyData())
    }
  }

  #emptyData() {
    return {
      libraries: [],
      entries: [],
      notifications: [],
      notificationReads: [],
      stars: [],
      auditLogs: [],
      categories: DEFAULT_CATEGORIES.map((item) => ({ ...item, builtin: true })),
      settings: { ...DEFAULT_SETTINGS }
    }
  }

  async data() {
    await this.initialize()
    const current = JSON.parse(await readFile(this.filePath, 'utf8'))
    const stored = Array.isArray(current.categories) ? current.categories : null
    return {
      ...this.#emptyData(),
      ...current,
      // 分类是「内置种子 + 用户自建」的并集。老数据文件里没有 categories 字段时自动补齐内置分类。
      categories: stored ? this.#normalizeCategories(stored) : this.#emptyData().categories,
      settings: { ...DEFAULT_SETTINGS, ...(current.settings || {}) }
    }
  }

  // 分类名去重、去空白、限长，并保证内置分类始终存在且排在前面。
  #normalizeCategories(list) {
    const seen = new Set()
    const userDefined = []
    for (const item of list) {
      const name = cleanText(item?.name, 40)
      if (!name || seen.has(name)) continue
      seen.add(name)
      if (DEFAULT_CATEGORIES.some((preset) => preset.name === name)) continue
      userDefined.push({ name, description: cleanText(item?.description, 120), builtin: false })
    }
    const builtin = DEFAULT_CATEGORIES
      .filter((preset) => !list.some((item) => cleanText(item?.name, 40) === preset.name && item?.builtin === false && item?.removed))
      .map((preset) => ({ ...preset, builtin: true }))
    return [...builtin, ...userDefined]
  }

  async listLibraries(userId) {
    const data = await this.data()
    return data.libraries
      .filter((library) => library.user_id === userId)
      .map((library) => publicLibrary(library, data))
      .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
  }

  async getLibrary(id) {
    const data = await this.data()
    const library = data.libraries.find((item) => item.id === id)
    if (!library) return null
    return {
      ...publicLibrary(library, data),
      entries: data.entries
        .filter((entry) => entry.library_id === id)
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    }
  }

  async createLibrary(userId, input) {
    const name = cleanText(input.name, 80)
    if (!name) return { errors: ['知识库名称不能为空'] }
    const now = new Date().toISOString()
    const library = {
      id: `library-${randomUUID()}`,
      user_id: userId,
      name,
      description: cleanText(input.description, 500),
      created_at: now,
      updated_at: now
    }
    await this.#update((data) => ({ ...data, libraries: [library, ...data.libraries] }))
    return { value: { ...library, entry_count: 0, share: null }, errors: [] }
  }

  async updateLibrary(id, input) {
    let updated = null
    await this.#update((data) => ({
      ...data,
      libraries: data.libraries.map((library) => {
        if (library.id !== id) return library
        updated = {
          ...library,
          ...(input.name !== undefined ? { name: cleanText(input.name, 80) } : {}),
          ...(input.description !== undefined ? { description: cleanText(input.description, 500) } : {}),
          updated_at: new Date().toISOString()
        }
        return updated
      })
    }))
    return updated
  }

  async deleteLibrary(id) {
    let removed = null
    await this.#update((data) => ({
      ...data,
      libraries: data.libraries.filter((library) => {
        if (library.id !== id) return true
        removed = library
        return false
      }),
      entries: data.entries.filter((entry) => entry.library_id !== id),
      stars: data.stars.filter((star) => star.library_id !== id)
    }))
    return removed
  }

  async deleteUserData(userId) {
    let removedLibraries = []
    await this.#update((data) => {
      removedLibraries = data.libraries.filter((library) => library.user_id === userId)
      const libraryIds = new Set(removedLibraries.map((library) => library.id))
      return {
        ...data,
        libraries: data.libraries.filter((library) => library.user_id !== userId),
        entries: data.entries.filter((entry) => !libraryIds.has(entry.library_id)),
        notificationReads: data.notificationReads.filter((read) => read.user_id !== userId),
        stars: data.stars.filter((star) => star.user_id !== userId && !libraryIds.has(star.library_id))
      }
    })
    return removedLibraries
  }

  async addEntry(libraryId, item) {
    let value = null
    let duplicate = false
    await this.#update((data) => {
      if (item.knowledge_id && data.entries.some((entry) => entry.library_id === libraryId && String(entry.knowledge_id) === String(item.knowledge_id))) {
        duplicate = true
        return data
      }
      value = {
        id: `entry-${randomUUID()}`,
        library_id: libraryId,
        knowledge_id: item.knowledge_id || null,
        title: cleanText(item.title, 160),
        content: cleanText(item.content, 20_000),
        domain: cleanText(item.domain, 40) || '自建资料',
        category: cleanText(item.category, 60) || '自建资料',
        version: cleanText(item.version, 30) || '通用',
        source_path: item.knowledge_id ? `/knowledge/${item.knowledge_id}` : null,
        created_at: new Date().toISOString()
      }
      return {
        ...data,
        entries: [value, ...data.entries],
        libraries: data.libraries.map((library) => library.id === libraryId
          ? { ...library, updated_at: new Date().toISOString() }
          : library)
      }
    })
    return { value, duplicate }
  }

  async updateEntry(libraryId, entryId, input) {
    let updated = null
    await this.#update((data) => ({
      ...data,
      entries: data.entries.map((entry) => {
        if (entry.library_id !== libraryId || entry.id !== entryId) return entry
        updated = {
          ...entry,
          ...(input.title !== undefined ? { title: cleanText(input.title, 160) } : {}),
          ...(input.content !== undefined ? { content: cleanText(input.content, 20_000) } : {}),
          updated_at: new Date().toISOString()
        }
        return updated
      })
    }))
    return updated
  }

  async removeEntry(libraryId, entryId) {
    let removed = null
    await this.#update((data) => ({
      ...data,
      entries: data.entries.filter((entry) => {
        if (entry.library_id !== libraryId || entry.id !== entryId) return true
        removed = entry
        return false
      })
    }))
    return removed
  }

  async shareLibrary(id) {
    let updated = null
    await this.#update((data) => ({
      ...data,
      libraries: data.libraries.map((library) => {
        if (library.id !== id) return library
        updated = {
          ...library,
          share_id: library.share_id || randomBytes(16).toString('hex'),
          share_status: 'published',
          shared_at: library.shared_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        return updated
      })
    }))
    return updated
  }

  async cancelShare(id) {
    let updated = null
    await this.#update((data) => ({
      ...data,
      libraries: data.libraries.map((library) => {
        if (library.id !== id) return library
        updated = { ...library, share_id: null, share_status: null, updated_at: new Date().toISOString() }
        return updated
      })
    }))
    return updated
  }

  async getSharedLibrary(shareId) {
    const data = await this.data()
    const library = data.libraries.find((item) => item.share_id === shareId && item.share_status === 'published')
    if (!library) return null
    return {
      id: library.id,
      share_id: library.share_id,
      name: library.name,
      description: library.description,
      shared_at: library.shared_at,
      user_id: library.user_id,
      star_count: data.stars.filter((star) => star.library_id === library.id).length,
      fork_count: data.libraries.filter((item) => item.forked_from_library_id === library.id).length,
      entries: data.entries.filter((entry) => entry.library_id === library.id)
    }
  }

  async listPublishedLibraries(sort = 'latest', userId = '') {
    const data = await this.data()
    const starredIds = new Set(data.stars.filter((star) => star.user_id === userId).map((star) => star.library_id))
    const libraries = data.libraries
      .filter((library) => library.share_id && library.share_status === 'published')
      .map((library) => ({ ...publicLibrary(library, data), starred: starredIds.has(library.id) }))
    if (sort === 'stars') {
      return libraries.sort((a, b) => b.star_count - a.star_count || String(b.shared_at).localeCompare(String(a.shared_at)))
    }
    return libraries.sort((a, b) => String(b.shared_at).localeCompare(String(a.shared_at)))
  }

  async listStarredLibraries(userId) {
    const data = await this.data()
    const starredAt = new Map(data.stars.filter((star) => star.user_id === userId).map((star) => [star.library_id, star.created_at]))
    return data.libraries
      .filter((library) => starredAt.has(library.id) && library.share_id && library.share_status === 'published')
      .map((library) => ({ ...publicLibrary(library, data), starred: true }))
      .sort((a, b) => String(starredAt.get(b.id)).localeCompare(String(starredAt.get(a.id))))
  }

  async isStarred(userId, libraryId) {
    if (!userId) return false
    return (await this.data()).stars.some((star) => star.user_id === userId && star.library_id === libraryId)
  }

  async starLibrary(userId, libraryId) {
    let created = false
    await this.#update((data) => {
      if (data.stars.some((star) => star.user_id === userId && star.library_id === libraryId)) return data
      created = true
      return {
        ...data,
        stars: [{ user_id: userId, library_id: libraryId, created_at: new Date().toISOString() }, ...data.stars]
      }
    })
    return created
  }

  async unstarLibrary(userId, libraryId) {
    let removed = false
    await this.#update((data) => ({
      ...data,
      stars: data.stars.filter((star) => {
        if (star.user_id === userId && star.library_id === libraryId) {
          removed = true
          return false
        }
        return true
      })
    }))
    return removed
  }

  async forkLibrary(userId, shareId) {
    let fork = null
    await this.#update((data) => {
      const source = data.libraries.find((library) => library.share_id === shareId && library.share_status === 'published')
      if (!source) return data
      const now = new Date().toISOString()
      fork = {
        id: `library-${randomUUID()}`,
        user_id: userId,
        name: `${source.name} · 副本`,
        description: source.description,
        forked_from_library_id: source.id,
        forked_from_share_id: shareId,
        created_at: now,
        updated_at: now
      }
      const copiedEntries = data.entries
        .filter((entry) => entry.library_id === source.id)
        .map((entry) => ({ ...entry, id: `entry-${randomUUID()}`, library_id: fork.id, created_at: now }))
      return { ...data, libraries: [fork, ...data.libraries], entries: [...copiedEntries, ...data.entries] }
    })
    return fork ? await this.getLibrary(fork.id) : null
  }

  async listSharedLibraries() {
    const data = await this.data()
    return data.libraries
      .filter((library) => library.share_id)
      .map((library) => publicLibrary(library, data))
      .sort((a, b) => String(b.shared_at).localeCompare(String(a.shared_at)))
  }

  async setShareStatus(id, status) {
    let updated = null
    await this.#update((data) => ({
      ...data,
      libraries: data.libraries.map((library) => {
        if (library.id !== id) return library
        updated = { ...library, share_status: status, updated_at: new Date().toISOString() }
        return updated
      })
    }))
    return updated
  }

  async createNotification(input, actorId) {
    const title = cleanText(input.title, 120)
    const content = cleanText(input.content, 2000)
    if (!title || !content) return { errors: ['标题和通知内容不能为空'] }
    const notification = {
      id: `notice-${randomUUID()}`,
      title,
      content,
      audience: input.audience === 'users' ? 'users' : 'all',
      user_ids: Array.isArray(input.user_ids) ? input.user_ids.map(String).slice(0, 500) : [],
      created_by: actorId || 'system',
      created_at: new Date().toISOString()
    }
    await this.#update((data) => ({ ...data, notifications: [notification, ...data.notifications] }))
    return { value: notification, errors: [] }
  }

  async listNotifications(userId) {
    const data = await this.data()
    const reads = new Set(data.notificationReads.filter((item) => item.user_id === userId).map((item) => item.notification_id))
    return data.notifications
      .filter((item) => item.audience === 'all' || item.user_ids.includes(userId))
      .map((item) => ({ ...item, read: reads.has(item.id) }))
  }

  async listAllNotifications() {
    const data = await this.data()
    return data.notifications.map((item) => ({
      ...item,
      read_count: data.notificationReads.filter((read) => read.notification_id === item.id).length
    }))
  }

  async markNotificationRead(userId, notificationId) {
    await this.#update((data) => {
      if (data.notificationReads.some((item) => item.user_id === userId && item.notification_id === notificationId)) return data
      return {
        ...data,
        notificationReads: [...data.notificationReads, {
          user_id: userId,
          notification_id: notificationId,
          read_at: new Date().toISOString()
        }]
      }
    })
  }

  async markAllNotificationsRead(userId) {
    let marked = 0
    await this.#update((data) => {
      const readIds = new Set(data.notificationReads.filter((item) => item.user_id === userId).map((item) => item.notification_id))
      const visible = data.notifications.filter((item) => item.audience === 'all' || item.user_ids.includes(userId))
      const unread = visible.filter((item) => !readIds.has(item.id))
      marked = unread.length
      if (!unread.length) return data
      const now = new Date().toISOString()
      return {
        ...data,
        notificationReads: [
          ...data.notificationReads,
          ...unread.map((item) => ({ user_id: userId, notification_id: item.id, read_at: now }))
        ]
      }
    })
    return marked
  }

  async listCategories() {
    return (await this.data()).categories
  }

  // 发布内容时按需建分类：已存在就直接返回，不存在则新建。这是「用户可以自己加分类」的核心入口。
  async ensureCategory(name, description = '') {
    const clean = cleanText(name, 40)
    if (!clean) return { errors: ['分类名称不能为空'] }
    if (!/^[\w\u4e00-\u9fa5][\w\u4e00-\u9fa5 +.#()\-/&]*$/.test(clean)) {
      return { errors: ['分类名称只能包含中英文、数字、空格与 + . # ( ) - / &'] }
    }
    let value = null
    let created = false
    await this.#update((data) => {
      const existing = data.categories.find((item) => item.name === clean)
      if (existing) {
        value = existing
        return data
      }
      created = true
      value = { name: clean, description: cleanText(description, 120), builtin: false }
      return { ...data, categories: [...data.categories, value] }
    })
    return { value, created, errors: [] }
  }

  async createCategory(input) {
    return this.ensureCategory(input?.name, input?.description)
  }

  async removeCategory(name) {
    const clean = cleanText(name, 40)
    if (!clean) return { errors: ['分类名称不能为空'] }
    const data = await this.data()
    const target = data.categories.find((item) => item.name === clean)
    if (!target) return { errors: ['分类不存在'] }
    if (target.builtin) return { errors: ['内置分类不可删除，可改用其他分类发布内容'] }
    await this.#update((current) => ({
      ...current,
      categories: current.categories.filter((item) => item.name !== clean)
    }))
    return { value: target, errors: [] }
  }

  async getSettings() {
    return (await this.data()).settings
  }

  async updateSettings(input) {
    const allowed = ['siteName', 'siteTagline', 'logoUrl', 'logoMime', 'registrationEnabled', 'maintenanceMode', 'maintenanceMessage', 'cacheTtlSeconds', 'logLevel']
    let settings
    await this.#update((data) => {
      const changes = Object.fromEntries(allowed.filter((key) => input[key] !== undefined).map((key) => [key, input[key]]))
      settings = {
        ...data.settings,
        ...changes,
        siteName: cleanText(changes.siteName ?? data.settings.siteName, 80),
        siteTagline: cleanText(changes.siteTagline ?? data.settings.siteTagline, 120),
        // logoUrl 只接受站内相对路径或 data: 内联图，避免被写入外部地址做跳板
        logoUrl: sanitizeLogoUrl(changes.logoUrl ?? data.settings.logoUrl),
        logoMime: cleanText(changes.logoMime ?? data.settings.logoMime, 60),
        maintenanceMessage: cleanText(changes.maintenanceMessage ?? data.settings.maintenanceMessage, 300),
        cacheTtlSeconds: Math.max(0, Math.min(86_400, Number.parseInt(changes.cacheTtlSeconds ?? data.settings.cacheTtlSeconds, 10) || 0)),
        logLevel: ['error', 'warn', 'info', 'debug'].includes(changes.logLevel) ? changes.logLevel : data.settings.logLevel,
        storageDriver: 'json',
        updated_at: new Date().toISOString()
      }
      return { ...data, settings }
    })
    return settings
  }

  async addAuditLog(action, actor, details = {}, request = null) {
    const entry = {
      id: `audit-${randomUUID()}`,
      action: cleanText(action, 100),
      actor_id: actor?.id || null,
      actor_name: actor?.username || (actor?.viaKey ? '管理密钥' : '系统'),
      details,
      ip_address: cleanText(request?.ip || request?.socket?.remoteAddress || '', 60),
      user_agent: cleanText(request?.get?.('user-agent') || '', 200),
      created_at: new Date().toISOString()
    }
    await this.#update((data) => ({ ...data, auditLogs: [entry, ...data.auditLogs].slice(0, 1000) }))
    return entry
  }

  async listAuditLogs(limit = 100) {
    return (await this.data()).auditLogs.slice(0, Math.max(1, Math.min(500, limit)))
  }

  async stats() {
    const data = await this.data()
    return {
      libraries: data.libraries.length,
      shared: data.libraries.filter((item) => item.share_id).length,
      published: data.libraries.filter((item) => item.share_status === 'published').length,
      entries: data.entries.length,
      notifications: data.notifications.length,
      stars: data.stars.length,
      forks: data.libraries.filter((item) => item.forked_from_library_id).length
    }
  }

  async #update(transform) {
    const operation = this.writeQueue.then(async () => {
      const current = await this.data()
      await this.#write(await transform(current))
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
