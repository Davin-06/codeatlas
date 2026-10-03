<div align="center">

# 知图 CodeAtlas

**一个面向计算机学习者的可检索知识地图**

内置 Python、C++、计算机基础、工程实践、Web 开发和 AI 与数据六个领域，提供账号体系、个人知识库、公开分享、通知中心与多角色后台。

<p align="center">
  <a href="./README.md">简体中文</a> |
  <a href="./README_en.md">English</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Vue-3-42b883?style=flat-square&logo=vuedotjs&logoColor=white" alt="Vue 3">
  <img src="https://img.shields.io/badge/Express-5-000000?style=flat-square&logo=express&logoColor=white" alt="Express 5">
  <img src="https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js 20+">
  <img src="https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License">
</p>

</div>

---

## 快速开始

环境要求：Node.js 20+、npm 9+。

部署所需环境变量可以从 `env.example` 复制，按注释替换密钥和管理员邮箱。

```bash
npm install
npm run dev
```

开发模式会同时启动：

- 网页：`http://localhost:3000`
- 共享 API：`http://localhost:8000`

首次启动会在 `server/data/knowledge.json` 创建数据文件，并写入内置知识。修改 `frontend/src/data/demoData.js` 后，服务端会在下次启动时同步内置内容，同时保留自行导入的资料。

## 主要功能

- 按领域、主题、难度、版本和关键词组合检索
- `/` 或 `Ctrl / Cmd + K` 唤起全局快速检索
- 浏览器本地收藏与最近阅读，无需登录也可以使用；`/favorites` 可集中管理，并一键加入个人知识库
- 搜索词自动匹配标题、摘要、标签、环境及扩展正文
- 内置 70+ 条编程、系统、网络、工程、Web 与 AI 知识
- 每篇详情包含学习目标、核心原理、分步理解、示例、误区、练习和相关内容
- 扩展正文会根据领域、主题与标签补全，也可以由贡献者逐项覆盖
- JSON / CSV 批量导入，导入前预览并提示无效条目
- 共享服务离线时，自动把导入内容保存在当前浏览器
- 对自行添加的资料进行新建、编辑和删除
- 写入前自动备份上一版数据为 `knowledge.json.bak`
- 邮箱验证码注册、一次性滑块校验与发送频率限制
- 邮箱密码登录、保持登录、退出、修改资料和邮箱验证码找回密码
- 登录用户可创建多个个人知识库，加入站内知识或自建笔记
- 个人知识库支持 JSON / CSV 导出、公开分享与随时关闭链接
- 共享广场提供最新发布榜、收藏榜和“我的收藏”筛选
- 登录用户可以 Star 公开知识库，或 Fork 为可独立编辑、导出和再次发布的个人副本
- 用户消息中心与管理员站内广播，已读状态跟随账号保存
- 管理员可管理用户、停用账号、审核或删除公开知识库
- 系统管理员可查看运行统计、审计日志并调整注册、缓存与日志设置
- 后台编辑 SMTP 配置、加密保存授权码并发送测试邮件

## 导入资料

点击页面右上角“导入知识”。`title` 与 `content` 必填，其余字段可选：

| 字段 | 用途 | 示例 |
| --- | --- | --- |
| `title` | 标题 | 二分查找入门 |
| `content` | 摘要或正文 | 在有序数组中每次排除一半搜索空间 |
| `domain` | 领域 | 计算机基础 |
| `category` | 主题 | 算法与数据结构 |
| `level` | 难度 | 入门 / 进阶 / 项目 |
| `version` | 版本或环境 | C++20 |
| `tags` | 逗号分隔标签 | 二分查找,算法 |
| `author` | 作者 | 算法学习组 |
| `reading_time` | 预计阅读分钟数 | 6 |
| `code` | 示例代码 | 可使用 `\n` 表示换行 |
| `principle` | 核心原理 | 解释工作方式与适用边界 |
| `key_points` | 关键要点 | 多条内容用 `|` 分隔 |
| `pitfalls` | 常见误区 | 多条内容用 `|` 分隔 |
| `exercises` | 练习题 | 多条内容用 `|` 分隔 |

导入窗口内可以直接下载 CSV 模板。JSON 可以直接为后三个字段提供字符串数组；CSV 使用 `|` 或换行分隔多条内容。没有填写扩展字段时，详情页会根据领域、主题和标签自动补全学习结构。

## 管理密钥

管理密钥是部署时的最高权限凭据，保护共享资料写入与后台控制台；浏览、搜索和打开公开分享不需要密钥。未设置 `IMPORT_KEY` 时，服务端会拒绝全部写入（返回 503），公网部署必须配置：

```powershell
$env:IMPORT_KEY="请替换为足够长的随机密钥"
npm start
```

Linux/macOS：

```bash
IMPORT_KEY="请替换为足够长的随机密钥" npm start
```

网页中填写同一个密钥即可。管理中心不会持久化这把密钥，刷新后需要重新输入。SMTP 后台仍可使用管理密钥验证身份。

## 账号与管理员

在第一次正式注册前，配置系统管理员邮箱：

```powershell
$env:BOOTSTRAP_ADMIN_EMAIL="owner@example.com"
npm start
```

该邮箱完成验证码注册后会自动成为 `system_admin`。系统管理员可以在 `/admin` 中把其他账号设为普通管理员；普通管理员可以查看用户、停用账号、管理公开分享和发送通知，只有系统管理员可以删除用户、调整角色、配置 SMTP 与修改系统设置。也可以直接用 `IMPORT_KEY` 解锁全部后台功能。

个人知识库保存在 `server/data/platform.json`，账号及会话保存在 `server/data/users.json`；两者写入时都会通过临时文件原子替换，平台数据同时保留 `.bak` 上一版备份。

## 验证码邮箱

先设置管理密钥与配置加密密钥，再启动服务：

```powershell
$env:IMPORT_KEY="请替换为足够长的随机管理密钥"
$env:SETTINGS_SECRET="请替换为另一段长期固定的随机密钥"
$env:VERIFICATION_SECRET="请替换为验证码签名密钥"
$env:BOOTSTRAP_ADMIN_EMAIL="owner@example.com"
npm start
```

打开 `/manage/mail`，输入管理密钥后即可填写 SMTP 服务器、端口、邮箱账号、授权码和发件人信息。保存后先发送测试邮件，再开放注册页 `/register`。

SMTP 授权码会使用 AES-256-GCM 加密后写入 `server/data/mail-settings.json`，接口只返回“是否已配置”，不会把授权码回传给浏览器。`SETTINGS_SECRET` 必须长期保持不变，否则已保存的授权码无法解密。也可以不使用后台配置，直接通过 `MAIL_HOST`、`MAIL_PORT`、`MAIL_USERNAME`、`MAIL_PASSWORD`、`MAIL_FROM_ADDRESS` 和 `MAIL_FROM_NAME` 环境变量提供默认配置。

## 生产运行

```bash
npm install
npm run build
npm start
```

访问 `http://localhost:8000`。可通过 `PORT` 修改端口，并通过 `DATA_FILE`、`USER_DATA_FILE`、`PLATFORM_DATA_FILE` 与 `MAIL_SETTINGS_FILE` 指定数据文件位置。公开部署必须使用 HTTPS，并配置稳定的 `IMPORT_KEY`、`SETTINGS_SECRET`、`VERIFICATION_SECRET` 和 `BOOTSTRAP_ADMIN_EMAIL`。

## 账号角色

| 角色 | 能做什么 |
| --- | --- |
| `user` | 浏览、收藏、建个人知识库、分享、复制 |
| `admin` | 以上全部 + 用户列表、停用/启用用户、审核与删除共享知识库、发布通知、查看统计 |
| `system_admin` | 以上全部 + 调整用户角色、删除用户、站点设置、SMTP 配置、审计日志 |

### 受保护的锁定管理员

`BOOTSTRAP_ADMIN_EMAIL` 指定的邮箱，以及**当前 SMTP 发信邮箱**（`MAIL_FROM_ADDRESS` / `MAIL_USERNAME`），会共同构成「受保护名单」：

- 名单内的邮箱注册后**直接成为 `system_admin`**，无需手工提权；
- 名单内账号的角色、状态、删除操作**全部冻结**，包括它们互相之间，也包括持有 `IMPORT_KEY` 的管理密钥；
- 管理后台用户列表会给这些账号打上「🔒 已锁定」标记，并禁用对应操作按钮；
- 发信邮箱在管理后台变更后，名单会实时刷新，新邮箱自动获得同样待遇。

被拦截时接口返回 `403`，消息为「这个账号已被锁定为系统管理员，不允许修改角色或状态」。**该保护是硬编码在服务端逻辑中的，没有绕过入口** —— 如需解除，只能直接编辑 `server/data/users.json` 或更换 `BOOTSTRAP_ADMIN_EMAIL`，请谨慎操作。

## 自定义站点标识

系统管理员可在「管理中心 → 系统配置 → 站点标识」修改：

- **站点名称** —— 显示在页头品牌区与浏览器标签标题；
- **站点副标题** —— 显示在品牌名称下方；
- **自定义 Logo** —— 上传 PNG / JPG / WebP / GIF / SVG（不超过 1.5 MB），同时应用到页头 Logo 与地址栏图标。

保存后全站立即生效（页头、标签标题、favicon 同步更新），无需刷新页面。点「恢复默认 Logo」可退回内置图标。

安全约束：上传内容会校验文件头（改扩展名会被拒），SVG 中若含 `<script>`、事件属性、`javascript:` 或外部实体一律拒绝，`logoUrl` 只接受站内相对路径或 `data:image/`，无法写入外链地址。

## 分类体系（用户可扩展）

分类**不是写死的**。服务端维护一份分类注册表，初始为 7 个内置分类（语言基础、算法与数据结构、系统与网络、开发工具、项目实践、Web 与安全、数据与智能），之后由内容自动生长：

- **发布即建分类** —— 在「资料维护」的主题下拉框选「＋ 新建分类…」并填名字，发布成功后该分类自动进入注册表。改动分类时同样会登记。
- **导入也会登记** —— 批量导入 CSV / JSON 里出现的新分类名会一并加入。
- **外壳接口有兜底** —— 即使绕过前端直接调导入接口写了一个新分类名，`/knowledge/categories` 也会把内容里实际出现过的分类全部返回，不会丢。
- **按需可见** —— 新分类只要还没有内容，就不会占用首页分类索引的位置；一旦有人发布，首页立刻显示并带真实篇数。

接口：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/v1/categories` | 分类注册表（名称 + 描述），发布表单使用 |
| GET | `/api/v1/knowledge/categories` | 分类注册表 ∪ 内容里出现过的分类，附带篇数 |
| POST | `/api/v1/categories` | 新建分类，需 `X-Import-Key`；同名幂等返回 `created: false` |
| DELETE | `/api/v1/categories/:name` | 删除分类，需系统管理员；内置分类返回 `403` |

分类名限制：中英文、数字、空格及 `+ . # ( ) - / &`，最长 40 字符。

## 搜索范围

搜索是**全局全文**的，不限于标题。服务端查询时命中的字段包括：

标题、正文摘要、领域、主题、版本、标签，以及结构化内容（核心原理、关键要点、常见误区、练习题）。

因此新发布的内容一上线即可被搜到，正文里的关键词也能命中。

## 验证

```bash
npm test
npm run build
```

## 技术结构

```text
frontend/              Vue 3 + Vue Router + Vite
  public/favicon.svg   品牌图标
  src/views/           首页、索引、详情、账号、个人库、分享页与管理控制台
  src/data/            内置知识数据
server/                Express API、认证、邮件服务与 JSON 文件存储
  tests/               Node.js 内置测试
```

已实现参考需求中的站内功能；按项目要求不提供 GitHub OAuth 或账号绑定，身份验证统一使用邮箱验证码与邮箱密码。

## 接口一览

| 分组 | 路径前缀 | 说明 |
| --- | --- | --- |
| 站点 | `/api/v1/site`、`/api/v1/health` | 站点标识与健康检查 |
| 认证 | `/api/v1/auth/*` | 注册、登录、验证码、滑块校验、资料与改密 |
| 知识 | `/api/v1/knowledge/*` | 列表、详情、导入、标签、版本、分类 |
| 个人库 | `/api/v1/knowledge-base/*` | 创建、条目管理、导出与分享 |
| 共享 | `/api/v1/share/*` | 打开分享、Star、Fork |
| 广场 | `/api/v1/explore/libraries` | 最新发布榜与收藏榜 |
| 通知 | `/api/v1/notifications/*` | 站内消息与已读状态 |
| 管理 | `/api/v1/admin/*` | 用户、知识库审核、通知、统计、设置、SMTP、日志 |

## 贡献

欢迎提交 Issue 与 Pull Request。提交前请先运行：

```bash
npm test
npm run build
```

确保测试与构建均通过。
