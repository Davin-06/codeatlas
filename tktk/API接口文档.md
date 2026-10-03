# Python 知识库网站 - API 接口文档

> 本文档描述的是早期 Laravel 方案草稿。当前接口以 Express 实现为准，认证为 Bearer Session Token（非 JWT），详见 `README.md` 与 `server/app.js`。

> 版本: v1.0.0  
> 基础路径: `/api/v1`  
> 认证方式: Bearer Token (JWT)

---

## 一、认证接口

### 1.1 用户注册

**POST** `/auth/register`

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "password_confirmation": "password123",
  "nickname": "用户名"
}
```

**响应**:
```json
{
  "success": true,
  "message": "注册成功，请验证邮箱",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "nickname": "用户名"
    },
    "requires_verification": true
  }
}
```

### 1.2 用户登录

**POST** `/auth/login`

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应**:
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "token": "jwt-token",
    "token_type": "Bearer",
    "expires_in": 3600,
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "nickname": "用户名"
    }
  }
}
```

### 1.3 获取当前用户

**GET** `/auth/user`

**请求头**:
```
Authorization: Bearer {token}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "nickname": "用户名",
    "avatar": "url",
    "bio": "个人简介"
  }
}
```

### 1.4 GitHub 登录

**GET** `/auth/github`

**响应**:
```json
{
  "success": true,
  "data": {
    "url": "https://github.com/login/oauth/authorize?client_id=xxx"
  }
}
```

**回调**:
```
GET /auth/github/callback?code={code}
```

---

## 二、知识查询接口

### 2.1 获取版本列表

**GET** `/knowledge/versions`

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "version": "3.8",
      "name": "Python 3.8",
      "release_date": "2019-10-14"
    },
    {
      "version": "3.9",
      "name": "Python 3.9",
      "release_date": "2020-10-05"
    }
  ]
}
```

### 2.2 获取分类列表

**GET** `/knowledge/categories`

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "name": "常用库",
      "description": "Python 常用第三方库"
    },
    {
      "name": "常用框架",
      "description": "Python Web 框架"
    }
  ]
}
```

### 2.3 获取知识列表

**GET** `/knowledge`

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| version | string | Python 版本 |
| category | string | 分类 |
| tag | string | 标签 |
| keyword | string | 关键词 |
| page | integer | 页码 |
| per_page | integer | 每页数量 |

**响应**:
```json
{
  "success": true,
  "data": {
    "current_page": 1,
    "data": [
      {
        "id": 1,
        "title": "NumPy 数组基础",
        "version": "3.8",
        "category": "常用库",
        "tags": ["NumPy", "数组"],
        "content": "NumPy 是 Python 科学计算的基础库..."
      }
    ],
    "last_page": 10,
    "total": 200
  }
}
```

### 2.4 获取知识详情

**GET** `/knowledge/{id}`

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "NumPy 数组基础",
    "content": "NumPy 是 Python 科学计算的基础库...",
    "version": "3.8",
    "category": "常用库",
    "tags": ["NumPy", "数组", "科学计算"],
    "author": "系统",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### 2.5 搜索知识

**POST** `/knowledge/search`

**请求体**:
```json
{
  "keyword": "NumPy",
  "version": "3.8",
  "category": "常用库"
}
```

### 2.6 收藏知识

**POST** `/knowledge/{id}/favorite`

**请求头**:
```
Authorization: Bearer {token}
```

**请求体**:
```json
{
  "knowledge_base_id": "uuid"
}
```

---

## 三、知识库接口

### 3.1 获取知识库列表

**GET** `/knowledge-base`

**请求头**:
```
Authorization: Bearer {token}
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "我的知识库",
      "description": "个人知识库",
      "is_shared": false,
      "view_count": 0,
      "favorite_count": 0
    }
  ]
}
```

### 3.2 创建知识库

**POST** `/knowledge-base`

**请求头**:
```
Authorization: Bearer {token}
```

**请求体**:
```json
{
  "name": "我的知识库",
  "description": "个人知识库",
  "tags": ["Python", "学习"],
  "is_public": false
}
```

### 3.3 更新知识库

**PUT** `/knowledge-base/{id}`

**请求体**:
```json
{
  "name": "更新后的名称",
  "description": "更新后的描述"
}
```

### 3.4 删除知识库

**DELETE** `/knowledge-base/{id}`

### 3.5 添加知识条目

**POST** `/knowledge-base/{id}/entries`

**请求体**:
```json
{
  "knowledge_id": 1,
  "category_id": "uuid",
  "notes": "我的笔记"
}
```

### 3.6 导出知识库

**GET** `/knowledge-base/{id}/export?format=json`

**支持格式**: json, markdown, pdf

---

## 四、分享接口

### 4.1 创建分享

**POST** `/knowledge-base/{id}/share`

**请求头**:
```
Authorization: Bearer {token}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "share_id": "abc123",
    "url": "https://your-domain.com/share/abc123",
    "expires_at": null
  }
}
```

### 4.2 获取分享内容

**GET** `/share/{shareId}`

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "分享的知识库",
    "description": "知识库描述",
    "entries": [...]
  }
}
```

---

## 五、管理接口

### 5.1 获取用户列表

**GET** `/admin/users`

**请求头**:
```
Authorization: Bearer {token}
```

**权限**: 需要 system-admin 或 content-admin 角色

### 5.2 获取系统统计

**GET** `/admin/stats`

**响应**:
```json
{
  "success": true,
  "data": {
    "total_users": 100,
    "total_knowledge_bases": 50,
    "total_shares": 20,
    "active_users_today": 10
  }
}
```

### 5.3 创建备份

**POST** `/admin/backup`

---

## 六、错误响应

### 6.1 认证错误

```json
{
  "success": false,
  "message": "未授权"
}
```

### 6.2 权限错误

```json
{
  "success": false,
  "message": "无权限操作"
}
```

### 6.3 验证错误

```json
{
  "success": false,
  "message": "验证失败",
  "errors": {
    "email": ["邮箱格式不正确"]
  }
}
```

### 6.4 资源不存在

```json
{
  "success": false,
  "message": "资源不存在"
}
```

---

## 七、状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 422 | 验证失败 |
| 500 | 服务器错误 |

---

**文档版本**: 1.0.0  
**最后更新**: 2026-09-27
