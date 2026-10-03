<div align="center">

# CodeAtlas

**A searchable knowledge map for computer science learners**

Built-in coverage of six domains — Python, C++, Computer Fundamentals, Engineering Practices, Web Development, and AI & Data — with accounts, personal knowledge bases, public sharing, notifications, and a multi-role admin console.

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

## Quick Start

Requirements: Node.js 20+, npm 9+.

Copy the deployment environment variables from `env.example` and replace the keys and admin email as described in the comments.

```bash
npm install
npm run dev
```

Development mode starts both services at once:

- Web: `http://localhost:3000`
- Shared API: `http://localhost:8000`

On first start, a data file is created at `server/data/knowledge.json` and seeded with the built-in knowledge. After you edit `frontend/src/data/demoData.js`, the server syncs the built-in content on the next start while keeping anything you imported yourself.

## Features

- Combined search by domain, category, difficulty, version, and keyword
- Global quick search via `/` or `Ctrl / Cmd + K`
- Browser-local favorites and recent-read history that work without signing in; manage them all at `/favorites` and push them into a personal knowledge base in one click
- Search terms match titles, summaries, tags, environments, and extended body text
- 70+ built-in entries across programming, systems, networking, engineering, web, and AI
- Every detail page includes learning goals, core principles, step-by-step understanding, examples, pitfalls, exercises, and related content
- Extended body text is auto-completed from domain, category, and tags, and can also be overridden field by field by contributors
- Batch import from JSON / CSV with a preview and invalid-entry warnings before committing
- When the shared service is offline, imported content is automatically kept in the current browser
- Create, edit, and delete entries you added yourself
- The previous data version is backed up automatically as `knowledge.json.bak` before every write
- Email-verification registration with one-time slider check and send-rate limits
- Email + password sign-in, stay signed in, sign out, profile editing, and password recovery via email verification code
- Signed-in users can create multiple personal knowledge bases, adding either site knowledge or their own notes
- Personal knowledge bases support JSON / CSV export, public sharing, and closing the link at any time
- The sharing square offers a latest-published board, a favorites board, and a “My Favorites” filter
- Signed-in users can Star public knowledge bases or Fork them into independently editable, exportable, re-publishable personal copies
- User message center plus admin broadcasts, with read state persisted per account
- Admins can manage users, disable accounts, and review or delete public knowledge bases
- System admins can view runtime statistics and audit logs, and adjust registration, cache, and logging settings
- Configure SMTP in the admin console, store the auth code encrypted, and send a test email

## Importing Content

Click “导入知识” (Import Knowledge) in the top-right corner. `title` and `content` are required; all other fields are optional:

| Field | Purpose | Example |
| --- | --- | --- |
| `title` | Title | Binary search basics |
| `content` | Summary or body | Halve the search space on each pass through a sorted array |
| `domain` | Domain | Computer Fundamentals |
| `category` | Category | Algorithms & Data Structures |
| `level` | Difficulty | Beginner / Intermediate / Project |
| `version` | Version or environment | C++20 |
| `tags` | Comma-separated tags | binary-search,algorithms |
| `author` | Author | Algorithms Study Group |
| `reading_time` | Estimated reading minutes | 6 |
| `code` | Sample code | Use `\n` for line breaks |
| `principle` | Core principle | Explains how it works and where it applies |
| `key_points` | Key takeaways | Separate multiple items with `|` |
| `pitfalls` | Common pitfalls | Separate multiple items with `|` |
| `exercises` | Exercises | Separate multiple items with `|` |

A CSV template can be downloaded directly from the import dialog. For JSON, the last three fields accept string arrays; for CSV, separate multiple items with `|` or newlines. When the extended fields are left empty, the detail page completes the learning structure automatically from domain, category, and tags.

## Management Key

The management key is the highest-privilege credential at deployment time. It protects writes to shared content and access to the admin console; browsing, searching, and opening public shares do not require it. If `IMPORT_KEY` is not set, the server rejects all writes with `503` — a public deployment must configure it:

```powershell
$env:IMPORT_KEY="replace-with-a-long-random-key"
npm start
```

Linux/macOS:

```bash
IMPORT_KEY="replace-with-a-long-random-key" npm start
```

Enter the same key on the web page. The admin console does not persist the key and you will need to re-enter it after a refresh. SMTP administration also accepts the management key for authentication.

## Accounts and Administrators

Before the first real registration, configure the system admin email:

```powershell
$env:BOOTSTRAP_ADMIN_EMAIL="owner@example.com"
npm start
```

After this email completes verification-code registration, it automatically becomes `system_admin`. A system admin can promote other accounts to regular admin from `/admin`; regular admins can view users, disable accounts, manage public shares, and send notifications, while only system admins can delete users, change roles, configure SMTP, and modify system settings. `IMPORT_KEY` can also be used to unlock the full admin functionality directly.

Personal knowledge bases are stored in `server/data/platform.json`, and accounts plus sessions in `server/data/users.json`. Both write through an atomic temporary-file replacement, and platform data additionally keeps the previous version as a `.bak` file.

## Verification Email

Set the management key and the configuration encryption keys first, then start the service:

```powershell
$env:IMPORT_KEY="replace-with-a-long-random-management-key"
$env:SETTINGS_SECRET="replace-with-another-long-lived-random-key"
$env:VERIFICATION_SECRET="replace-with-a-verification-code-signing-key"
$env:BOOTSTRAP_ADMIN_EMAIL="owner@example.com"
npm start
```

Open `/manage/mail`, enter the management key, and fill in the SMTP server, port, mailbox account, auth code, and sender information. After saving, send a test email first, then open the registration page at `/register`.

The SMTP auth code is encrypted with AES-256-GCM before being written to `server/data/mail-settings.json`. The API only reports whether it is configured and never sends the auth code back to the browser. `SETTINGS_SECRET` must stay unchanged long term, otherwise stored auth codes can no longer be decrypted. You can also skip the console configuration and provide defaults directly through the `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS`, and `MAIL_FROM_NAME` environment variables.

## Production

```bash
npm install
npm run build
npm start
```

Visit `http://localhost:8000`. Change the port with `PORT`, and point the data files elsewhere with `DATA_FILE`, `USER_DATA_FILE`, `PLATFORM_DATA_FILE`, and `MAIL_SETTINGS_FILE`. A public deployment must use HTTPS and configure a stable `IMPORT_KEY`, `SETTINGS_SECRET`, `VERIFICATION_SECRET`, and `BOOTSTRAP_ADMIN_EMAIL`.

## Roles

| Role | What it can do |
| --- | --- |
| `user` | Browse, favorite, create personal knowledge bases, share, copy |
| `admin` | Everything above + user list, disable/enable users, review and delete shared knowledge bases, publish notifications, view statistics |
| `system_admin` | Everything above + change user roles, delete users, site settings, SMTP configuration, audit logs |

### Protected and Locked Administrators

The email given by `BOOTSTRAP_ADMIN_EMAIL`, together with **the current SMTP sender email** (`MAIL_FROM_ADDRESS` / `MAIL_USERNAME`), jointly form a “protected list”:

- Emails on the list **become `system_admin` directly** after registration, with no manual promotion;
- Role, status, and deletion operations for accounts on the list are **all frozen** — including between those accounts themselves, and including the management key that holds `IMPORT_KEY`;
- The admin user list marks these accounts with a “🔒 已锁定” (Locked) badge and disables the corresponding action buttons;
- When the sender email is changed in the admin console, the list refreshes in real time and the new email receives the same treatment automatically.

When blocked, the API returns `403` with the message “这个账号已被锁定为系统管理员，不允许修改角色或状态” (“This account is locked as a system administrator; changing its role or status is not allowed”). **This protection is hard-coded in the server logic and has no bypass entry point** — to lift it you can only edit `server/data/users.json` directly or change `BOOTSTRAP_ADMIN_EMAIL`. Proceed with caution.

## Custom Site Branding

A system admin can change these under “管理中心 → 系统配置 → 站点标识” (Admin Console → System Config → Site Branding):

- **Site name** — shown in the header brand area and the browser tab title;
- **Site tagline** — shown below the brand name;
- **Custom logo** — upload PNG / JPG / WebP / GIF / SVG (no larger than 1.5 MB), applied to both the header logo and the address-bar icon.

Changes take effect site-wide immediately (header, tab title, and favicon update together) with no page refresh needed. Click “恢复默认 Logo” (Restore Default Logo) to revert to the built-in icon.

Security constraints: uploads are validated by file header (renaming the extension is rejected); SVGs containing `<script>`, event attributes, `javascript:`, or external entities are rejected outright; `logoUrl` only accepts same-site relative paths or `data:image/` and cannot be written to an external address.

## Category System (User-Extensible)

Categories are **not hard-coded**. The server maintains a category registry that starts with 7 built-in categories (Language Basics, Algorithms & Data Structures, Systems & Networking, Developer Tools, Project Practices, Web & Security, Data & Intelligence) and then grows automatically from content:

- **Publishing creates a category** — choose “＋ 新建分类…” (New Category…) in the category dropdown under “资料维护” (Content Maintenance) and type a name; once published, the category enters the registry automatically. Changing a category registers it the same way.
- **Imports register too** — new category names appearing in a batch CSV / JSON import are added as well.
- **The shell API has a fallback** — even if you bypass the frontend and call the import API directly with a new category name, `/knowledge/categories` still returns every category that actually appears in content, so nothing is lost.
- **Visible on demand** — a new category occupies no slot in the homepage category index until it has content; as soon as someone publishes, the homepage shows it immediately with the real entry count.

API:

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/v1/categories` | Category registry (name + description), used by the publish form |
| GET | `/api/v1/knowledge/categories` | Registry ∪ categories appearing in content, with entry counts |
| POST | `/api/v1/categories` | Create a category, requires `X-Import-Key`; idempotent on duplicates returning `created: false` |
| DELETE | `/api/v1/categories/:name` | Delete a category, requires system admin; built-in categories return `403` |

Category name limits: Chinese and English letters, digits, spaces, and `+ . # ( ) - / &`, up to 40 characters.

## Search Scope

Search is **global full-text**, not limited to titles. The fields matched server-side are:

title, body summary, domain, category, version, tags, and structured content (core principle, key takeaways, common pitfalls, exercises).

Newly published content is therefore searchable the moment it goes live, and keywords in the body match as well.

## Verification

```bash
npm test
npm run build
```

## Project Structure

```text
frontend/              Vue 3 + Vue Router + Vite
  public/favicon.svg   Brand icon
  src/views/           Home, index, detail, account, personal library, share pages, admin console
  src/data/            Built-in knowledge data
server/                Express API, authentication, mail service, JSON file storage
  tests/               Node.js built-in tests
```

The in-site features from the reference requirements are implemented. Per the project requirements, GitHub OAuth and account binding are intentionally not offered — authentication uses email verification codes and email + password uniformly.

## API Overview

| Group | Path prefix | Description |
| --- | --- | --- |
| Site | `/api/v1/site`, `/api/v1/health` | Site branding and health check |
| Auth | `/api/v1/auth/*` | Registration, sign-in, verification codes, slider check, profile, and password change |
| Knowledge | `/api/v1/knowledge/*` | Listing, detail, import, tags, versions, categories |
| Personal library | `/api/v1/knowledge-base/*` | Create, entry management, export, and sharing |
| Sharing | `/api/v1/share/*` | Open a share, Star, Fork |
| Square | `/api/v1/explore/libraries` | Latest-published and favorites boards |
| Notifications | `/api/v1/notifications/*` | In-site messages and read state |
| Admin | `/api/v1/admin/*` | Users, knowledge base review, notifications, statistics, settings, SMTP, logs |

## Contributing

Issues and pull requests are welcome. Before submitting, run:

```bash
npm test
npm run build
```

Make sure both the tests and the build pass.
