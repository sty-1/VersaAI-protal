<template>
  <div class="chat-pdf">
    <div class="chat-container">
      <aside class="sidebar" aria-label="PDF chat history">
        <div class="sidebar-brand">
          <DocumentTextIcon class="brand-icon" aria-hidden="true" />
          <h1 class="brand-title">ChatPDF</h1>
        </div>
        <div class="history-list">
          <div class="history-header">
            <span>History</span>
            <button class="btn-new-chat" @click="startNewChat" aria-label="New chat">
              <PlusIcon class="btn-icon" aria-hidden="true" />
              <span>New Chat</span>
            </button>
          </div>
          <button
            v-for="chat in chatHistory"
            :key="chat.id"
            class="history-item"
            :class="{ 'active': currentChatId === chat.id }"
            @click="loadChat(chat.id)"
            :aria-label="`Open: ${chat.title}`"
          >
            <DocumentTextIcon class="item-icon" aria-hidden="true" />
            <span class="item-title">{{ chat.title || 'PDF Chat' }}</span>
          </button>
          <div v-if="chatHistory.length === 0" class="sidebar-empty">
            <p>No history yet. Upload a PDF to get started.</p>
          </div>
        </div>
      </aside>

      <div class="chat-main">
        <!-- Upload welcome -->
        <div v-if="!currentPdfName" class="upload-welcome">
          <h2 class="welcome-title">
            Chat with any <span class="highlight">PDF</span>
          </h2>
          <div
            class="drop-zone"
            @dragover.prevent="handleDragOver"
            @dragleave.prevent="handleDragLeave"
            @drop.prevent="handleDrop"
            :class="{ 'dragging': isDragging, 'uploading': isUploading }"
            @click="triggerFileInput"
            role="button"
            tabindex="0"
            @keydown.enter.prevent="triggerFileInput"
            @keydown.space.prevent="triggerFileInput"
            aria-label="Upload PDF file"
          >
            <div class="upload-content">
              <template v-if="isUploading">
                <div class="upload-spinner" aria-label="Uploading"></div>
                <p class="upload-status-text">Uploading file...</p>
                <p class="upload-filename">{{ uploadingFileName }}</p>
              </template>
              <template v-else>
                <div class="upload-icon-wrapper">
                  <DocumentArrowUpIcon class="upload-icon" aria-hidden="true" />
                </div>
                <p class="upload-text">Drag & drop your PDF here, or click to browse</p>
                <input
                  type="file"
                  accept=".pdf"
                  @change="handleFileUpload"
                  :disabled="isUploading"
                  class="file-input-hidden"
                  ref="fileInputRef"
                  aria-label="Select PDF file"
                >
                <span class="upload-hint">Supports PDF files up to 50MB</span>
              </template>
            </div>
          </div>
        </div>

        <!-- Split view -->
        <div v-else class="split-view">
          <PDFViewer :file="pdfFile" :fileName="currentPdfName" />
          <div class="chat-view">
            <div class="messages" ref="messagesRef">
              <div v-if="isDownloadingPdf" class="loading-state">
                <div class="loading-spinner" aria-label="Loading"></div>
                <p>Loading PDF document...</p>
              </div>
              <ChatMessage
                v-for="(message, index) in currentMessages"
                :key="index"
                :message="message"
                :is-stream="isStreaming && index === currentMessages.length - 1"
              />
              <div v-if="currentMessages.length === 0 && !isDownloadingPdf" class="empty-state">
                <p>Upload complete! Start asking questions.</p>
              </div>
            </div>

            <div class="input-area">
              <textarea
                v-model="userInput"
                @keydown.enter.prevent="sendMessage()"
                placeholder="Ask anything about this PDF..."
                rows="1"
                ref="inputRef"
                aria-label="Type question"
              ></textarea>
              <button
                class="send-btn"
                @click="sendMessage()"
                :disabled="isStreaming || !userInput.trim()"
                aria-label="Send message"
              >
                <PaperAirplaneIcon class="btn-icon" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, onUnmounted } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import {
  DocumentArrowUpIcon,
  DocumentTextIcon,
  PaperAirplaneIcon,
  PlusIcon
} from '@heroicons/vue/24/outline'
import ChatMessage from '../components/ChatMessage.vue'
import { chatAPI } from '../services/api'
import PDFViewer from '../components/PDFViewer.vue'

const messagesRef = ref(null)
const inputRef = ref(null)
const fileInputRef = ref(null)
const userInput = ref('')
const isStreaming = ref(false)
const isUploading = ref(false)
const isDownloadingPdf = ref(false)
const currentChatId = ref(null)
const currentMessages = ref([])
const chatHistory = ref([])
const currentPdfName = ref('')
const isDragging = ref(false)
const uploadingFileName = ref('')
const pdfFile = ref(null)
const BASE_URL = 'http://localhost:8080'

marked.setOptions({ breaks: true, gfm: true, sanitize: false })

const adjustTextareaHeight = () => {
  const textarea = inputRef.value
  if (textarea) {
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px'
  }
}

const scrollToBottom = async () => {
  await nextTick()
  if (messagesRef.value) messagesRef.value.scrollTop = messagesRef.value.scrollHeight
}

const cleanupResources = () => {
  currentPdfName.value = ''
  currentMessages.value = []
  pdfFile.value = null
  currentChatId.value = null
  isDownloadingPdf.value = false
  isUploading.value = false
  uploadingFileName.value = ''
  userInput.value = ''
  isStreaming.value = false
  if (inputRef.value) inputRef.value.style.height = 'auto'
}

const startNewChat = () => {
  cleanupResources()
  pdfFile.value = null
  currentPdfName.value = ''
  currentChatId.value = null
  currentMessages.value = []
  isUploading.value = false
  uploadingFileName.value = ''
  userInput.value = ''
  if (inputRef.value) inputRef.value.style.height = 'auto'
  if (messagesRef.value) messagesRef.value.scrollTop = 0
}

const loadChat = async (chatId) => {
  if (!chatId) return
  cleanupResources()
  currentChatId.value = chatId

  try {
    const messages = await chatAPI.getChatMessages(chatId, 'pdf')
    currentMessages.value = messages.map(msg => ({ ...msg, isMarkdown: msg.role === 'assistant' }))

    isDownloadingPdf.value = true
    const response = await fetch(`${BASE_URL}/ai/pdf/file/${chatId}`)
    if (!response.ok) throw new Error('Failed to fetch PDF')

    const contentDisposition = response.headers.get('content-disposition')
    let filename = 'document.pdf'
    if (contentDisposition) {
      const matches = contentDisposition.match(/filename=["']?([^"']+)["']?/)
      if (matches && matches[1]) filename = decodeURIComponent(matches[1])
    }

    currentPdfName.value = filename
    const chatIndex = chatHistory.value.findIndex(c => c.id === chatId)
    if (chatIndex !== -1) chatHistory.value[chatIndex].title = filename

    const blob = await response.blob()
    pdfFile.value = new File([blob], filename, { type: 'application/pdf' })
  } catch (error) {
    console.error('Load failed:', error)
    currentMessages.value.push({
      role: 'assistant', content: 'Failed to load. Please try again.', timestamp: new Date(), isMarkdown: true
    })
  } finally {
    isDownloadingPdf.value = false
  }
}

const loadChatHistory = async () => {
  try {
    const history = await chatAPI.getChatHistory('pdf')
    chatHistory.value = history || []
    if (history && history.length > 0) await loadChat(history[0].id)
  } catch (error) {
    console.error('Failed to load chat history:', error)
    chatHistory.value = []
  }
}

const uploadPdf = async (file) => {
  isUploading.value = true
  uploadingFileName.value = file.name

  try {
    const formData = new FormData()
    formData.append('file', file)
    const uploadChatId = currentChatId.value || `pdf_${Date.now()}`

    const response = await fetch(`${BASE_URL}/ai/pdf/upload/${uploadChatId}`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) throw new Error(`Upload failed: ${response.status}`)
    const data = await response.json()

    currentChatId.value = data.chatId || uploadChatId
    currentPdfName.value = file.name
    pdfFile.value = file

    if (!chatHistory.value.some(chat => chat.id === currentChatId.value)) {
      const title = file.name.length > 30 ? file.name.slice(0, 30) + '...' : file.name
      chatHistory.value = [{ id: currentChatId.value, title }, ...chatHistory.value]
    }

    currentMessages.value = [{
      role: 'assistant',
      content: `PDF uploaded: **${file.name}**. You can now start asking questions.`,
      timestamp: new Date(),
      isMarkdown: true
    }]
  } catch (error) {
    console.error('Upload failed:', error)
    alert('Upload failed. Please try again.')
  } finally {
    isUploading.value = false
    uploadingFileName.value = ''
  }
}

const handleDrop = async (event) => {
  event.preventDefault()
  isDragging.value = false
  const files = event.dataTransfer.files
  if (files.length === 0) return
  const file = files[0]
  if (file.type !== 'application/pdf') { alert('Please upload a PDF file'); return }
  await uploadPdf(file)
}

const handleDragOver = (event) => { event.preventDefault(); isDragging.value = true }
const handleDragLeave = (event) => { event.preventDefault(); isDragging.value = false }

const triggerFileInput = () => { fileInputRef.value?.click() }

const handleFileUpload = async (event) => {
  const files = event.target.files
  if (files.length === 0) return
  const file = files[0]
  if (file.type !== 'application/pdf') { alert('Please upload a PDF file'); return }
  await uploadPdf(file)
  event.target.value = ''
}

const sendMessage = async () => {
  if (!userInput.value.trim() || isStreaming.value) return

  currentMessages.value.push({
    role: 'user', content: userInput.value, timestamp: new Date()
  })

  const input = userInput.value
  userInput.value = ''
  if (inputRef.value) inputRef.value.style.height = 'auto'
  await scrollToBottom()

  const assistantIdx = currentMessages.value.length
  currentMessages.value.push({
    role: 'assistant', content: '', timestamp: new Date(), isMarkdown: true
  })

  try {
    isStreaming.value = true
    const reader = await chatAPI.sendPdfMessage(input, currentChatId.value)
    const decoder = new TextDecoder()
    let result = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      result += decoder.decode(value, { stream: true })
      currentMessages.value[assistantIdx] = {
        role: 'assistant', content: result, timestamp: new Date(), isMarkdown: true
      }
      await nextTick()
      await scrollToBottom()
    }
  } catch (error) {
    console.error('Failed to send message:', error)
    currentMessages.value[assistantIdx] = {
      role: 'assistant', content: 'Failed to send message. Please try again.', timestamp: new Date(), isMarkdown: true
    }
  } finally {
    isStreaming.value = false
    await scrollToBottom()
  }
}

onMounted(() => {
  loadChatHistory()
  adjustTextareaHeight()
})

onUnmounted(() => {
  window.removeEventListener('cleanupChatPDF', cleanupResources)
})
</script>

<style scoped lang="scss">
.chat-pdf {
  position: fixed;
  top: var(--navbar-height);
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  background: var(--surface-page);
  overflow: hidden;

  .chat-container {
    flex: 1;
    display: flex;
    max-width: 1800px;
    width: 100%;
    margin: 0 auto;
    padding: var(--space-6) var(--space-8);
    gap: var(--space-6);
    height: 100%;
    overflow: hidden;
  }

  .sidebar {
    width: var(--sidebar-width);
    display: flex;
    flex-direction: column;
    background: var(--surface-sidebar);
    backdrop-filter: blur(var(--sidebar-blur));
    -webkit-backdrop-filter: blur(var(--sidebar-blur));
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-md);
    border: 1px solid var(--border-light);
    overflow: hidden;

    .sidebar-brand {
      padding: var(--space-5) var(--space-5) var(--space-3);
      display: flex;
      align-items: center;
      gap: var(--space-3);
      border-bottom: 1px solid var(--border-light);

      .brand-icon { width: 28px; height: 28px; color: var(--color-accent); }
      .brand-title {
        font-size: var(--font-xl);
        font-weight: var(--font-bold);
        background: var(--gradient-purple);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
    }

    .history-list {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-3) 0;

      .history-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--space-2) var(--space-4) var(--space-3);
        font-size: var(--font-xs);
        font-weight: var(--font-semibold);
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;

        .btn-new-chat {
          display: flex;
          align-items: center;
          gap: var(--space-1);
          padding: var(--space-1) var(--space-3);
          border: none;
          border-radius: var(--radius-md);
          background: var(--color-accent);
          color: var(--text-inverse);
          font-size: var(--font-xs);
          font-weight: var(--font-medium);
          cursor: pointer;
          text-transform: none;
          letter-spacing: normal;
          transition: all var(--transition-fast);

          &:hover { background: var(--color-accent-hover); }
          .btn-icon { width: 14px; height: 14px; }
        }
      }

      .history-item {
        width: 100%;
        display: flex;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-3) var(--space-4);
        cursor: pointer;
        border: none;
        background: transparent;
        color: var(--text-primary);
        font-family: inherit;
        font-size: var(--font-sm);
        text-align: left;
        transition: all var(--transition-fast);

        &:hover { background: var(--surface-hover); }

        &.active {
          background: rgba(147, 51, 234, 0.08);
          color: var(--color-accent);
          .item-icon { color: var(--color-accent); }
        }

        .item-icon { width: 18px; height: 18px; color: var(--text-muted); flex-shrink: 0; }
        .item-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      }

      .sidebar-empty {
        padding: var(--space-8) var(--space-4);
        text-align: center;
        color: var(--text-muted);
        font-size: var(--font-sm);
        line-height: 1.6;
      }
    }
  }

  .chat-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: var(--surface-card);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-md);
    border: 1px solid var(--border-light);
    overflow: hidden;
  }
}

/* ── Upload Welcome ───────────────────────────────────── */
.upload-welcome {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
  gap: var(--space-8);

  .welcome-title {
    font-size: var(--font-5xl);
    font-weight: var(--font-bold);
    text-align: center;

    .highlight {
      background: var(--gradient-purple);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  }

  .drop-zone {
    width: 100%;
    max-width: 560px;
    min-height: 280px;
    border: 2px dashed var(--border-default);
    border-radius: var(--radius-2xl);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all var(--transition-base);
    background: var(--surface-hover);

    &.dragging {
      border-color: var(--color-accent);
      background: rgba(147, 51, 234, 0.05);
      border-style: solid;
      transform: scale(1.01);
    }

    &.uploading {
      border-color: var(--color-primary);
      background: rgba(0, 124, 240, 0.04);
    }

    &:hover:not(.uploading) {
      border-color: var(--color-accent);
      background: rgba(147, 51, 234, 0.03);
    }

    &:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 3px;
    }

    .upload-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-8);
      text-align: center;

      .upload-icon-wrapper {
        width: 72px;
        height: 72px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-2xl);
        background: var(--color-accent-light);
        .upload-icon { width: 36px; height: 36px; color: var(--color-accent); }
      }

      .upload-text { font-size: var(--font-lg); color: var(--text-secondary); }
      .upload-hint { font-size: var(--font-xs); color: var(--text-muted); }

      .upload-spinner {
        width: 48px; height: 48px;
        border: 4px solid rgba(0, 124, 240, 0.1);
        border-left-color: var(--color-primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      .upload-status-text { font-size: var(--font-lg); color: var(--color-primary); font-weight: var(--font-medium); }
      .upload-filename { font-size: var(--font-sm); color: var(--text-muted); max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

      .file-input-hidden { display: none; }
    }
  }
}

/* ── Split View ───────────────────────────────────────── */
.split-view {
  flex: 1;
  display: flex;
  overflow: hidden;

  .chat-view {
    flex: 1;
    min-width: 380px;
    display: flex;
    flex-direction: column;
    background: var(--surface-card);
    border-left: 1px solid var(--border-light);

    .messages {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-6);
    }

    .input-area {
      flex-shrink: 0;
      padding: var(--space-4) var(--space-6) var(--space-6);
      border-top: 1px solid var(--border-light);
      display: flex;
      gap: var(--space-3);
      align-items: flex-end;

      textarea {
        flex: 1;
        resize: none;
        border: 1px solid var(--input-border);
        background: var(--input-bg);
        border-radius: var(--input-radius);
        padding: var(--space-3) var(--space-4);
        color: var(--text-primary);
        font-family: inherit;
        font-size: var(--font-sm);
        line-height: 1.5;
        max-height: 150px;
        transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

        &:focus {
          outline: none;
          border-color: var(--color-accent);
          box-shadow: 0 0 0 3px rgba(147, 51, 234, 0.12);
        }

        &::placeholder { color: var(--text-muted); }
      }

      .send-btn {
        width: 42px; height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        border-radius: var(--radius-lg);
        background: var(--color-accent);
        color: var(--text-inverse);
        cursor: pointer;
        transition: all var(--transition-fast);
        flex-shrink: 0;

        &:hover:not(:disabled) { background: var(--color-accent-hover); transform: scale(1.05); }
        &:disabled { background: var(--border-default); cursor: not-allowed; }
        .btn-icon { width: 20px; height: 20px; }
      }
    }
  }
}

/* Loading & Empty states */
.loading-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  color: var(--text-muted);

  .loading-spinner {
    width: 40px; height: 40px;
    border: 3px solid var(--border-default);
    border-left-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  p { font-size: var(--font-sm); }
}

.empty-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: var(--font-sm);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 1024px) {
  .split-view {
    flex-direction: column;
    .chat-view { border-left: none; border-top: 1px solid var(--border-light); min-width: 0; }
  }
}

@media (max-width: 768px) {
  .chat-pdf {
    .chat-container { padding: 0; }
    .sidebar { display: none; }
    .chat-main { border-radius: 0; border: none; }

    .upload-welcome {
      padding: var(--space-4);
      .welcome-title { font-size: var(--font-3xl); }
      .drop-zone { min-height: 220px; }
    }

    .split-view .chat-view {
      .messages { padding: var(--space-4); }
      .input-area { padding: var(--space-3); }
    }
  }
}
</style>
