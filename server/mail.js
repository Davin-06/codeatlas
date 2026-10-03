import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import nodemailer from 'nodemailer'

function asBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback
  return value === true || String(value).toLowerCase() === 'true' || String(value).toLowerCase() === 'ssl'
}

function envSettings() {
  const encryption = process.env.SMTP_ENCRYPTION || process.env.MAIL_ENCRYPTION || ''
  return {
    host: process.env.SMTP_HOST || process.env.MAIL_HOST || '',
    port: Number.parseInt(process.env.SMTP_PORT || process.env.MAIL_PORT, 10) || 465,
    secure: asBoolean(process.env.SMTP_SECURE, encryption.toLowerCase() === 'ssl'),
    username: process.env.SMTP_USER || process.env.MAIL_USERNAME || '',
    password: process.env.SMTP_PASS || process.env.MAIL_PASSWORD || '',
    fromAddress: process.env.SMTP_FROM || process.env.MAIL_FROM_ADDRESS || '',
    fromName: process.env.SMTP_FROM_NAME || process.env.MAIL_FROM_NAME || '知图 CodeAtlas'
  }
}

function encryptionKey(secret, salt) {
  return scryptSync(secret, salt, 32)
}

function encryptPassword(value, secret) {
  const salt = randomBytes(16)
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(secret, salt), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return {
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    value: encrypted.toString('base64')
  }
}

function decryptPassword(payload, secret) {
  const salt = Buffer.from(payload.salt, 'base64')
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(secret, salt), Buffer.from(payload.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(payload.value, 'base64')),
    decipher.final()
  ]).toString('utf8')
}

function cleanSettings(input = {}) {
  return {
    host: String(input.host || '').replace(/[\r\n]/g, '').trim().slice(0, 255),
    port: Math.max(1, Math.min(65535, Number.parseInt(input.port, 10) || 465)),
    secure: asBoolean(input.secure, true),
    username: String(input.username || '').replace(/[\r\n]/g, '').trim().slice(0, 255),
    fromAddress: String(input.fromAddress || '').replace(/[\r\n]/g, '').trim().toLocaleLowerCase('en-US').slice(0, 255),
    fromName: String(input.fromName || '知图 CodeAtlas').replace(/[\r\n]/g, ' ').trim().slice(0, 80)
  }
}

export class MailSettingsStore {
  constructor(filePath, secret) {
    this.filePath = filePath
    this.secret = secret
    this.saved = null
  }

  async initialize() {
    await mkdir(path.dirname(this.filePath), { recursive: true })
    try {
      this.saved = JSON.parse(await readFile(this.filePath, 'utf8'))
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      this.saved = null
    }
  }

  async publicSettings() {
    if (this.saved === null) await this.initialize()
    const fallback = envSettings()
    const values = this.saved ? { ...fallback, ...this.saved } : fallback
    return {
      ...cleanSettings(values),
      passwordConfigured: Boolean(this.saved?.passwordEncrypted || fallback.password),
      source: this.saved ? '管理后台' : (fallback.host ? '环境变量' : '尚未配置')
    }
  }

  async privateSettings() {
    const publicValues = await this.publicSettings()
    const fallback = envSettings()
    let password = fallback.password
    if (this.saved?.passwordEncrypted) {
      password = decryptPassword(this.saved.passwordEncrypted, this.secret)
    }
    return { ...publicValues, password }
  }

  async update(input) {
    const values = cleanSettings(input)
    const password = String(input.password || '')
    const existingPassword = Boolean(this.saved?.passwordEncrypted || envSettings().password)
    const errors = []
    if (!values.host) errors.push('请填写 SMTP 服务器')
    if (!values.username) errors.push('请填写 SMTP 用户名')
    if (!values.fromAddress || !values.fromAddress.includes('@')) errors.push('请填写有效的发件邮箱')
    if (!password && !existingPassword) errors.push('首次配置需要填写 SMTP 密码或授权码')
    if (errors.length) return { errors }

    const saved = {
      ...values,
      passwordEncrypted: password ? encryptPassword(password, this.secret) : this.saved?.passwordEncrypted,
      updatedAt: new Date().toISOString()
    }
    const temporary = `${this.filePath}.tmp`
    await writeFile(temporary, JSON.stringify(saved, null, 2), 'utf8')
    await rename(temporary, this.filePath)
    this.saved = saved
    return { value: await this.publicSettings(), errors: [] }
  }
}

export class SmtpMailService {
  constructor(settingsStore) {
    this.settingsStore = settingsStore
  }

  async sendVerificationCode({ to, code, purpose = 'register' }) {
    const settings = await this.settingsStore.privateSettings()
    const transporter = this.#transport(settings)
    const isReset = purpose === 'reset'
    const action = isReset ? '重置密码' : '注册'
    await transporter.sendMail({
      from: { name: settings.fromName, address: settings.fromAddress },
      to,
      subject: `${code} 是你的知图${action}验证码`,
      text: `你的知图 CodeAtlas ${action}验证码是 ${code}，10 分钟内有效。若不是你本人操作，请忽略此邮件。`,
      html: `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:560px;margin:auto;padding:32px;color:#172033"><p style="font-size:14px;color:#526078">知图 CodeAtlas</p><h1 style="font-size:24px">${action}</h1><p>请输入下面的验证码：</p><p style="font-size:32px;font-weight:800;letter-spacing:8px;background:#f1f4f8;padding:18px 22px;border-radius:10px">${code}</p><p style="font-size:13px;color:#667085">验证码 10 分钟内有效。若不是你本人操作，请忽略此邮件。</p></div>`
    })
  }

  async sendTest(to) {
    const settings = await this.settingsStore.privateSettings()
    const transporter = this.#transport(settings)
    await transporter.verify()
    await transporter.sendMail({
      from: { name: settings.fromName, address: settings.fromAddress },
      to,
      subject: '知图 SMTP 配置测试成功',
      text: '如果你收到这封邮件，说明知图 CodeAtlas 的验证码邮箱已经配置成功。'
    })
  }

  #transport(settings) {
    if (!settings.host || !settings.username || !settings.password || !settings.fromAddress) {
      const error = new Error('SMTP 尚未完整配置')
      error.code = 'SMTP_NOT_CONFIGURED'
      throw error
    }
    return nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      requireTLS: !settings.secure,
      auth: { user: settings.username, pass: settings.password },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      disableFileAccess: true,
      disableUrlAccess: true
    })
  }
}
