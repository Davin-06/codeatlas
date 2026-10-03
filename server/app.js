import express from 'express'
import { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { KnowledgeStore } from './store.js'
import { MailSettingsStore, SmtpMailService } from './mail.js'
import { UserStore } from './userStore.js'
import { PlatformStore } from './platformStore.js'

const serverDirectory = path.dirname(fileURLToPath(import.meta.url))
const defaultDataFile = path.join(serverDirectory, 'data', 'knowledge.json')
const defaultUserFile = path.join(serverDirectory, 'data', 'users.json')
const defaultMailSettingsFile = path.join(serverDirectory, 'data', 'mail-settings.json')
const defaultPlatformFile = path.join(serverDirectory, 'data', 'platform.json')
const levels = new Set(['入门', '进阶', '项目'])
const emailPattern = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i

function requireWriteKey(importKey) {
  return (request, response, next) => {
    if (!importKey) {
      return response.status(503).json({
        success: false,
        code: 'IMPORT_KEY_MISSING',
        message: '服务端未配置管理密钥（IMPORT_KEY），已禁用写入；请联系管理员完成配置'
      })
    }
    if (request.get('x-import-key') === importKey) return next()
    response.status(401).json({ success: false, message: '管理密钥不正确' })
  }
}

function normalizeEmail(value) {
  return String(value || '').trim().toLocaleLowerCase('en-US')
}

function isValidEmail(value) {
  const [local = ''] = value.split('@')
  return value.length <= 254 && local.length <= 64 && !local.includes('..') && emailPattern.test(value)
}

function csvEscape(value) {
  const text = String(value ?? '')
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

// 按文件头判断真实图片类型，防止改扩展名或伪造 MIME 上传非图片内容
function matchesImageSignature(buffer, mime) {
  if (buffer.length < 12) return false
  const isPng = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  const isGif = buffer.subarray(0, 3).toString('ascii') === 'GIF'
  const isWebp = buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  if (mime === 'image/png') return isPng
  if (mime === 'image/jpeg') return isJpeg
  if (mime === 'image/gif') return isGif
  if (mime === 'image/webp') return isWebp
  if (mime === 'image/svg+xml') {
    const head = buffer.subarray(0, 1024).toString('utf8').trimStart()
    // SVG 必须真的是 <svg 开头，且剔除脚本/外链，避免存储型 XSS
    if (!/^<\?xml|^<svg/i.test(head)) return false
    const full = buffer.toString('utf8')
    return !/<script|on\w+\s*=|javascript:|<foreignObject|<!ENTITY/i.test(full)
  }
  return false
}

export async function createApp(options = {}) {
  const store = options.store || new KnowledgeStore(options.dataFile || process.env.DATA_FILE || defaultDataFile)
  const importKey = options.importKey ?? process.env.IMPORT_KEY ?? ''
  const settingsSecret = options.settingsSecret || process.env.SETTINGS_SECRET || importKey || randomBytes(32).toString('hex')
  const userStore = options.userStore || new UserStore(options.userFile || process.env.USER_DATA_FILE || defaultUserFile, {
    bootstrapAdminEmail: options.bootstrapAdminEmail || process.env.BOOTSTRAP_ADMIN_EMAIL || ''
  })
  const platformStore = options.platformStore || new PlatformStore(options.platformFile || process.env.PLATFORM_DATA_FILE || defaultPlatformFile)
  const mailSettingsStore = options.mailSettingsStore || new MailSettingsStore(
    options.mailSettingsFile || process.env.MAIL_SETTINGS_FILE || defaultMailSettingsFile,
    settingsSecret
  )
  const mailService = options.mailService || new SmtpMailService(mailSettingsStore)
  const verificationSecret = options.verificationSecret || process.env.VERIFICATION_SECRET || settingsSecret

  // 把当前 SMTP 发信邮箱并入受保护名单：SMTP 账号一旦注册就自动是系统管理员，
  // 且与引导管理员互相不可修改。发信邮箱在管理后台变更后需要重新同步。
  async function syncProtectedAdminEmails() {
    let sender = ''
    try {
      const mailSettings = await mailSettingsStore.publicSettings()
      sender = mailSettings.fromAddress || mailSettings.username || ''
    } catch {
      sender = ''
    }
    userStore.setProtectedEmails([sender].filter(Boolean))
  }
  await syncProtectedAdminEmails()
  // 受保护邮箱如果已经注册过但角色不是 system_admin（例如 SMTP 邮箱后配的），
  // 这里把它补正为 system_admin，保证“锁定名单 = 系统管理员”始终成立。
  async function promoteProtectedAccounts() {
    const protectedEmails = userStore.listProtectedEmails()
    if (!protectedEmails.length) return
    const users = await userStore.all()
    for (const email of protectedEmails) {
      const existing = users.find((user) => user.email === email)
      if (!existing || existing.role === 'system_admin') continue
      await userStore.forceRole(existing.id, 'system_admin')
      await platformStore.addAuditLog('system.protected_account_promoted', null, { email }, null)
    }
  }
  await promoteProtectedAccounts()

  // 发布/导入内容时按需登记分类，让用户新建的分类自动进入首页与筛选器。
  // 分类名非法（超长、含奇怪字符）时静默跳过，不影响内容本身的写入。
  async function registerCategories(values) {
    for (const item of values) {
      if (!item?.category) continue
      try {
        await platformStore.ensureCategory(item.category, item.categoryDescription || '')
      } catch {
        // 分类登记失败不应阻断内容发布
      }
    }
  }

  const verificationCodes = new Map()
  const sliderChallenges = new Map()
  const sliderTokens = new Map()
  const sendHistory = new Map()
  const loginFailures = new Map()

  // 登录失败限流：同一邮箱 + IP 组合在窗口内失败次数过多时锁定
  const LOGIN_WINDOW_MS = 15 * 60_000
  const LOGIN_MAX_FAILURES = 5

  function loginAttemptKey(request, email) {
    const ip = request.ip || request.socket?.remoteAddress || 'unknown'
    return `${ip}:${email}`
  }

  function loginLockedRemaining(request, email) {
    const key = loginAttemptKey(request, email)
    const record = loginFailures.get(key)
    if (!record) return 0
    const now = Date.now()
    const recent = record.filter((time) => now - time < LOGIN_WINDOW_MS)
    if (recent.length !== record.length) loginFailures.set(key, recent)
    if (recent.length < LOGIN_MAX_FAILURES) return 0
    const oldest = Math.min(...recent)
    return Math.max(1, Math.ceil((LOGIN_WINDOW_MS - (now - oldest)) / 1000))
  }

  function pruneLoginFailures(now = Date.now()) {
    for (const [key, times] of loginFailures) {
      const recent = times.filter((time) => now - time < LOGIN_WINDOW_MS)
      if (recent.length) loginFailures.set(key, recent)
      else loginFailures.delete(key)
    }
  }

  function recordLoginFailure(request, email) {
    const key = loginAttemptKey(request, email)
    const now = Date.now()
    if (loginFailures.size > 2000) pruneLoginFailures(now)
    const recent = (loginFailures.get(key) || []).filter((time) => now - time < LOGIN_WINDOW_MS)
    loginFailures.set(key, [...recent, now])
  }

  function clearLoginFailures(request, email) {
    loginFailures.delete(loginAttemptKey(request, email))
  }
  await store.initialize()
  await userStore.initialize()
  await platformStore.initialize()
  await mailSettingsStore.initialize()

  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '5mb' }))
  app.use((request, response, next) => {
    response.set('X-Content-Type-Options', 'nosniff')
    response.set('Referrer-Policy', 'same-origin')
    next()
  })

  async function currentUser(request) {
    const authorization = request.get('authorization') || ''
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
    return { token, user: await userStore.findByToken(token) }
  }

  async function requireAuth(request, response, next) {
    const auth = await currentUser(request)
    if (!auth.user) return response.status(401).json({ success: false, message: '请先登录' })
    request.auth = auth
    next()
  }

  function requireRole(roles, { allowKey = false } = {}) {
    return async (request, response, next) => {
      if (allowKey && importKey && request.get('x-import-key') === importKey) {
        request.auth = { token: '', user: { id: null, username: '管理密钥', role: 'system_admin', viaKey: true } }
        return next()
      }
      const auth = await currentUser(request)
      if (!auth.user) return response.status(401).json({ success: false, message: '请先登录管理员账号' })
      if (!roles.includes(auth.user.role)) return response.status(403).json({ success: false, message: '当前账号没有执行此操作的权限' })
      request.auth = auth
      next()
    }
  }

  const requireAdmin = requireRole(['admin', 'system_admin'], { allowKey: true })
  const requireSystemAdmin = requireRole(['system_admin'], { allowKey: true })

  async function ownedLibrary(request, response, next) {
    const library = await platformStore.getLibrary(request.params.id)
    if (!library) return response.status(404).json({ success: false, message: '个人知识库不存在' })
    if (library.user_id !== request.auth.user.id) return response.status(403).json({ success: false, message: '你无权操作这个知识库' })
    request.library = library
    next()
  }

  app.get('/api/v1/health', async (_request, response) => {
    response.json({ success: true, data: { status: 'ok' } })
  })

  // 公开的站点标识：未登录页面头部也要能显示自定义名称与 Logo
  app.get('/api/v1/site', async (_request, response) => {
    const settings = await platformStore.getSettings()
    response.set('Cache-Control', 'no-store')
    response.json({
      success: true,
      data: {
        siteName: settings.siteName,
        siteTagline: settings.siteTagline,
        logoUrl: settings.logoUrl || '',
        maintenanceMode: Boolean(settings.maintenanceMode),
        maintenanceMessage: settings.maintenanceMessage || ''
      }
    })
  })

  app.get('/api/v1/auth/verification-challenge', (_request, response) => {
    const id = randomUUID()
    const now = Date.now()
    for (const [key, value] of sliderChallenges) {
      if (value.expiresAt < now || value.used) sliderChallenges.delete(key)
    }
    sliderChallenges.set(id, { issuedAt: now, expiresAt: now + 5 * 60_000, used: false })
    response.set('Cache-Control', 'no-store')
    response.json({ success: true, data: { challenge_id: id, expires_in: 300 } })
  })

  app.post('/api/v1/auth/verify-slider', (request, response) => {
    const id = String(request.body.challenge_id || '')
    const challenge = sliderChallenges.get(id)
    const elapsed = Number(request.body.elapsed)
    const trail = Array.isArray(request.body.trail) ? request.body.trail.slice(0, 100) : []
    const method = request.body.method === 'keyboard' ? 'keyboard' : 'pointer'
    const now = Date.now()

    if (!challenge || challenge.used || challenge.expiresAt < now) {
      return response.status(422).json({ success: false, message: '滑块已过期，请重试' })
    }

    const validTrail = trail.length >= (method === 'keyboard' ? 2 : 5)
      && trail.every((point, index) => {
        const position = Number(point.position)
        const time = Number(point.time)
        const previous = trail[index - 1]
        return Number.isFinite(position) && position >= 0 && position <= 1
          && Number.isFinite(time) && time >= 0 && (!previous || time >= Number(previous.time))
      })
    const finalPosition = Number(trail.at(-1)?.position || 0)
    const minimumElapsed = method === 'keyboard' ? 80 : 350
    const validTiming = Number.isFinite(elapsed) && elapsed >= minimumElapsed && elapsed <= 15_000

    if (!validTrail || !validTiming || finalPosition < 0.98) {
      return response.status(422).json({ success: false, message: '请按住滑块平稳拖到最右侧' })
    }

    challenge.used = true
    const token = randomBytes(32).toString('base64url')
    sliderTokens.set(token, { expiresAt: now + 5 * 60_000, used: false })
    response.json({ success: true, data: { slider_token: token, expires_in: 300 } })
  })

  app.post('/api/v1/auth/send-verification-code', async (request, response) => {
    const email = normalizeEmail(request.body.email)
    const purpose = request.body.purpose === 'reset' ? 'reset' : 'register'
    const sliderToken = String(request.body.slider_token || '')
    const proof = sliderTokens.get(sliderToken)
    const now = Date.now()

    if (!isValidEmail(email)) {
      return response.status(422).json({ success: false, message: '请输入有效的邮箱地址' })
    }
    const settings = await platformStore.getSettings()
    if (purpose === 'register' && !settings.registrationEnabled) {
      return response.status(403).json({ success: false, message: '网站当前暂停新用户注册' })
    }
    const existingUser = await userStore.findByEmail(email)
    if (purpose === 'register' && existingUser) return response.status(409).json({ success: false, message: '这个邮箱已经注册' })
    if (purpose === 'reset' && !existingUser) return response.status(404).json({ success: false, message: '没有找到这个邮箱对应的账号' })
    if (!proof || proof.used || proof.expiresAt < now) {
      return response.status(422).json({ success: false, message: '请先完成滑块验证' })
    }

    const codeKey = `${purpose}:${email}`
    const cooldown = verificationCodes.get(codeKey)
    if (cooldown && now - cooldown.sentAt < 60_000) {
      return response.status(429).json({
        success: false,
        message: '发送过于频繁，请稍后再试',
        retry_after: Math.ceil((60_000 - (now - cooldown.sentAt)) / 1000)
      })
    }

    const limitKey = email
    const recentSends = (sendHistory.get(limitKey) || []).filter((time) => now - time < 60 * 60_000)
    if (recentSends.length >= 5) {
      return response.status(429).json({ success: false, message: '一小时内发送次数已达上限' })
    }

    const code = String(randomInt(100000, 1_000_000))
    try {
      await mailService.sendVerificationCode({ to: email, code, purpose })
    } catch (error) {
      console.error('Verification email failed:', error.message)
      return response.status(503).json({
        success: false,
        message: error.code === 'SMTP_NOT_CONFIGURED' ? '验证码邮箱尚未配置，请联系管理员' : '验证码邮件发送失败，请稍后再试'
      })
    }

    proof.used = true
    const codeHash = createHmac('sha256', verificationSecret).update(`${purpose}:${email}:${code}`).digest('hex')
    verificationCodes.set(codeKey, { hash: codeHash, sentAt: now, expiresAt: now + 10 * 60_000, attempts: 0 })
    sendHistory.set(limitKey, [...recentSends, now])
    response.json({ success: true, data: { expires_in: 600, cooldown: 60, masked_email: email.replace(/(^.).*(@.*$)/, '$1***$2') } })
  })

  app.post('/api/v1/auth/register', async (request, response) => {
    const email = normalizeEmail(request.body.email)
    const username = String(request.body.username || '').trim()
    const password = String(request.body.password || '')
    const code = String(request.body.code || '').trim()
    const codeKey = `register:${email}`
    const record = verificationCodes.get(codeKey)

    const settings = await platformStore.getSettings()
    if (!settings.registrationEnabled) {
      return response.status(403).json({ success: false, message: '网站当前暂停新用户注册' })
    }

    if (!isValidEmail(email)) return response.status(422).json({ success: false, message: '请输入有效的邮箱地址' })
    if (!/^[\p{L}\p{N}_-]{2,24}$/u.test(username)) {
      return response.status(422).json({ success: false, message: '昵称需为 2–24 位文字、数字、下划线或短横线' })
    }
    if (password.length < 8 || password.length > 128 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return response.status(422).json({ success: false, message: '密码至少 8 位，并同时包含字母和数字' })
    }
    if (!record || record.expiresAt < Date.now() || record.attempts >= 5) {
      verificationCodes.delete(codeKey)
      return response.status(422).json({ success: false, message: '验证码已失效，请重新获取' })
    }

    record.attempts += 1
    const submitted = createHmac('sha256', verificationSecret).update(`register:${email}:${code}`).digest()
    const expected = Buffer.from(record.hash, 'hex')
    if (submitted.length !== expected.length || !timingSafeEqual(submitted, expected)) {
      return response.status(422).json({ success: false, message: `验证码不正确，还可尝试 ${Math.max(0, 5 - record.attempts)} 次` })
    }

    const result = await userStore.create({ email, username, password })
    if (result.conflict) return response.status(409).json({ success: false, message: result.conflict })
    verificationCodes.delete(codeKey)
    const session = await userStore.createSession(result.value.id)
    await platformStore.addAuditLog('user.register', result.value, { email }, request)
    response.status(201).json({ success: true, data: { user: result.value, token: session.token, expires_at: session.expires_at } })
  })

  app.post('/api/v1/auth/login', async (request, response) => {
    const email = normalizeEmail(request.body.email)
    const lockedSeconds = loginLockedRemaining(request, email)
    if (lockedSeconds > 0) {
      response.set('Retry-After', String(lockedSeconds))
      return response.status(429).json({
        success: false,
        message: `登录尝试过于频繁，请在 ${Math.ceil(lockedSeconds / 60)} 分钟后重试`,
        retry_after: lockedSeconds
      })
    }
    const user = await userStore.verifyCredentials(email, request.body.password)
    if (!user) {
      recordLoginFailure(request, email)
      return response.status(401).json({ success: false, message: '邮箱或密码不正确，账号被停用时也无法登录' })
    }
    clearLoginFailures(request, email)
    const session = await userStore.createSession(user.id, { days: request.body.remember ? 30 : 1 })
    await platformStore.addAuditLog('user.login', user, {}, request)
    response.json({ success: true, data: { user, token: session.token, expires_at: session.expires_at } })
  })

  app.post('/api/v1/auth/logout', requireAuth, async (request, response) => {
    await userStore.revokeSession(request.auth.token)
    response.json({ success: true, data: { logged_out: true } })
  })

  app.get('/api/v1/auth/user', requireAuth, async (request, response) => {
    response.json({ success: true, data: request.auth.user })
  })

  app.put('/api/v1/auth/user/profile', requireAuth, async (request, response) => {
    const result = await userStore.updateProfile(request.auth.user.id, request.body)
    if (result.errors?.length) return response.status(422).json({ success: false, message: result.errors.join('；') })
    if (result.conflict) return response.status(409).json({ success: false, message: '这个昵称已经被使用' })
    response.json({ success: true, data: result.value })
  })

  app.put('/api/v1/auth/user/password', requireAuth, async (request, response) => {
    const nextPassword = String(request.body.password || '')
    if (nextPassword.length < 8 || nextPassword.length > 128 || !/[A-Za-z]/.test(nextPassword) || !/\d/.test(nextPassword)) {
      return response.status(422).json({ success: false, message: '新密码至少 8 位，并同时包含字母和数字' })
    }
    const result = await userStore.changePassword(request.auth.user.id, request.body.current_password, nextPassword)
    if (result.error) return response.status(422).json({ success: false, message: result.error })
    response.json({ success: true, data: { changed: true, login_required: true } })
  })

  app.post('/api/v1/auth/reset-password', async (request, response) => {
    const email = normalizeEmail(request.body.email)
    const code = String(request.body.code || '').trim()
    const password = String(request.body.password || '')
    const codeKey = `reset:${email}`
    const record = verificationCodes.get(codeKey)
    if (!isValidEmail(email)) return response.status(422).json({ success: false, message: '请输入有效的邮箱地址' })
    if (password.length < 8 || password.length > 128 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return response.status(422).json({ success: false, message: '新密码至少 8 位，并同时包含字母和数字' })
    }
    if (!record || record.expiresAt < Date.now() || record.attempts >= 5) {
      verificationCodes.delete(codeKey)
      return response.status(422).json({ success: false, message: '验证码已失效，请重新获取' })
    }
    record.attempts += 1
    const submitted = createHmac('sha256', verificationSecret).update(`reset:${email}:${code}`).digest()
    const expected = Buffer.from(record.hash, 'hex')
    if (submitted.length !== expected.length || !timingSafeEqual(submitted, expected)) {
      return response.status(422).json({ success: false, message: '验证码不正确' })
    }
    await userStore.setPasswordByEmail(email, password)
    verificationCodes.delete(codeKey)
    await platformStore.addAuditLog('user.password_reset', await userStore.findByEmail(email), { email }, request)
    response.json({ success: true, data: { reset: true } })
  })

  app.get('/api/v1/admin/mail-settings', requireSystemAdmin, async (_request, response) => {
    response.json({ success: true, data: await mailSettingsStore.publicSettings() })
  })

  app.put('/api/v1/admin/mail-settings', requireSystemAdmin, async (request, response) => {
    const result = await mailSettingsStore.update(request.body)
    if (result.errors.length) return response.status(422).json({ success: false, message: result.errors.join('；') })
    // 发信邮箱可能刚被改掉，立即刷新受保护名单
    await syncProtectedAdminEmails()
    if (request.body.loginEmail) {
      // 允许把登录账号邮箱（= 发信邮箱）一键提为系统管理员
      await promoteProtectedAccounts()
    }
    response.json({ success: true, data: result.value })
  })

  app.post('/api/v1/admin/mail-settings/test', requireSystemAdmin, async (request, response) => {
    const email = normalizeEmail(request.body.email)
    if (!isValidEmail(email)) return response.status(422).json({ success: false, message: '请输入有效的测试收件邮箱' })
    try {
      await mailService.sendTest(email)
      response.json({ success: true, data: { sent: true } })
    } catch (error) {
      console.error('SMTP test failed:', error.message)
      response.status(422).json({ success: false, message: `测试失败：${error.code === 'SMTP_NOT_CONFIGURED' ? 'SMTP 配置不完整' : '请检查服务器、端口和授权码'}` })
    }
  })

  app.get('/api/v1/knowledge/versions', async (_request, response) => {
    const versions = [...new Set((await store.all()).map((item) => item.version).filter(Boolean))]
    response.json({ success: true, data: versions.map((version) => ({ version, name: version })) })
  })

  // 分类列表 = 平台分类注册表（内置 7 个 + 用户自建）∪ 内容里实际出现过的分类。
  // 这样即使有人直接用导入接口写了一个新分类名，它也会自动出现在首页与筛选器里。
  app.get('/api/v1/knowledge/categories', async (_request, response) => {
    const [items, registered] = await Promise.all([store.all(), platformStore.listCategories()])
    const counts = new Map()
    items.forEach((item) => {
      const name = String(item.category || '').trim()
      if (name) counts.set(name, (counts.get(name) || 0) + 1)
    })

    const data = []
    const emitted = new Set()
    for (const entry of registered) {
      emitted.add(entry.name)
      data.push({
        name: entry.name,
        description: entry.description || '用户自定义分类',
        count: counts.get(entry.name) || 0,
        builtin: Boolean(entry.builtin)
      })
    }
    for (const [name, count] of counts) {
      if (emitted.has(name)) continue
      data.push({ name, description: `${count} 条相关知识`, count, builtin: false })
    }

    response.set('Cache-Control', 'no-store')
    response.json({ success: true, data })
  })

  // 发布内容时选择分类用的轻量接口：内置分类 + 用户自建分类，按名称排序、去重。
  app.get('/api/v1/categories', async (_request, response) => {
    const categories = await platformStore.listCategories()
    response.set('Cache-Control', 'no-store')
    response.json({ success: true, data: categories })
  })

  app.post('/api/v1/categories', requireWriteKey(importKey), async (request, response) => {
    const result = await platformStore.createCategory(request.body || {})
    if (result.errors.length) return response.status(422).json({ success: false, message: result.errors[0] })
    if (!result.created) return response.json({ success: true, data: result.value, created: false })
    await platformStore.addAuditLog('knowledge.category_create', request.auth?.user || { viaKey: true }, { name: result.value.name }, request)
    response.status(201).json({ success: true, data: result.value, created: true })
  })

  app.delete('/api/v1/categories/:name', requireSystemAdmin, async (request, response) => {
    const result = await platformStore.removeCategory(decodeURIComponent(request.params.name))
    if (result.errors.length) {
      const status = result.errors[0] === '分类不存在' ? 404 : 403
      return response.status(status).json({ success: false, message: result.errors[0] })
    }
    await platformStore.addAuditLog('knowledge.category_remove', request.auth?.user || { viaKey: true }, { name: result.value.name }, request)
    response.json({ success: true, data: result.value })
  })

  app.get('/api/v1/knowledge/tags', async (_request, response) => {
    const tags = [...new Set((await store.all()).flatMap((item) => item.tags || []))]
    response.json({ success: true, data: tags })
  })

  app.get('/api/v1/knowledge', async (request, response) => {
    const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1)
    const perPage = Math.max(1, Math.min(2000, Number.parseInt(request.query.per_page, 10) || 20))
    const filters = {
      domain: request.query.domain || '',
      version: request.query.version || '',
      category: request.query.category || '',
      level: levels.has(request.query.level) ? request.query.level : '',
      keyword: request.query.keyword || '',
      order: request.query.order || 'desc'
    }
    const items = await store.query(filters)
    const start = (page - 1) * perPage
    response.json({
      success: true,
      data: {
        data: items.slice(start, start + perPage),
        current_page: page,
        per_page: perPage,
        last_page: Math.max(1, Math.ceil(items.length / perPage)),
        total: items.length
      }
    })
  })

  app.get('/api/v1/knowledge/:id', async (request, response) => {
    const item = await store.find(request.params.id)
    if (!item) return response.status(404).json({ success: false, message: '知识不存在' })
    response.json({ success: true, data: item })
  })

  app.post('/api/v1/knowledge/import', requireWriteKey(importKey), async (request, response) => {
    if (!Array.isArray(request.body.items)) {
      return response.status(422).json({ success: false, message: 'items 必须是数组' })
    }
    if (request.body.items.length > 500) {
      return response.status(422).json({ success: false, message: '一次最多导入 500 条知识' })
    }
    const result = await store.import(request.body.items)
    if (!result.imported.length) {
      return response.status(422).json({ success: false, message: result.errors[0] || '没有可导入内容' })
    }
    await registerCategories(result.imported)
    response.status(201).json({
      success: true,
      data: { imported: result.imported, count: result.imported.length, skipped: result.errors }
    })
  })

  app.post('/api/v1/knowledge', requireWriteKey(importKey), async (request, response) => {
    const result = await store.create(request.body)
    if (result.errors.length) return response.status(422).json({ success: false, message: result.errors.join('、') })
    await registerCategories([result.value])
    response.status(201).json({ success: true, data: result.value })
  })

  app.put('/api/v1/knowledge/:id', requireWriteKey(importKey), async (request, response) => {
    const result = await store.update(request.params.id, request.body)
    if (result.errors.length) return response.status(422).json({ success: false, message: result.errors.join('、') })
    if (!result.value) return response.status(404).json({ success: false, message: '知识不存在' })
    // 改分类也顺手登记一次，保证「编辑时改出来的新分类」同样会进入筛选器
    await registerCategories([result.value])
    response.json({ success: true, data: result.value })
  })

  app.delete('/api/v1/knowledge/:id', requireWriteKey(importKey), async (request, response) => {
    const removed = await store.remove(request.params.id)
    if (!removed) return response.status(404).json({ success: false, message: '知识不存在' })
    response.json({ success: true, data: removed })
  })

  app.get('/api/v1/knowledge-base', requireAuth, async (request, response) => {
    response.json({ success: true, data: await platformStore.listLibraries(request.auth.user.id) })
  })

  app.post('/api/v1/knowledge-base', requireAuth, async (request, response) => {
    const result = await platformStore.createLibrary(request.auth.user.id, request.body)
    if (result.errors.length) return response.status(422).json({ success: false, message: result.errors.join('；') })
    await platformStore.addAuditLog('library.create', request.auth.user, { library_id: result.value.id }, request)
    response.status(201).json({ success: true, data: result.value })
  })

  app.get('/api/v1/knowledge-base/:id', requireAuth, ownedLibrary, async (request, response) => {
    response.json({ success: true, data: request.library })
  })

  app.put('/api/v1/knowledge-base/:id', requireAuth, ownedLibrary, async (request, response) => {
    if (request.body.name !== undefined && !String(request.body.name).trim()) {
      return response.status(422).json({ success: false, message: '知识库名称不能为空' })
    }
    const updated = await platformStore.updateLibrary(request.params.id, request.body)
    response.json({ success: true, data: updated })
  })

  app.delete('/api/v1/knowledge-base/:id', requireAuth, ownedLibrary, async (request, response) => {
    const removed = await platformStore.deleteLibrary(request.params.id)
    await platformStore.addAuditLog('library.delete', request.auth.user, { library_id: request.params.id, name: removed.name }, request)
    response.json({ success: true, data: removed })
  })

  app.post('/api/v1/knowledge-base/:id/entries', requireAuth, ownedLibrary, async (request, response) => {
    let item = request.body
    if (request.body.knowledge_id !== undefined && request.body.knowledge_id !== null) {
      const knowledge = await store.find(request.body.knowledge_id)
      if (!knowledge) return response.status(404).json({ success: false, message: '要添加的知识不存在' })
      item = { ...knowledge, knowledge_id: knowledge.id }
    }
    if (!String(item.title || '').trim() || !String(item.content || '').trim()) {
      return response.status(422).json({ success: false, message: '标题和内容不能为空' })
    }
    const result = await platformStore.addEntry(request.params.id, item)
    if (result.duplicate) return response.status(409).json({ success: false, message: '这条知识已经在该知识库中' })
    response.status(201).json({ success: true, data: result.value })
  })

  app.put('/api/v1/knowledge-base/:id/entries/:entryId', requireAuth, ownedLibrary, async (request, response) => {
    const updated = await platformStore.updateEntry(request.params.id, request.params.entryId, request.body)
    if (!updated) return response.status(404).json({ success: false, message: '知识条目不存在' })
    response.json({ success: true, data: updated })
  })

  app.delete('/api/v1/knowledge-base/:id/entries/:entryId', requireAuth, ownedLibrary, async (request, response) => {
    const removed = await platformStore.removeEntry(request.params.id, request.params.entryId)
    if (!removed) return response.status(404).json({ success: false, message: '知识条目不存在' })
    response.json({ success: true, data: removed })
  })

  app.get('/api/v1/knowledge-base/:id/export', requireAuth, ownedLibrary, async (request, response) => {
    const library = request.library
    const format = request.query.format === 'csv' ? 'csv' : 'json'
    const safeName = library.name.replace(/[\\/:*?"<>|]/g, '-').slice(0, 60) || 'knowledge-base'
    if (format === 'csv') {
      const headers = ['title', 'content', 'domain', 'category', 'version', 'source_path']
      const rows = library.entries.map((entry) => headers.map((header) => csvEscape(entry[header])).join(','))
      response.set('Content-Type', 'text/csv; charset=utf-8')
      response.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}.csv`)
      return response.send(`\uFEFF${headers.join(',')}\n${rows.join('\n')}`)
    }
    response.set('Content-Type', 'application/json; charset=utf-8')
    response.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}.json`)
    response.send(JSON.stringify({ name: library.name, description: library.description, exported_at: new Date().toISOString(), entries: library.entries }, null, 2))
  })

  app.post('/api/v1/knowledge-base/:id/share', requireAuth, ownedLibrary, async (request, response) => {
    const library = await platformStore.shareLibrary(request.params.id)
    await platformStore.addAuditLog('library.share', request.auth.user, { library_id: library.id, share_id: library.share_id }, request)
    response.json({ success: true, data: { share_id: library.share_id, status: library.share_status, url: `/share/${library.share_id}` } })
  })

  app.delete('/api/v1/knowledge-base/:id/share', requireAuth, ownedLibrary, async (request, response) => {
    await platformStore.cancelShare(request.params.id)
    response.json({ success: true, data: { shared: false } })
  })

  app.get('/api/v1/share/:shareId', async (request, response) => {
    const library = await platformStore.getSharedLibrary(request.params.shareId)
    if (!library) return response.status(404).json({ success: false, message: '分享不存在、已关闭或正在审核' })
    const auth = await currentUser(request)
    const owner = await userStore.find(library.user_id)
    response.json({
      success: true,
      data: {
        ...library,
        owner: owner ? { id: owner.id, username: owner.username } : null,
        starred: await platformStore.isStarred(auth.user?.id, library.id)
      }
    })
  })

  app.get('/api/v1/share/:shareId/entries', async (request, response) => {
    const library = await platformStore.getSharedLibrary(request.params.shareId)
    if (!library) return response.status(404).json({ success: false, message: '分享不存在、已关闭或正在审核' })
    response.json({ success: true, data: library.entries })
  })

  app.get('/api/v1/explore/libraries', async (request, response) => {
    const sort = ['stars', 'mine'].includes(request.query.sort) ? request.query.sort : 'latest'
    const auth = await currentUser(request)
    if (sort === 'mine' && !auth.user) return response.status(401).json({ success: false, message: '请先登录查看收藏' })
    const users = new Map((await userStore.list()).map((user) => [user.id, user]))
    const libraries = sort === 'mine'
      ? await platformStore.listStarredLibraries(auth.user.id)
      : await platformStore.listPublishedLibraries(sort, auth.user?.id)
    const data = libraries.map((library) => ({
      id: library.id,
      share_id: library.share_id,
      name: library.name,
      description: library.description,
      shared_at: library.shared_at,
      entry_count: library.entry_count,
      star_count: library.star_count,
      fork_count: library.fork_count,
      owner: users.has(library.user_id) ? { id: library.user_id, username: users.get(library.user_id).username } : null,
      starred: library.starred
    }))
    response.json({ success: true, data })
  })

  app.post('/api/v1/share/:shareId/star', requireAuth, async (request, response) => {
    const library = await platformStore.getSharedLibrary(request.params.shareId)
    if (!library) return response.status(404).json({ success: false, message: '公开知识库不存在' })
    await platformStore.starLibrary(request.auth.user.id, library.id)
    const updated = await platformStore.getSharedLibrary(request.params.shareId)
    response.json({ success: true, data: { starred: true, star_count: updated.star_count } })
  })

  app.delete('/api/v1/share/:shareId/star', requireAuth, async (request, response) => {
    const library = await platformStore.getSharedLibrary(request.params.shareId)
    if (!library) return response.status(404).json({ success: false, message: '公开知识库不存在' })
    await platformStore.unstarLibrary(request.auth.user.id, library.id)
    const updated = await platformStore.getSharedLibrary(request.params.shareId)
    response.json({ success: true, data: { starred: false, star_count: updated.star_count } })
  })

  app.post('/api/v1/share/:shareId/fork', requireAuth, async (request, response) => {
    const fork = await platformStore.forkLibrary(request.auth.user.id, request.params.shareId)
    if (!fork) return response.status(404).json({ success: false, message: '公开知识库不存在' })
    await platformStore.addAuditLog('library.fork', request.auth.user, { source_share_id: request.params.shareId, library_id: fork.id }, request)
    response.status(201).json({ success: true, data: fork })
  })

  app.get('/api/v1/notifications', requireAuth, async (request, response) => {
    response.json({ success: true, data: await platformStore.listNotifications(request.auth.user.id) })
  })

  app.post('/api/v1/notifications/read-all', requireAuth, async (request, response) => {
    const marked = await platformStore.markAllNotificationsRead(request.auth.user.id)
    response.json({ success: true, data: { read: true, marked } })
  })

  app.post('/api/v1/notifications/:id/read', requireAuth, async (request, response) => {
    await platformStore.markNotificationRead(request.auth.user.id, request.params.id)
    response.json({ success: true, data: { read: true } })
  })

  app.get('/api/v1/admin/users', requireAdmin, async (request, response) => {
    const users = await userStore.list(request.query.keyword)
    const protectedEmails = userStore.listProtectedEmails()
    // 附带锁定标记，前端据此禁用按钮并显示锁标
    response.json({
      success: true,
      data: users.map((user) => ({ ...user, protected: protectedEmails.includes(user.email) }))
    })
  })

  app.put('/api/v1/admin/users/:id', requireSystemAdmin, async (request, response) => {
    if (request.params.id === request.auth.user.id && request.body.role && request.body.role !== 'system_admin') {
      return response.status(422).json({ success: false, message: '不能降低自己的系统管理员权限' })
    }
    const updated = await userStore.updateByAdmin(request.params.id, request.body)
    if (updated && updated.blocked) return response.status(403).json({ success: false, message: updated.blocked })
    if (!updated) return response.status(404).json({ success: false, message: '用户不存在' })
    await platformStore.addAuditLog('admin.user_update', request.auth.user, { user_id: updated.id, role: updated.role, status: updated.status }, request)
    response.json({ success: true, data: updated })
  })

  app.delete('/api/v1/admin/users/:id', requireSystemAdmin, async (request, response) => {
    if (request.params.id === request.auth.user.id) return response.status(422).json({ success: false, message: '不能删除当前登录的系统管理员账号' })
    const removed = await userStore.remove(request.params.id)
    if (removed && removed.blocked) return response.status(403).json({ success: false, message: removed.blocked })
    if (!removed) return response.status(404).json({ success: false, message: '用户不存在' })
    const removedLibraries = await platformStore.deleteUserData(request.params.id)
    await platformStore.addAuditLog('admin.user_delete', request.auth.user, { user_id: removed.id, libraries: removedLibraries.length }, request)
    response.json({ success: true, data: removed })
  })

  app.post('/api/v1/admin/users/:id/disable', requireAdmin, async (request, response) => {
    if (request.params.id === request.auth.user.id) return response.status(422).json({ success: false, message: '不能停用当前账号' })
    const updated = await userStore.updateByAdmin(request.params.id, { status: 'disabled' })
    if (updated && updated.blocked) return response.status(403).json({ success: false, message: updated.blocked })
    if (!updated) return response.status(404).json({ success: false, message: '用户不存在' })
    response.json({ success: true, data: updated })
  })

  app.post('/api/v1/admin/users/:id/enable', requireAdmin, async (request, response) => {
    const updated = await userStore.updateByAdmin(request.params.id, { status: 'active' })
    if (updated && updated.blocked) return response.status(403).json({ success: false, message: updated.blocked })
    if (!updated) return response.status(404).json({ success: false, message: '用户不存在' })
    response.json({ success: true, data: updated })
  })

  app.get('/api/v1/admin/knowledge-bases', requireAdmin, async (_request, response) => {
    const users = new Map((await userStore.list()).map((user) => [user.id, user]))
    const libraries = (await platformStore.listSharedLibraries()).map((library) => ({
      ...library,
      owner: users.get(library.user_id) || null
    }))
    response.json({ success: true, data: libraries })
  })

  app.delete('/api/v1/admin/knowledge-bases/:id', requireAdmin, async (request, response) => {
    const removed = await platformStore.deleteLibrary(request.params.id)
    if (!removed) return response.status(404).json({ success: false, message: '知识库不存在' })
    await platformStore.addAuditLog('admin.library_delete', request.auth.user, { library_id: removed.id, name: removed.name }, request)
    response.json({ success: true, data: removed })
  })

  app.post('/api/v1/admin/knowledge-bases/:id/approve', requireAdmin, async (request, response) => {
    const updated = await platformStore.setShareStatus(request.params.id, 'published')
    if (!updated) return response.status(404).json({ success: false, message: '知识库不存在' })
    response.json({ success: true, data: updated })
  })

  app.post('/api/v1/admin/knowledge-bases/:id/reject', requireAdmin, async (request, response) => {
    const updated = await platformStore.setShareStatus(request.params.id, 'rejected')
    if (!updated) return response.status(404).json({ success: false, message: '知识库不存在' })
    response.json({ success: true, data: updated })
  })

  app.get('/api/v1/admin/notifications', requireAdmin, async (_request, response) => {
    response.json({ success: true, data: await platformStore.listAllNotifications() })
  })

  app.post('/api/v1/admin/notifications', requireAdmin, async (request, response) => {
    const result = await platformStore.createNotification(request.body, request.auth.user.id)
    if (result.errors.length) return response.status(422).json({ success: false, message: result.errors.join('；') })
    await platformStore.addAuditLog('admin.notification_send', request.auth.user, { notification_id: result.value.id, audience: result.value.audience }, request)
    response.status(201).json({ success: true, data: result.value })
  })

  app.get('/api/v1/admin/stats', requireAdmin, async (_request, response) => {
    const [users, platform, knowledge, settings] = await Promise.all([
      userStore.count(), platformStore.stats(), store.all(), platformStore.getSettings()
    ])
    response.json({
      success: true,
      data: {
        users,
        ...platform,
        knowledge: knowledge.length,
        system: {
          status: 'ok',
          uptime_seconds: Math.round(process.uptime()),
          memory_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
          node: process.version,
          storage: settings.storageDriver,
          cache_ttl_seconds: settings.cacheTtlSeconds,
          log_level: settings.logLevel
        }
      }
    })
  })

  app.get('/api/v1/admin/settings', requireSystemAdmin, async (_request, response) => {
    response.json({ success: true, data: await platformStore.getSettings() })
  })

  app.put('/api/v1/admin/settings', requireSystemAdmin, async (request, response) => {
    const settings = await platformStore.updateSettings(request.body)
    await platformStore.addAuditLog('system.settings_update', request.auth.user, { keys: Object.keys(request.body) }, request)
    response.json({ success: true, data: settings })
  })

  // 站点标识（名称 / 副标题 / Logo）单独成接口：上传体积大，且需要给公开页面读取
  const LOGO_MAX_BYTES = 1_500_000
  const LOGO_MIME_TYPES = {
    'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg'
  }

  app.post(
    '/api/v1/admin/site/logo',
    express.json({ limit: '8mb' }),
    requireSystemAdmin,
    async (request, response) => {
      const dataUrl = String(request.body?.dataUrl || '').trim()
      const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp|gif|svg\+xml));base64,([A-Za-z0-9+/=]+)$/i)
      if (!match) {
        return response.status(422).json({ success: false, message: '请上传 PNG / JPG / WebP / GIF / SVG 格式的图片' })
      }
      const mime = match[1].toLowerCase()
      if (!LOGO_MIME_TYPES[mime]) {
        return response.status(422).json({ success: false, message: '暂不支持这种图片格式' })
      }
      const buffer = Buffer.from(match[2], 'base64')
      if (!buffer.length || buffer.length > LOGO_MAX_BYTES) {
        return response.status(422).json({ success: false, message: `图片不能超过 ${Math.round(LOGO_MAX_BYTES / 1024)} KB` })
      }
      // 用文件头校验真实类型，避免改扩展名绕过
      if (!matchesImageSignature(buffer, mime)) {
        return response.status(422).json({ success: false, message: '文件内容与图片格式不符，已拒绝' })
      }
      const settings = await platformStore.updateSettings({ logoUrl: dataUrl, logoMime: mime })
      await platformStore.addAuditLog('system.site_logo_update', request.auth.user, { mime, bytes: buffer.length }, request)
      response.json({ success: true, data: { logoUrl: settings.logoUrl, logoMime: settings.logoMime } })
    }
  )

  app.delete('/api/v1/admin/site/logo', requireSystemAdmin, async (request, response) => {
    const settings = await platformStore.updateSettings({ logoUrl: '', logoMime: '' })
    await platformStore.addAuditLog('system.site_logo_reset', request.auth.user, {}, request)
    response.json({ success: true, data: { logoUrl: settings.logoUrl, logoMime: settings.logoMime } })
  })

  app.get('/api/v1/admin/logs', requireSystemAdmin, async (request, response) => {
    response.json({ success: true, data: await platformStore.listAuditLogs(Number.parseInt(request.query.limit, 10) || 100) })
  })

  app.get('/api/v1/admin/audit-logs', requireSystemAdmin, async (request, response) => {
    response.json({ success: true, data: await platformStore.listAuditLogs(Number.parseInt(request.query.limit, 10) || 100) })
  })

  // 未匹配的 API 路由统一返回 JSON，避免被后面的 SPA 兜底规则吞成 HTML
  app.use('/api', (_request, response) => {
    response.status(404).json({ success: false, message: '接口不存在' })
  })

  const distDirectory = path.resolve(serverDirectory, '..', 'dist')
  app.use(express.static(distDirectory))
  app.get(/^(?!\/api\/).*/, (_request, response) => response.sendFile(path.join(distDirectory, 'index.html')))

  app.use((error, _request, response, _next) => {
    const status = error.type === 'entity.too.large' ? 413 : 500
    response.status(status).json({
      success: false,
      message: status === 413 ? '请求内容超过 5 MB' : '服务器暂时无法处理请求'
    })
  })

  return { app, store, userStore, mailSettingsStore, platformStore }
}
