import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import path from 'node:path'

const scrypt = promisify(scryptCallback)

function normalizeEmail(value) {
  return String(value || '').trim().toLocaleLowerCase('en-US')
}

export class UserStore {
  constructor(filePath, options = {}) {
    this.filePath = filePath
    this.bootstrapAdminEmail = normalizeEmail(options.bootstrapAdminEmail)
    // 受保护邮箱（环境变量指定 + SMTP 发信邮箱）：固定为 system_admin，且任何账号都改不了
    this.protectedEmails = new Set(
      [options.bootstrapAdminEmail, ...(options.protectedEmails || [])]
        .map(normalizeEmail)
        .filter(Boolean)
    )
    this.writeQueue = Promise.resolve()
  }

  // SMTP 发信邮箱可能随时在管理后台变更，因此支持运行时刷新受保护名单
  setProtectedEmails(extraEmails = []) {
    this.protectedEmails = new Set(
      [this.bootstrapAdminEmail, ...extraEmails].map(normalizeEmail).filter(Boolean)
    )
  }

  isProtectedEmail(email) {
    return this.protectedEmails.has(normalizeEmail(email))
  }

  // 对外暴露的受保护邮箱列表，供前端渲染锁标
  listProtectedEmails() {
    return [...this.protectedEmails]
  }

  async initialize() {
    await mkdir(path.dirname(this.filePath), { recursive: true })
    try {
      const users = JSON.parse(await readFile(this.filePath, 'utf8'))
      if (!Array.isArray(users)) throw new Error('用户数据格式无效')
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      await this.#write([])
    }
  }

  async all() {
    await this.initialize()
    return JSON.parse(await readFile(this.filePath, 'utf8')).map((user) => ({
      role: 'user',
      status: 'active',
      sessions: [],
      ...user
    }))
  }

  async create({ email, username, password }) {
    const normalizedEmail = normalizeEmail(email)
    const normalizedName = String(username || '').trim()
    let created = null
    let conflict = ''

    await this.#update(async (users) => {
      if (users.some((user) => user.email === normalizedEmail)) {
        conflict = '这个邮箱已经注册'
        return users
      }
      if (users.some((user) => user.username.toLocaleLowerCase('zh-CN') === normalizedName.toLocaleLowerCase('zh-CN'))) {
        conflict = '这个昵称已经被使用'
        return users
      }

      const salt = randomBytes(16).toString('base64')
      const passwordHash = Buffer.from(await scrypt(password, salt, 64)).toString('base64')
      created = {
        id: `user-${randomUUID()}`,
        email: normalizedEmail,
        username: normalizedName,
        password_hash: passwordHash,
        password_salt: salt,
        role: this.isProtectedEmail(normalizedEmail) ? 'system_admin' : 'user',
        status: 'active',
        sessions: [],
        email_verified_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      }
      return [...users, created]
    })

    return { value: created && this.toPublic(created), conflict }
  }

  toPublic(user) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role || 'user',
      status: user.status || 'active',
      email_verified_at: user.email_verified_at,
      created_at: user.created_at
    }
  }

  async find(id) {
    const user = (await this.all()).find((item) => item.id === id)
    return user ? this.toPublic(user) : null
  }

  async findByEmail(email) {
    return (await this.all()).find((item) => item.email === normalizeEmail(email)) || null
  }

  async verifyCredentials(email, password) {
    const user = await this.findByEmail(email)
    if (!user || user.status !== 'active') return null
    const passwordHash = Buffer.from(await scrypt(String(password || ''), user.password_salt, 64))
    const expected = Buffer.from(user.password_hash, 'base64')
    if (passwordHash.length !== expected.length || !timingSafeEqual(passwordHash, expected)) return null
    return this.toPublic(user)
  }

  async createSession(userId, { days = 30 } = {}) {
    const token = randomBytes(32).toString('base64url')
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60_000).toISOString()
    let found = false
    await this.#update((users) => users.map((user) => {
      if (user.id !== userId) return user
      found = true
      const activeSessions = (user.sessions || []).filter((session) => new Date(session.expires_at).getTime() > Date.now())
      return {
        ...user,
        sessions: [...activeSessions, { id: randomUUID(), token_hash: tokenHash, created_at: new Date().toISOString(), expires_at: expiresAt }]
      }
    }))
    return found ? { token, expires_at: expiresAt } : null
  }

  async findByToken(token) {
    if (!token) return null
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const now = Date.now()
    const user = (await this.all()).find((item) => item.status === 'active' && (item.sessions || []).some(
      (session) => session.token_hash === tokenHash && new Date(session.expires_at).getTime() > now
    ))
    return user ? this.toPublic(user) : null
  }

  async revokeSession(token) {
    const tokenHash = createHash('sha256').update(String(token || '')).digest('hex')
    await this.#update((users) => users.map((user) => ({
      ...user,
      sessions: (user.sessions || []).filter((session) => session.token_hash !== tokenHash)
    })))
  }

  async updateProfile(userId, input) {
    const username = String(input.username || '').trim()
    if (!/^[\p{L}\p{N}_-]{2,24}$/u.test(username)) return { errors: ['昵称格式不正确'] }
    let updated = null
    let conflict = false
    await this.#update((users) => {
      if (users.some((user) => user.id !== userId && user.username.toLocaleLowerCase('zh-CN') === username.toLocaleLowerCase('zh-CN'))) {
        conflict = true
        return users
      }
      return users.map((user) => {
        if (user.id !== userId) return user
        updated = { ...user, username, updated_at: new Date().toISOString() }
        return updated
      })
    })
    return { value: updated ? this.toPublic(updated) : null, conflict, errors: [] }
  }

  async changePassword(userId, currentPassword, nextPassword) {
    const users = await this.all()
    const user = users.find((item) => item.id === userId)
    if (!user) return { error: '用户不存在' }
    const currentHash = Buffer.from(await scrypt(String(currentPassword || ''), user.password_salt, 64))
    const expected = Buffer.from(user.password_hash, 'base64')
    if (currentHash.length !== expected.length || !timingSafeEqual(currentHash, expected)) return { error: '当前密码不正确' }
    await this.setPasswordByEmail(user.email, nextPassword)
    return { value: true }
  }

  async setPasswordByEmail(email, password) {
    const salt = randomBytes(16).toString('base64')
    const passwordHash = Buffer.from(await scrypt(password, salt, 64)).toString('base64')
    let updated = false
    await this.#update((users) => users.map((user) => {
      if (user.email !== normalizeEmail(email)) return user
      updated = true
      return { ...user, password_hash: passwordHash, password_salt: salt, sessions: [], updated_at: new Date().toISOString() }
    }))
    return updated
  }

  async list(query = '') {
    const term = String(query || '').trim().toLocaleLowerCase('zh-CN')
    return (await this.all())
      .filter((user) => !term || `${user.username} ${user.email} ${user.role}`.toLocaleLowerCase('zh-CN').includes(term))
      .map((user) => this.toPublic(user))
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
  }

  async updateByAdmin(id, input) {
    let updated = null
    let blocked = ''
    await this.#update((users) => users.map((user) => {
      if (user.id !== id) return user
      // 受保护账号（引导管理员 / SMTP 发信邮箱）角色与状态全部冻结
      if (this.isProtectedEmail(user.email)) {
        blocked = '这个账号已被锁定为系统管理员，不允许修改角色或状态'
        return user
      }
      const role = ['user', 'admin', 'system_admin'].includes(input.role) ? input.role : user.role
      const status = ['active', 'disabled'].includes(input.status) ? input.status : user.status
      updated = { ...user, role, status, sessions: status === 'disabled' ? [] : user.sessions, updated_at: new Date().toISOString() }
      return updated
    }))
    if (blocked) return { blocked }
    return updated ? this.toPublic(updated) : null
  }

  async remove(id) {
    let removed = null
    let blocked = ''
    await this.#update((users) => users.filter((user) => {
      if (user.id !== id) return true
      if (this.isProtectedEmail(user.email)) {
        blocked = '这个账号已被锁定为系统管理员，不允许删除'
        return true
      }
      removed = user
      return false
    }))
    if (blocked) return { blocked }
    return removed ? this.toPublic(removed) : null
  }

  // 内部纠偏专用：把受保护账号补齐为 system_admin（不走保护拦截）。
  // 只允许用于系统自身的同步逻辑，不暴露给任何管理接口。
  async forceRole(id, role) {
    let updated = null
    await this.#update((users) => users.map((user) => {
      if (user.id !== id) return user
      updated = { ...user, role, status: 'active', updated_at: new Date().toISOString() }
      return updated
    }))
    return updated ? this.toPublic(updated) : null
  }

  async count() {
    const users = await this.all()
    return {
      total: users.length,
      active: users.filter((user) => user.status === 'active').length,
      disabled: users.filter((user) => user.status === 'disabled').length,
      admins: users.filter((user) => ['admin', 'system_admin'].includes(user.role)).length
    }
  }

  async #update(transform) {
    const operation = this.writeQueue.then(async () => {
      const current = await this.all()
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
