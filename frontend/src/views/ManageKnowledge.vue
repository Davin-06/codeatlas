<template>
  <div class="manage-page shell">
    <header class="manage-header">
      <div>
        <p class="breadcrumb"><router-link to="/">首页</router-link><span>/</span> 资料维护</p>
        <h1>把经验整理成下一次可查的答案。</h1>
        <p>在这里新增、修改或删除自行添加的内容。内置基础资料保持只读，避免误删。</p>
      </div>
      <div class="manage-header-actions">
        <router-link to="/manage/mail">配置验证码邮箱</router-link>
        <div :class="['server-state', { online: isOnline }]">
          <span aria-hidden="true"></span>{{ isOnline ? '共享服务在线' : '共享服务离线' }}
        </div>
      </div>
    </header>

    <div class="manage-layout">
      <form class="knowledge-editor" @submit.prevent="save">
        <div class="editor-heading">
          <div>
            <span>{{ editingId ? '编辑条目' : '创建条目' }}</span>
            <h2>{{ editingId ? '更新知识内容' : '录入一条新知识' }}</h2>
          </div>
          <button v-if="editingId" type="button" @click="resetForm">取消编辑</button>
        </div>

        <label class="wide-field">
          <span>标题 *</span>
          <input v-model="form.title" required maxlength="160" placeholder="例如：服务器部署检查清单" />
        </label>
        <label class="wide-field">
          <span>内容摘要 *</span>
          <textarea v-model="form.content" required rows="5" placeholder="说明这条知识解决什么问题，以及关键结论。"></textarea>
        </label>

        <div class="editor-grid">
          <label><span>领域</span><input v-model="form.domain" list="domain-options" placeholder="工程实践" /></label>
          <label class="category-field">
            <span>主题</span>
            <select v-model="categoryChoice" @change="handleCategoryChoice">
              <option v-for="name in categoryStore.allNames" :key="name" :value="name">{{ name }}</option>
              <option value="__new__">＋ 新建分类…</option>
            </select>
            <input
              v-if="categoryChoice === '__new__'"
              v-model="form.category"
              class="new-category-input"
              maxlength="40"
              placeholder="输入新分类名称，例如：移动开发"
            />
          </label>
          <label>
            <span>难度</span>
            <select v-model="form.level"><option>入门</option><option>进阶</option><option>项目</option></select>
          </label>
          <label><span>版本 / 环境</span><input v-model="form.version" placeholder="通用" /></label>
          <label><span>作者</span><input v-model="form.author" placeholder="姓名或学习小组" /></label>
          <label><span>标签</span><input v-model="form.tags" placeholder="部署, Linux, 检查清单" /></label>
        </div>
        <p v-if="categoryChoice === '__new__'" class="category-hint">
          新分类会在发布成功后自动加入首页分类索引，之后其他人可以直接选用。
        </p>

        <label class="wide-field">
          <span>示例代码</span>
          <textarea v-model="form.code" rows="5" class="code-input" placeholder="可选"></textarea>
        </label>

        <details class="editor-advanced">
          <summary>
            <span><strong>完善文章内容</strong><small>推荐填写，详情页会更有针对性</small></span>
            <span aria-hidden="true">＋</span>
          </summary>
          <div>
            <label class="wide-field">
              <span>核心原理</span>
              <textarea v-model="form.principle" rows="5" placeholder="解释为什么这样做、它如何工作，以及适用边界。"></textarea>
            </label>
            <label class="wide-field">
              <span>关键要点 <small>每行一条</small></span>
              <textarea v-model="form.key_points" rows="4" placeholder="先明确输入与输出&#10;说明关键状态如何变化&#10;指出适用条件"></textarea>
            </label>
            <label class="wide-field">
              <span>常见误区 <small>每行一条</small></span>
              <textarea v-model="form.pitfalls" rows="4" placeholder="只验证正常输入&#10;忽略版本或环境差异"></textarea>
            </label>
            <label class="wide-field">
              <span>练习题 <small>每行一条</small></span>
              <textarea v-model="form.exercises" rows="4" placeholder="运行并解释示例&#10;修改一个条件观察结果&#10;放进小项目验证"></textarea>
            </label>
          </div>
        </details>

        <label class="wide-field">
          <span>管理员密钥 <small>写入共享知识库时必须填写</small></span>
          <input v-model="importKey" type="password" autocomplete="current-password" placeholder="可选" />
        </label>

        <div v-if="message.text" :class="['editor-message', message.type]" role="status">{{ message.text }}</div>

        <button class="editor-submit" type="submit" :disabled="isSaving || !isOnline">
          {{ isSaving ? '正在保存…' : editingId ? '保存修改' : '添加到共享知识库' }}
        </button>
      </form>

      <section class="managed-list" aria-labelledby="managed-title">
        <div class="managed-list-heading">
          <div><span>自行添加的资料</span><h2 id="managed-title">{{ managedItems.length }} 条可维护内容</h2></div>
          <button type="button" @click="loadItems">刷新</button>
        </div>

        <div v-if="isLoading" class="manage-loading">正在读取共享知识库…</div>
        <div v-else-if="managedItems.length" class="managed-items">
          <article v-for="item in managedItems" :key="item.id">
            <div>
              <p><span>{{ item.domain }}</span><span>{{ item.level }}</span><span>{{ item.version }}</span></p>
              <h3>{{ item.title }}</h3>
              <small>{{ item.author }} · {{ item.category }}</small>
            </div>
            <div class="managed-actions">
              <button type="button" @click="edit(item)">编辑</button>
              <button type="button" class="danger" @click="remove(item)">删除</button>
            </div>
          </article>
        </div>
        <div v-else class="manage-empty">
          <span aria-hidden="true">＋</span>
          <h3>还没有自行添加的资料</h3>
          <p>可以使用左侧表单创建，或从页面右上角批量导入。</p>
        </div>
      </section>
    </div>
    <datalist id="domain-options">
      <option v-for="item in domainOptions" :key="item" :value="item" />
    </datalist>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { knowledgeService } from '../services/api'
import { demoDomains } from '../data/demoData'
import { useCategoryStore } from '../stores/categories'

const categoryStore = useCategoryStore()
const domainOptions = demoDomains.map((item) => item.name)

const emptyForm = () => ({
  title: '', content: '', domain: '工程实践', category: '项目实践', level: '入门',
  version: '通用', author: '知识贡献者', tags: '', code: '', principle: '',
  key_points: '', pitfalls: '', exercises: ''
})

const form = reactive(emptyForm())
// 分类选择器：默认选中第一个已有分类，选「新建分类」时才显示输入框
const categoryChoice = ref('项目实践')
const importKey = ref(sessionStorage.getItem('codeatlas.import-key') || sessionStorage.getItem('pyatlas.import-key') || '')
const managedItems = ref([])
const editingId = ref('')
const isOnline = ref(false)
const isLoading = ref(true)
const isSaving = ref(false)
const message = reactive({ type: '', text: '' })

onMounted(async () => {
  await categoryStore.loadNames()
  syncCategoryChoice()
  await loadItems()
})

// 让下拉框的选中值与表单里的 category 保持一致（编辑已有条目时会用到）
function syncCategoryChoice() {
  const current = String(form.category || '').trim()
  if (current && !categoryStore.allNames.includes(current)) {
    categoryStore.remember(current)
  }
  categoryChoice.value = current || categoryStore.allNames[0] || '__new__'
}

function handleCategoryChoice() {
  if (categoryChoice.value === '__new__') {
    form.category = ''
    return
  }
  form.category = categoryChoice.value
}

async function loadItems() {
  isLoading.value = true
  try {
    const response = await knowledgeService.getKnowledgeList({ per_page: 2000, order: 'desc' })
    managedItems.value = (response.data?.data || []).filter((item) => item.imported)
    isOnline.value = true
  } catch {
    isOnline.value = false
    message.type = 'error'
    message.text = '无法连接共享服务器，请先运行 npm run dev。'
  } finally {
    isLoading.value = false
  }
}

function payload() {
  return {
    ...form,
    tags: form.tags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean),
    key_points: parseLines(form.key_points),
    pitfalls: parseLines(form.pitfalls),
    exercises: parseLines(form.exercises)
  }
}

function parseLines(value) {
  return value.split(/\r?\n|\s*\|\s*/).map((item) => item.trim()).filter(Boolean)
}

async function save() {
  const category = form.category.trim()
  if (!category) {
    message.type = 'error'
    message.text = '请填写新分类的名称，或从列表里选择一个已有分类。'
    return
  }
  if (!/^[\w\u4e00-\u9fa5][\w\u4e00-\u9fa5 +.#()\-/&]*$/.test(category)) {
    message.type = 'error'
    message.text = '分类名称只能包含中英文、数字、空格与 + . # ( ) - / &。'
    return
  }

  isSaving.value = true
  message.text = ''
  sessionStorage.setItem('codeatlas.import-key', importKey.value)
  const isNewCategory = !categoryStore.allNames.includes(category)
  try {
    if (editingId.value) {
      await knowledgeService.updateKnowledge(editingId.value, payload(), importKey.value)
      message.text = '知识内容已经更新。'
    } else {
      await knowledgeService.createKnowledge(payload(), importKey.value)
      message.text = '新知识已经加入共享知识库。'
    }
    if (isNewCategory) {
      // 新分类已在服务端登记，前端立刻补进名单并通知首页刷新
      categoryStore.remember(category)
      window.dispatchEvent(new CustomEvent('codeatlas:categories-changed'))
      message.text += `分类「${category}」已创建，其他人发布时可以直接选用。`
    }
    message.type = 'success'
    resetForm()
    await loadItems()
  } catch (error) {
    message.type = 'error'
    message.text = error.response?.data?.message || '保存失败，请检查服务器连接。'
  } finally {
    isSaving.value = false
  }
}

function edit(item) {
  editingId.value = item.id
  Object.assign(form, {
    title: item.title,
    content: item.content,
    domain: item.domain,
    category: item.category,
    level: item.level,
    version: item.version,
    author: item.author,
    tags: (item.tags || []).join(', '),
    code: item.code || '',
    principle: item.principle || '',
    key_points: (item.key_points || []).join('\n'),
    pitfalls: (item.pitfalls || []).join('\n'),
    exercises: (item.exercises || []).join('\n')
  })
  syncCategoryChoice()
  window.scrollTo({ top: 180, behavior: 'smooth' })
}

function resetForm() {
  editingId.value = ''
  Object.assign(form, emptyForm())
  syncCategoryChoice()
}

async function remove(item) {
  if (!window.confirm(`确定删除“${item.title}”吗？此操作无法撤销。`)) return
  sessionStorage.setItem('codeatlas.import-key', importKey.value)
  try {
    await knowledgeService.deleteKnowledge(item.id, importKey.value)
    message.type = 'success'
    message.text = '知识条目已删除。'
    if (editingId.value === item.id) resetForm()
    await loadItems()
  } catch (error) {
    message.type = 'error'
    message.text = error.response?.data?.message || '删除失败。'
  }
}
</script>
