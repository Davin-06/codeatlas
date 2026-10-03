import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createApp } from '../app.js'
import { KnowledgeStore } from '../store.js'
import { demoKnowledge } from '../../frontend/src/data/demoData.js'
import { buildArticleContent } from '../../frontend/src/services/articleContent.js'

const writeHeaders = { 'content-type': 'application/json', 'x-import-key': 'club-secret' }

const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'pyatlas-test-'))
const sentMessages = []
let memberToken = ''
let sharedLibraryId = ''
let sharedId = ''
const { app, userStore } = await createApp({
  dataFile: path.join(temporaryDirectory, 'knowledge.json'),
  userFile: path.join(temporaryDirectory, 'users.json'),
  platformFile: path.join(temporaryDirectory, 'platform.json'),
  mailSettingsFile: path.join(temporaryDirectory, 'mail-settings.json'),
  bootstrapAdminEmail: 'member@example.com',
  importKey: 'club-secret',
  settingsSecret: 'test-settings-secret',
  verificationSecret: 'test-verification-secret',
  mailService: {
    async sendVerificationCode(message) { sentMessages.push({ type: 'verification', ...message }) },
    async sendTest(email) { sentMessages.push({ type: 'test', to: email }) }
  }
})
const server = await new Promise((resolve) => {
  const listener = app.listen(0, '127.0.0.1', () => resolve(listener))
})
server.unref()
const baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`

after(async () => {
  await rm(temporaryDirectory, { recursive: true, force: true })
})

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options)
  return { response, body: await response.json() }
}

test('returns seeded multi-domain knowledge with filters', async () => {
  const { response, body } = await request('/knowledge?domain=C%2B%2B&keyword=RAII')
  assert.equal(response.status, 200)
  assert.equal(body.data.total, 1)
  assert.match(body.data.data[0].title, /RAII/)
})

test('builds a complete learning structure for every built-in article', () => {
  demoKnowledge.forEach((article) => {
    const content = buildArticleContent(article)
    assert.equal(content.objectives.length, 3, article.title)
    assert.ok(content.principles.join('').length > 150, article.title)
    assert.equal(content.steps.length, 3, article.title)
    assert.ok(content.pitfalls.length >= 3, article.title)
    assert.equal(content.exercises.length, 3, article.title)
    assert.equal(content.checklist.length, 3, article.title)
  })
})

test('upgrades built-in knowledge without removing imported content', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'codeatlas-upgrade-'))
  const dataFile = path.join(directory, 'knowledge.json')
  const imported = {
    id: 'club-existing', title: '保留的自建资料', content: '升级后仍然存在。', imported: true
  }
  await writeFile(dataFile, JSON.stringify([demoKnowledge[0], imported]), 'utf8')

  try {
    const store = new KnowledgeStore(dataFile)
    const items = await store.all()
    assert.equal(items.length, demoKnowledge.length + 1)
    assert.ok(items.some((item) => item.id === imported.id))
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('rejects writes without the configured management key', async () => {
  const { response, body } = await request('/knowledge/import', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ items: [{ title: '测试', content: '测试内容' }] })
  })
  assert.equal(response.status, 401)
  assert.equal(body.success, false)
})

test('validates, imports, updates and deletes shared knowledge', async () => {
  const invalid = await request('/knowledge/import', {
    method: 'POST', headers: writeHeaders, body: JSON.stringify({ items: [{ title: '' }] })
  })
  assert.equal(invalid.response.status, 422)

  const imported = await request('/knowledge/import', {
    method: 'POST',
    headers: writeHeaders,
    body: JSON.stringify({
      items: [{
        title: '社团服务器部署清单',
        content: '检查端口、环境变量、日志和备份。',
        domain: '工程实践',
        category: '项目实践',
        level: '项目',
        tags: ['部署', '检查清单'],
        principle: '部署的核心是得到可重复、可验证、可回滚的发布过程。',
        key_points: ['记录环境配置', '保留验证证据'],
        pitfalls: ['没有准备回滚步骤'],
        exercises: ['在测试环境完整演练一次']
      }]
    })
  })
  assert.equal(imported.response.status, 201)
  assert.equal(imported.body.data.count, 1)
  await access(path.join(temporaryDirectory, 'knowledge.json.bak'))
  const id = imported.body.data.imported[0].id

  const detail = await request(`/knowledge/${encodeURIComponent(id)}`)
  assert.equal(detail.response.status, 200)
  assert.equal(detail.body.data.title, '社团服务器部署清单')
  assert.deepEqual(detail.body.data.key_points, ['记录环境配置', '保留验证证据'])

  const richSearch = await request('/knowledge?keyword=%E5%8F%AF%E5%9B%9E%E6%BB%9A')
  assert.equal(richSearch.response.status, 200)
  assert.equal(richSearch.body.data.total, 1)

  const updated = await request(`/knowledge/${encodeURIComponent(id)}`, {
    method: 'PUT', headers: writeHeaders, body: JSON.stringify({ level: '进阶' })
  })
  assert.equal(updated.response.status, 200)
  assert.equal(updated.body.data.level, '进阶')

  const removed = await request(`/knowledge/${encodeURIComponent(id)}`, {
    method: 'DELETE', headers: writeHeaders
  })
  assert.equal(removed.response.status, 200)

  const missing = await request(`/knowledge/${encodeURIComponent(id)}`)
  assert.equal(missing.response.status, 404)
})

test('requires a one-time slider proof before sending a verification code', async () => {
  const challenge = await request('/auth/verification-challenge')
  assert.equal(challenge.response.status, 200)

  const slider = await request('/auth/verify-slider', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      challenge_id: challenge.body.data.challenge_id,
      elapsed: 900,
      method: 'pointer',
      trail: [
        { position: 0, time: 0 },
        { position: 0.18, time: 150 },
        { position: 0.43, time: 330 },
        { position: 0.72, time: 590 },
        { position: 1, time: 900 }
      ]
    })
  })
  assert.equal(slider.response.status, 200)

  const sent = await request('/auth/send-verification-code', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'member@example.com', slider_token: slider.body.data.slider_token })
  })
  assert.equal(sent.response.status, 200)
  assert.equal(sentMessages.at(-1).to, 'member@example.com')

  const reused = await request('/auth/send-verification-code', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'second@example.com', slider_token: slider.body.data.slider_token })
  })
  assert.equal(reused.response.status, 422)
})

test('registers only with the emailed code and stores a password hash', async () => {
  const message = sentMessages.findLast((item) => item.type === 'verification' && item.to === 'member@example.com')
  const wrong = await request('/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'member@example.com', code: '000000', username: '学习者', password: 'learn2026' })
  })
  assert.equal(wrong.response.status, 422)

  const registered = await request('/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'member@example.com', code: message.code, username: '学习者', password: 'learn2026' })
  })
  assert.equal(registered.response.status, 201)
  assert.equal(registered.body.data.user.email, 'member@example.com')
  assert.equal(registered.body.data.user.role, 'system_admin')
  assert.equal(registered.body.data.user.password_hash, undefined)
  memberToken = registered.body.data.token

  const stored = await readFile(path.join(temporaryDirectory, 'users.json'), 'utf8')
  assert.doesNotMatch(stored, /learn2026/)
  assert.match(stored, /password_hash/)
})

test('logs in and protects account-only routes', async () => {
  const denied = await request('/knowledge-base')
  assert.equal(denied.response.status, 401)

  const wrong = await request('/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'member@example.com', password: 'wrong-password' })
  })
  assert.equal(wrong.response.status, 401)

  const loggedIn = await request('/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'member@example.com', password: 'learn2026', remember: true })
  })
  assert.equal(loggedIn.response.status, 200)
  assert.equal(loggedIn.body.data.user.role, 'system_admin')
  memberToken = loggedIn.body.data.token

  const current = await request('/auth/user', { headers: { authorization: `Bearer ${memberToken}` } })
  assert.equal(current.response.status, 200)
  assert.equal(current.body.data.email, 'member@example.com')
})

test('creates, fills, shares and exports a personal knowledge base', async () => {
  const authHeaders = { 'content-type': 'application/json', authorization: `Bearer ${memberToken}` }
  const created = await request('/knowledge-base', {
    method: 'POST', headers: authHeaders,
    body: JSON.stringify({ name: 'Python 进阶路线', description: '异步、工程化与实战笔记' })
  })
  assert.equal(created.response.status, 201)
  const libraryId = created.body.data.id
  sharedLibraryId = libraryId

  const knowledge = (await request('/knowledge?limit=1')).body.data.data[0]
  const added = await request(`/knowledge-base/${libraryId}/entries`, {
    method: 'POST', headers: authHeaders,
    body: JSON.stringify({ knowledge_id: knowledge.id })
  })
  assert.equal(added.response.status, 201)
  assert.equal(added.body.data.knowledge_id, knowledge.id)

  const note = await request(`/knowledge-base/${libraryId}/entries`, {
    method: 'POST', headers: authHeaders,
    body: JSON.stringify({ title: '复习提醒', content: '用最小例子复现，再写下边界条件。', domain: '工程实践' })
  })
  assert.equal(note.response.status, 201)

  const shared = await request(`/knowledge-base/${libraryId}/share`, { method: 'POST', headers: authHeaders })
  assert.equal(shared.response.status, 200)
  sharedId = shared.body.data.share_id
  assert.match(sharedId, /^[0-9a-f]{32}$/)
  const publicView = await request(`/share/${shared.body.data.share_id}`)
  assert.equal(publicView.response.status, 200)
  assert.equal(publicView.body.data.entries.length, 2)

  const csvResponse = await fetch(`${baseUrl}/knowledge-base/${libraryId}/export?format=csv`, {
    headers: { authorization: `Bearer ${memberToken}` }
  })
  assert.equal(csvResponse.status, 200)
  assert.match(await csvResponse.text(), /复习提醒/)
})

test('supports admin statistics, notifications and system settings', async () => {
  const authHeaders = { 'content-type': 'application/json', authorization: `Bearer ${memberToken}` }
  const stats = await request('/admin/stats', { headers: authHeaders })
  assert.equal(stats.response.status, 200)
  assert.ok(stats.body.data.knowledge >= demoKnowledge.length)
  assert.equal(stats.body.data.libraries, 1)

  const sent = await request('/admin/notifications', {
    method: 'POST', headers: authHeaders,
    body: JSON.stringify({ title: '本周学习提醒', content: '周五前完成一次知识整理。', audience: 'all' })
  })
  assert.equal(sent.response.status, 201)

  const notices = await request('/notifications', { headers: authHeaders })
  assert.equal(notices.response.status, 200)
  assert.equal(notices.body.data[0].read, false)
  const read = await request(`/notifications/${sent.body.data.id}/read`, { method: 'POST', headers: authHeaders })
  assert.equal(read.response.status, 200)

  await request('/admin/notifications', {
    method: 'POST', headers: authHeaders,
    body: JSON.stringify({ title: '第二则提醒', content: '全部已读接口应一次处理多条。', audience: 'all' })
  })
  const markedAll = await request('/notifications/read-all', { method: 'POST', headers: authHeaders })
  assert.equal(markedAll.response.status, 200)
  assert.ok(markedAll.body.data.marked >= 1)
  const afterReadAll = await request('/notifications', { headers: authHeaders })
  assert.ok(afterReadAll.body.data.every((item) => item.read))

  const settings = await request('/admin/settings', {
    method: 'PUT', headers: authHeaders,
    body: JSON.stringify({ siteName: '知图测试站', cacheTtlSeconds: 600, logLevel: 'debug' })
  })
  assert.equal(settings.response.status, 200)
  assert.equal(settings.body.data.cacheTtlSeconds, 600)

  const users = await request('/admin/users', { headers: authHeaders })
  assert.equal(users.response.status, 200)
  assert.equal(users.body.data.length, 1)
  assert.equal(users.body.data[0].password_hash, undefined)
})

test('keeps ordinary registrations unprivileged and supports star, ranking and fork', async () => {
  const createdUser = await userStore.create({ email: 'reader@example.com', username: '普通读者', password: 'reader2026' })
  assert.equal(createdUser.value.role, 'user')
  const session = await userStore.createSession(createdUser.value.id)
  const readerHeaders = { 'content-type': 'application/json', authorization: `Bearer ${session.token}` }

  const forbiddenAdmin = await request('/admin/stats', { headers: readerHeaders })
  assert.equal(forbiddenAdmin.response.status, 403)
  const forbiddenRoleChange = await request(`/admin/users/${createdUser.value.id}`, {
    method: 'PUT', headers: readerHeaders, body: JSON.stringify({ role: 'admin' })
  })
  assert.equal(forbiddenRoleChange.response.status, 403)

  const latest = await request('/explore/libraries?sort=latest')
  assert.equal(latest.response.status, 200)
  assert.equal(latest.body.data[0].id, sharedLibraryId)

  const starred = await request(`/share/${sharedId}/star`, { method: 'POST', headers: readerHeaders })
  assert.equal(starred.response.status, 200)
  assert.equal(starred.body.data.star_count, 1)
  const ranked = await request('/explore/libraries?sort=stars', { headers: readerHeaders })
  assert.equal(ranked.body.data[0].starred, true)
  assert.equal(ranked.body.data[0].star_count, 1)
  const myStars = await request('/explore/libraries?sort=mine', { headers: readerHeaders })
  assert.equal(myStars.body.data.length, 1)
  assert.equal(myStars.body.data[0].id, sharedLibraryId)

  const forked = await request(`/share/${sharedId}/fork`, { method: 'POST', headers: readerHeaders })
  assert.equal(forked.response.status, 201)
  assert.equal(forked.body.data.forked_from_share_id, sharedId)
  assert.equal(forked.body.data.entries.length, 2)
  const readerLibraries = await request('/knowledge-base', { headers: readerHeaders })
  assert.equal(readerLibraries.body.data.length, 1)

  const unstarred = await request(`/share/${sharedId}/star`, { method: 'DELETE', headers: readerHeaders })
  assert.equal(unstarred.response.status, 200)
  assert.equal(unstarred.body.data.star_count, 0)
})

test('protects SMTP settings and never returns or stores a plaintext password', async () => {
  const denied = await request('/admin/mail-settings')
  assert.equal(denied.response.status, 401)

  const saved = await request('/admin/mail-settings', {
    method: 'PUT',
    headers: writeHeaders,
    body: JSON.stringify({
      host: 'smtp.example.com', port: 465, secure: true,
      username: 'sender@example.com', password: 'smtp-app-password',
      fromAddress: 'sender@example.com', fromName: '知图测试'
    })
  })
  assert.equal(saved.response.status, 200)
  assert.equal(saved.body.data.passwordConfigured, true)
  assert.equal(saved.body.data.password, undefined)

  const stored = await readFile(path.join(temporaryDirectory, 'mail-settings.json'), 'utf8')
  assert.doesNotMatch(stored, /smtp-app-password/)

  const testMail = await request('/admin/mail-settings/test', {
    method: 'POST', headers: writeHeaders, body: JSON.stringify({ email: 'owner@example.com' })
  })
  assert.equal(testMail.response.status, 200)
  assert.equal(sentMessages.at(-1).type, 'test')
})

test('unknown API routes return JSON instead of HTML', async () => {
  const response = await fetch(`${baseUrl}/nonexistent`)
  assert.equal(response.status, 404)
  assert.match(response.headers.get('content-type') || '', /json/i)
  const body = await response.json()
  assert.equal(body.success, false)
  assert.equal(body.message, '接口不存在')

  const health = await request('/health')
  assert.equal(health.response.status, 200)
  assert.equal(health.body.data.status, 'ok')
  assert.equal(health.body.data.total, undefined)
})

test('locks repeated login failures from the same client', async () => {
  const payload = { email: 'lockout@example.com', password: 'wrong-password' }
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const failed = await request('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    })
    assert.equal(failed.response.status, 401)
  }
  const locked = await request('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  })
  assert.equal(locked.response.status, 429)
  assert.ok(locked.body.retry_after >= 1)
})

test('refuses writes when IMPORT_KEY is not configured', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'codeatlas-nokey-'))
  const { app: lockedApp } = await createApp({
    dataFile: path.join(directory, 'knowledge.json'),
    userFile: path.join(directory, 'users.json'),
    platformFile: path.join(directory, 'platform.json'),
    mailSettingsFile: path.join(directory, 'mail-settings.json'),
    importKey: '',
    settingsSecret: 'test-settings-secret',
    verificationSecret: 'test-verification-secret',
    mailService: {
      async sendVerificationCode() {},
      async sendTest() {}
    }
  })
  const listener = await new Promise((resolve) => {
    const server = lockedApp.listen(0, '127.0.0.1', () => resolve(server))
  })
  listener.unref()
  try {
    const response = await fetch(`http://127.0.0.1:${listener.address().port}/api/v1/knowledge`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: '匿名写入', content: '不应成功' })
    })
    const body = await response.json()
    assert.equal(response.status, 503)
    assert.equal(body.code, 'IMPORT_KEY_MISSING')
  } finally {
    await new Promise((resolve) => listener.close(resolve))
    await rm(directory, { recursive: true, force: true })
  }
})


test('locks bootstrap and SMTP sender emails as untouchable system admins', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'codeatlas-protected-'))
  const protectedApp = await createApp({
    dataFile: path.join(directory, 'knowledge.json'),
    userFile: path.join(directory, 'users.json'),
    platformFile: path.join(directory, 'platform.json'),
    mailSettingsFile: path.join(directory, 'mail-settings.json'),
    bootstrapAdminEmail: 'owner@example.com',
    importKey: 'protected-secret',
    settingsSecret: 'test-settings-secret',
    verificationSecret: 'test-verification-secret'
  })
  const listener = await new Promise((resolve) => {
    const instance = protectedApp.app.listen(0, '127.0.0.1', () => resolve(instance))
  })
  listener.unref()
  const api = `http://127.0.0.1:${listener.address().port}/api/v1`
  const keyHeaders = { 'content-type': 'application/json', 'x-import-key': 'protected-secret' }
  const call = async (pathname, options = {}) => {
    const response = await fetch(`${api}${pathname}`, options)
    return { response, body: await response.json() }
  }

  try {
    // 引导管理员注册后自动是 system_admin
    const owner = await protectedApp.userStore.create({ email: 'owner@example.com', username: '站长', password: 'owner2026pass' })
    assert.equal(owner.value.role, 'system_admin')

    // 把 SMTP 发信邮箱配置成另一个地址后，该地址也进入受保护名单
    const saved = await call('/admin/mail-settings', {
      method: 'PUT',
      headers: keyHeaders,
      body: JSON.stringify({
        host: 'smtp.example.com', port: 465, secure: true,
        username: 'sender@example.com', fromAddress: 'sender@example.com',
        fromName: '知图', password: 'auth-code-123'
      })
    })
    assert.equal(saved.response.status, 200)

    const sender = await protectedApp.userStore.create({ email: 'sender@example.com', username: '发信账号', password: 'sender2026pass' })
    assert.equal(sender.value.role, 'system_admin')

    // 两个账号都不能被改角色
    for (const target of [owner.value.id, sender.value.id]) {
      const denied = await call(`/admin/users/${target}`, {
        method: 'PUT', headers: keyHeaders, body: JSON.stringify({ role: 'user' })
      })
      assert.equal(denied.response.status, 403)
      assert.match(denied.body.message, /锁定/)
    }

    // 也不能被停用或删除
    const disabled = await call(`/admin/users/${sender.value.id}/disable`, { method: 'POST', headers: keyHeaders })
    assert.equal(disabled.response.status, 403)
    const removed = await call(`/admin/users/${owner.value.id}`, { method: 'DELETE', headers: keyHeaders })
    assert.equal(removed.response.status, 403)

    // 普通用户仍然可以被正常管理
    const plain = await protectedApp.userStore.create({ email: 'plain@example.com', username: '普通账号', password: 'plain2026pass' })
    const changed = await call(`/admin/users/${plain.value.id}`, {
      method: 'PUT', headers: keyHeaders, body: JSON.stringify({ role: 'admin' })
    })
    assert.equal(changed.response.status, 200)
    assert.equal(changed.body.data.role, 'admin')

    // 管理列表带 protected 标记
    const listed = await call('/admin/users', { headers: keyHeaders })
    const byEmail = Object.fromEntries(listed.body.data.map((user) => [user.email, user.protected]))
    assert.equal(byEmail['owner@example.com'], true)
    assert.equal(byEmail['sender@example.com'], true)
    assert.equal(byEmail['plain@example.com'], false)
  } finally {
    await new Promise((resolve) => listener.close(resolve))
    await rm(directory, { recursive: true, force: true })
  }
})


test('lets system admins rename the site and upload a validated logo', async () => {
  // 公开接口：未登录也能读到站点标识（先归位，避免依赖其他用例遗留状态）
  await request('/admin/settings', {
    method: 'PUT', headers: writeHeaders,
    body: JSON.stringify({ siteName: '知图 CodeAtlas', siteTagline: '开放的计算机知识地图', logoUrl: '' })
  })
  const publicSite = await request('/site')
  assert.equal(publicSite.response.status, 200)
  assert.equal(publicSite.body.data.siteName, '知图 CodeAtlas')
  assert.equal(publicSite.body.data.logoUrl, '')

  // 匿名不能改
  const denied = await request('/admin/site/logo', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ dataUrl: 'data:image/png;base64,iVBORw0KGgo=' })
  })
  assert.equal(denied.response.status, 401)

  // 改名 + 副标题
  const renamed = await request('/admin/settings', {
    method: 'PUT', headers: writeHeaders,
    body: JSON.stringify({ siteName: '我的知识站', siteTagline: '内部技术文档中心' })
  })
  assert.equal(renamed.response.status, 200)
  assert.equal(renamed.body.data.siteName, '我的知识站')
  assert.equal(renamed.body.data.siteTagline, '内部技术文档中心')

  const afterRename = await request('/site')
  assert.equal(afterRename.body.data.siteName, '我的知识站')
  assert.equal(afterRename.body.data.siteTagline, '内部技术文档中心')

  // 1x1 透明 PNG，带正确文件头
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  const uploaded = await request('/admin/site/logo', {
    method: 'POST', headers: writeHeaders,
    body: JSON.stringify({ dataUrl: `data:image/png;base64,${pngBase64}` })
  })
  assert.equal(uploaded.response.status, 200)
  assert.equal(uploaded.body.data.logoMime, 'image/png')
  assert.match(uploaded.body.data.logoUrl, /^data:image\/png;base64,/)

  // 伪装成 PNG 的文本必须被拒绝（文件头校验）
  const fake = await request('/admin/site/logo', {
    method: 'POST', headers: writeHeaders,
    body: JSON.stringify({ dataUrl: `data:image/png;base64,${Buffer.from('<script>alert(1)</script>').toString('base64')}` })
  })
  assert.equal(fake.response.status, 422)
  assert.match(fake.body.message, /不符/)

  // 含脚本的 SVG 必须被拒绝（存储型 XSS 防护）
  const evilSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>').toString('base64')
  const evil = await request('/admin/site/logo', {
    method: 'POST', headers: writeHeaders,
    body: JSON.stringify({ dataUrl: `data:image/svg+xml;base64,${evilSvg}` })
  })
  assert.equal(evil.response.status, 422)

  // 外链 logo 地址不允许写入
  const external = await request('/admin/settings', {
    method: 'PUT', headers: writeHeaders,
    body: JSON.stringify({ logoUrl: 'https://evil.example.com/logo.png' })
  })
  assert.equal(external.body.data.logoUrl, '')

  // 恢复默认
  const reset = await request('/admin/site/logo', { method: 'DELETE', headers: writeHeaders })
  assert.equal(reset.response.status, 200)
  assert.equal(reset.body.data.logoUrl, '')

  // 改回原站点名，避免影响其他用例
  await request('/admin/settings', {
    method: 'PUT', headers: writeHeaders,
    body: JSON.stringify({ siteName: '知图 CodeAtlas', siteTagline: '开放的计算机知识地图' })
  })
})


test('lets publishers add their own categories instead of hardcoded ones', async () => {
  // 内置 7 个分类必须默认存在，且标记为 builtin
  const initial = await request('/categories')
  assert.equal(initial.response.status, 200)
  const builtinNames = initial.body.data.filter((item) => item.builtin).map((item) => item.name)
  ;['语言基础', '算法与数据结构', '系统与网络', '开发工具', '项目实践', 'Web 与安全', '数据与智能']
    .forEach((name) => assert.ok(builtinNames.includes(name), name))

  // 通过发布内容自建一个新分类：走 requireWriteKey，普通用户也能做
  const created = await request('/knowledge', {
    method: 'POST', headers: writeHeaders,
    body: JSON.stringify({ title: 'Flutter 状态管理', content: '用 Riverpod 组织跨页面状态。', category: '移动开发', domain: '工程实践' })
  })
  assert.equal(created.response.status, 201)
  assert.equal(created.body.data.category, '移动开发')

  // 新分类必须自动出现在分类注册表里，并带上真实篇数
  const afterCreate = await request('/categories')
  const added = afterCreate.body.data.find((item) => item.name === '移动开发')
  assert.ok(added, '新分类应自动登记')
  assert.equal(added.builtin, false)

  const indexed = await request('/knowledge/categories')
  const indexedAdded = indexed.body.data.find((item) => item.name === '移动开发')
  assert.equal(indexedAdded.count, 1)

  // 后面的人可以直接选用这个分类，也可以再建一个
  const second = await request('/knowledge', {
    method: 'POST', headers: writeHeaders,
    body: JSON.stringify({ title: 'Compose 重组', content: '理解重组范围避免无效刷新。', category: '移动开发', domain: '工程实践' })
  })
  assert.equal(second.response.status, 201)
  const counts = await request('/knowledge/categories')
  assert.equal(counts.body.data.find((item) => item.name === '移动开发').count, 2)

  // 重复创建同名分类应当幂等，不会出现重复项
  const again = await request('/categories', {
    method: 'POST', headers: writeHeaders, body: JSON.stringify({ name: '移动开发' })
  })
  assert.equal(again.response.status, 200)
  assert.equal(again.body.created, false)
  const deduped = await request('/categories')
  assert.equal(deduped.body.data.filter((item) => item.name === '移动开发').length, 1)

  // 非法分类名必须被拒绝
  const bad = await request('/categories', {
    method: 'POST', headers: writeHeaders, body: JSON.stringify({ name: '坏<分类>' })
  })
  assert.equal(bad.response.status, 422)

  // 需要密钥的写入接口，匿名请求应当被拦住
  const anonymous = await request('/categories', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: '匿名分类' })
  })
  assert.equal(anonymous.response.status, 401)

  // 全局搜索应能命中新发布内容的正文，而不只是标题
  const byContent = await request('/knowledge?keyword=' + encodeURIComponent('重组范围'))
  assert.equal(byContent.body.data.total, 1)
  assert.match(byContent.body.data.data[0].title, /Compose/)

  // 按新分类筛选也要能筛出来
  const byCategory = await request('/knowledge?category=' + encodeURIComponent('移动开发'))
  assert.equal(byCategory.body.data.total, 2)

  // 内置分类不可删除，自建分类可以删
  const removeBuiltin = await request('/categories/' + encodeURIComponent('项目实践'), { method: 'DELETE', headers: writeHeaders })
  assert.equal(removeBuiltin.response.status, 403)
  const removeCustom = await request('/categories/' + encodeURIComponent('移动开发'), { method: 'DELETE', headers: writeHeaders })
  assert.equal(removeCustom.response.status, 200)
  const afterRemove = await request('/categories')
  assert.ok(!afterRemove.body.data.some((item) => item.name === '移动开发'))
})
