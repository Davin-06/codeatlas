<template>
  <dialog ref="dialog" class="import-dialog" @click.self="close">
    <div class="import-panel">
      <header class="import-header">
        <div>
          <span>批量添加资料</span>
          <h2>导入自己的学习资料</h2>
          <p>选择文件、确认预览、点击导入即可。支持 JSON 和 CSV，服务器离线时会自动保存在当前浏览器。</p>
        </div>
        <button type="button" aria-label="关闭导入窗口" @click="close">×</button>
      </header>

      <div class="import-format">
        <div>
          <strong>最少需要两个字段</strong>
          <p><code>title</code> 标题、<code>content</code> 摘要；还可填写核心原理、关键要点、常见误区和练习题。</p>
        </div>
        <button type="button" @click="downloadTemplate">下载 CSV 模板</button>
      </div>

      <label
        class="drop-zone"
        :class="{ dragging: isDragging, ready: previewItems.length }"
        @dragenter.prevent="isDragging = true"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleDrop"
      >
        <input type="file" accept=".json,.csv,application/json,text/csv" @change="handleInput" />
        <span class="drop-icon" aria-hidden="true">⇧</span>
        <strong>{{ fileName || '把文件拖到这里，或点击选择' }}</strong>
        <small v-if="!previewItems.length">最大 2 MB · UTF-8 编码</small>
        <small v-else>已识别 {{ previewItems.length }} 条可导入知识</small>
      </label>

      <div v-if="previewItems.length" class="import-preview">
        <div class="preview-heading">
          <strong>导入预览</strong>
          <span>显示前 3 条</span>
        </div>
        <ul>
          <li v-for="item in previewItems.slice(0, 3)" :key="item.id">
            <span>{{ item.domain }}</span>
            <strong>{{ item.title }}</strong>
            <small>{{ item.category }} · {{ item.level }}</small>
          </li>
        </ul>
      </div>

      <div v-if="errorMessage" class="import-message error" role="alert">
        <strong>没有完成解析</strong>
        <p>{{ errorMessage }}</p>
      </div>

      <div v-if="warningMessages.length" class="import-message warning">
        <strong>{{ warningMessages.length }} 条内容被跳过</strong>
        <p>{{ warningMessages.slice(0, 2).join('；') }}</p>
      </div>

      <label class="import-key-field">
        <span>管理员密钥 <small>写入共享知识库时必须填写</small></span>
        <input
          v-model="importKey"
          type="password"
          autocomplete="current-password"
          placeholder="可选"
        />
      </label>

      <footer class="import-actions">
        <p><span aria-hidden="true">●</span> 优先写入共享知识库</p>
        <div>
          <button type="button" class="secondary" @click="close">取消</button>
          <button type="button" class="primary" :disabled="!previewItems.length || isSubmitting" @click="confirmImport">
            {{ isSubmitting ? '正在导入…' : `导入 ${previewItems.length || ''} 条知识` }}
          </button>
        </div>
      </footer>
    </div>
  </dialog>
</template>

<script setup>
import { ref } from 'vue'
import {
  csvTemplate,
  parseKnowledgeFile,
  saveImportedKnowledge
} from '../services/knowledgeLibrary'
import { knowledgeService } from '../services/api'

const emit = defineEmits(['imported'])
const dialog = ref(null)
const fileName = ref('')
const previewItems = ref([])
const warningMessages = ref([])
const errorMessage = ref('')
const isDragging = ref(false)
const isSubmitting = ref(false)
const importKey = ref(sessionStorage.getItem('codeatlas.import-key') || sessionStorage.getItem('pyatlas.import-key') || '')

defineExpose({ open })

function open() {
  reset()
  dialog.value?.showModal()
}

function close() {
  dialog.value?.close()
}

function reset() {
  fileName.value = ''
  previewItems.value = []
  warningMessages.value = []
  errorMessage.value = ''
  isDragging.value = false
  isSubmitting.value = false
}

async function readFile(file) {
  reset()
  if (!file) return
  fileName.value = file.name
  if (file.size > 2 * 1024 * 1024) {
    errorMessage.value = '文件超过 2 MB，请拆分后再导入。'
    return
  }
  if (!/\.(json|csv)$/i.test(file.name)) {
    errorMessage.value = '目前只支持 .json 或 .csv 文件。'
    return
  }

  try {
    const result = await parseKnowledgeFile(file)
    previewItems.value = result.items
    warningMessages.value = result.errors
  } catch (error) {
    errorMessage.value = error.message || '无法解析这个文件，请检查格式。'
  }
}

function handleInput(event) {
  readFile(event.target.files?.[0])
  event.target.value = ''
}

function handleDrop(event) {
  isDragging.value = false
  readFile(event.dataTransfer.files?.[0])
}

async function confirmImport() {
  if (!previewItems.value.length || isSubmitting.value) return
  const count = previewItems.value.length
  isSubmitting.value = true
  errorMessage.value = ''
  sessionStorage.setItem('codeatlas.import-key', importKey.value)

  try {
    const response = await knowledgeService.importKnowledge(previewItems.value, importKey.value)
    window.dispatchEvent(new CustomEvent('codeatlas:knowledge-imported', {
      detail: { count: response.data.count, scope: 'shared' }
    }))
    emit('imported', { count: response.data.count, scope: 'shared' })
    close()
  } catch (error) {
    if (error.response) {
      errorMessage.value = error.response.data?.message || '服务器拒绝了这次导入。'
      isSubmitting.value = false
      return
    }
    saveImportedKnowledge(previewItems.value)
    emit('imported', { count, scope: 'local' })
    close()
  }
}

function downloadTemplate() {
  const blob = new Blob([`\uFEFF${csvTemplate}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'codeatlas-import-template.csv'
  anchor.click()
  URL.revokeObjectURL(url)
}
</script>
