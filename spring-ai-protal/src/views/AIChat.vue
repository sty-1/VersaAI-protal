<template>
  <div class="ai-chat">
    <div class="chat-container">
      <aside class="sidebar" aria-label="Chat history sidebar">
        <div class="sidebar-header">
          <h2>History</h2>
          <button class="btn-new-chat" @click="startNewChat" aria-label="Start new chat">
            <PlusIcon class="icon" aria-hidden="true" />
            <span>New Chat</span>
          </button>
        </div>
        <div class="history-list" v-if="!isLoadingHistory">
          <button
            v-for="chat in chatHistory"
            :key="chat.id"
            class="history-item"
            :class="{ 'active': currentChatId === chat.id }"
            @click="loadChat(chat.id)"
            :aria-label="`Open chat: ${chat.title}`"
            :aria-current="currentChatId === chat.id ? 'true' : undefined"
          >
            <ChatBubbleLeftRightIcon class="item-icon" aria-hidden="true" />
            <span class="item-title">{{ chat.title || 'New Chat' }}</span>
          </button>
          <div v-if="chatHistory.length === 0" class="sidebar-empty">
            <p>No chat history yet</p>
          </div>
        </div>
        <div v-else class="sidebar-loading">
          <div class="skeleton-item" v-for="i in 4" :key="i"></div>
        </div>
      </aside>

      <div class="chat-main">
        <div class="messages" ref="messagesRef">
          <div v-if="currentMessages.length === 0 && !isStreaming" class="empty-state">
            <div class="empty-icon-wrapper">
              <ChatBubbleLeftRightIcon class="empty-icon" aria-hidden="true" />
            </div>
            <h3>Start a conversation</h3>
            <p>Send a message or upload files to chat with multimodal AI</p>
            <div class="feature-hints">
              <span class="hint">Images</span>
              <span class="hint">Audio</span>
              <span class="hint">Video</span>
            </div>
          </div>
          <ChatMessage
            v-for="(message, index) in currentMessages"
            :key="index"
            :message="message"
            :is-stream="isStreaming && index === currentMessages.length - 1"
          />
          <div v-if="isStreaming && currentMessages[currentMessages.length - 1]?.content === ''" class="streaming-indicator">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>

        <div class="input-area">
          <div v-if="selectedFiles.length > 0" class="selected-files">
            <div v-for="(file, index) in selectedFiles" :key="index" class="file-chip">
              <div class="file-info">
                <DocumentIcon class="file-icon" aria-hidden="true" />
                <div class="file-details">
                  <span class="file-name">{{ file.name }}</span>
                  <span class="file-size">{{ formatFileSize(file.size) }}</span>
                </div>
              </div>
              <button class="remove-btn" @click="removeFile(index)" :aria-label="`Remove file: ${file.name}`">
                <XMarkIcon class="rm-icon" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div class="input-row">
            <input
              type="file"
              ref="fileInput"
              @change="handleFileUpload"
              accept="image/*,audio/*,video/*"
              multiple
              class="hidden-input"
              aria-label="Upload files"
            >
            <button
              class="upload-btn"
              @click="triggerFileInput"
              :disabled="isStreaming"
              aria-label="Select files to upload"
              title="Upload images, audio, or video"
            >
              <PaperClipIcon class="btn-icon" aria-hidden="true" />
            </button>

            <textarea
              v-model="userInput"
              @keydown.enter.exact.prevent="sendMessage"
              @input="adjustTextareaHeight"
              :placeholder="getPlaceholder()"
              rows="1"
              ref="inputRef"
              aria-label="Message input"
            ></textarea>
            <button
              class="send-btn"
              @click="sendMessage"
              :disabled="isStreaming || (!userInput.trim() && !selectedFiles.length)"
              aria-label="Send message"
              title="Send (Enter)"
            >
              <PaperAirplaneIcon class="btn-icon" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useDark } from '@vueuse/core'
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  PlusIcon,
  PaperClipIcon,
  DocumentIcon,
  XMarkIcon
} from '@heroicons/vue/24/outline'
import ChatMessage from '../components/ChatMessage.vue'
import { chatAPI } from '../services/api'

const isDark = useDark()
const messagesRef = ref(null)
const inputRef = ref(null)
const userInput = ref('')
const isStreaming = ref(false)
const isLoadingHistory = ref(false)
const currentChatId = ref(null)
const currentMessages = ref([])
const chatHistory = ref([])
const fileInput = ref(null)
const selectedFiles = ref([])

const adjustTextareaHeight = () => {
  const textarea = inputRef.value
  if (textarea) {
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px'
  }
}

const scrollToBottom = async () => {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

const FILE_LIMITS = {
  image: {
    maxSize: 10 * 1024 * 1024,
    maxFiles: 3,
    description: 'image files'
  },
  audio: {
    maxSize: 10 * 1024 * 1024,
    maxDuration: 180,
    maxFiles: 3,
    description: 'audio files'
  },
  video: {
    maxSize: 150 * 1024 * 1024,
    maxDuration: 40,
    maxFiles: 3,
    description: 'video files'
  }
}

const triggerFileInput = () => fileInput.value?.click()

const validateFile = async (file) => {
  const type = file.type.split('/')[0]
  const limit = FILE_LIMITS[type]
  if (!limit) return { valid: false, error: 'Unsupported file type' }
  if (file.size > limit.maxSize) return { valid: false, error: `File size must be under ${limit.maxSize / 1024 / 1024}MB` }
  if ((type === 'audio' || type === 'video') && limit.maxDuration) {
    try {
      const duration = await getMediaDuration(file)
      if (duration > limit.maxDuration) return { valid: false, error: `${type === 'audio' ? 'Audio' : 'Video'} duration must be under ${limit.maxDuration}s` }
    } catch {
      return { valid: false, error: 'Unable to read media duration' }
    }
  }
  return { valid: true }
}

const getMediaDuration = (file) => {
  return new Promise((resolve, reject) => {
    const element = file.type.startsWith('audio/') ? new Audio() : document.createElement('video')
    element.preload = 'metadata'
    element.onloadedmetadata = () => { resolve(element.duration); URL.revokeObjectURL(element.src) }
    element.onerror = () => { reject(new Error('Cannot read media file')); URL.revokeObjectURL(element.src) }
    element.src = URL.createObjectURL(file)
  })
}

const handleFileUpload = async (event) => {
  const files = Array.from(event.target.files || [])
  if (!files.length) return

  const firstFileType = files[0].type.split('/')[0]
  const hasInconsistentType = files.some(file => file.type.split('/')[0] !== firstFileType)
  if (hasInconsistentType) {
    alert('Please select files of the same type (images, audio, or video)')
    event.target.value = ''
    return
  }

  for (const file of files) {
    const { valid, error } = await validateFile(file)
    if (!valid) { alert(error); event.target.value = ''; selectedFiles.value = []; return }
  }

  selectedFiles.value = files
}

const getPlaceholder = () => {
  if (selectedFiles.value.length > 0) {
    const type = selectedFiles.value[0].type.split('/')[0]
    return `${selectedFiles.value.length} ${FILE_LIMITS[type].description} selected, continue typing...`
  }
  return 'Type a message, or upload images, audio, or video...'
}

const sendMessage = async () => {
  if (isStreaming.value) return
  if (!userInput.value.trim() && !selectedFiles.value.length) return

  const messageContent = userInput.value.trim()

  currentMessages.value.push({
    role: 'user',
    content: messageContent,
    timestamp: new Date()
  })

  userInput.value = ''
  adjustTextareaHeight()
  await scrollToBottom()

  const formData = new FormData()
  if (messageContent) formData.append('prompt', messageContent)
  selectedFiles.value.forEach(file => formData.append('files', file))

  const assistantMessage = { role: 'assistant', content: '', timestamp: new Date() }
  currentMessages.value.push(assistantMessage)
  isStreaming.value = true

  try {
    const reader = await chatAPI.sendMessage(formData, currentChatId.value)
    const decoder = new TextDecoder('utf-8')
    let accumulatedContent = ''

    while (true) {
      try {
        const { value, done } = await reader.read()
        if (done) break
        accumulatedContent += decoder.decode(value)
        await nextTick(() => {
          const updatedMessage = { ...assistantMessage, content: accumulatedContent }
          const lastIndex = currentMessages.value.length - 1
          currentMessages.value.splice(lastIndex, 1, updatedMessage)
        })
        await scrollToBottom()
      } catch (readError) {
        console.error('Stream read error:', readError)
        break
      }
    }
  } catch (error) {
    console.error('Failed to send message:', error)
    assistantMessage.content = 'Sorry, an error occurred. Please try again.'
  } finally {
    isStreaming.value = false
    selectedFiles.value = []
    if (fileInput.value) fileInput.value.value = ''
    await scrollToBottom()
  }
}

const loadChat = async (chatId) => {
  currentChatId.value = chatId
  try {
    const messages = await chatAPI.getChatMessages(chatId, 'chat')
    currentMessages.value = messages
  } catch (error) {
    console.error('Failed to load messages:', error)
    currentMessages.value = []
  }
}

const loadChatHistory = async () => {
  isLoadingHistory.value = true
  try {
    const history = await chatAPI.getChatHistory('chat')
    chatHistory.value = history || []
    if (history && history.length > 0) {
      await loadChat(history[0].id)
    } else {
      startNewChat()
    }
  } catch (error) {
    console.error('Failed to load chat history:', error)
    chatHistory.value = []
    startNewChat()
  } finally {
    isLoadingHistory.value = false
  }
}

const startNewChat = () => {
  const newChatId = Date.now().toString()
  currentChatId.value = newChatId
  currentMessages.value = []
  const newChat = { id: newChatId, title: `Chat ${newChatId.slice(-6)}` }
  chatHistory.value = [newChat, ...chatHistory.value]
}

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const removeFile = (index) => {
  selectedFiles.value = selectedFiles.value.filter((_, i) => i !== index)
  if (selectedFiles.value.length === 0 && fileInput.value) fileInput.value.value = ''
}

onMounted(() => {
  loadChatHistory()
  adjustTextareaHeight()
})
</script>

<style scoped lang="scss">
.ai-chat {
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
    border-radius: var(--sidebar-radius);
    box-shadow: var(--sidebar-shadow);
    border: 1px solid var(--border-light);

    .sidebar-header {
      flex-shrink: 0;
      padding: var(--space-5) var(--space-5) var(--space-3);
      display: flex;
      justify-content: space-between;
      align-items: center;

      h2 {
        font-size: var(--font-lg);
        font-weight: var(--font-semibold);
        color: var(--text-primary);
      }
    }

    .btn-new-chat {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-4);
      border-radius: var(--radius-lg);
      background: var(--color-primary);
      color: var(--text-inverse);
      border: none;
      font-size: var(--font-sm);
      font-weight: var(--font-medium);
      cursor: pointer;
      transition: all var(--transition-fast);
      white-space: nowrap;

      &:hover { background: var(--color-primary-hover); }
      &:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

      .icon { width: 18px; height: 18px; }
    }

    .history-list {
      flex: 1;
      overflow-y: auto;
      padding: 0 var(--space-3) var(--space-3);

      .history-item {
        width: 100%;
        display: flex;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-3) var(--space-3);
        border-radius: var(--radius-lg);
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
          background: var(--surface-active);
          color: var(--color-primary);

          .item-icon { color: var(--color-primary); }
        }

        .item-icon { width: 18px; height: 18px; color: var(--text-muted); flex-shrink: 0; }

        .item-title {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }

    .sidebar-empty {
      padding: var(--space-8) var(--space-4);
      text-align: center;
      color: var(--text-muted);
      font-size: var(--font-sm);
    }

    .sidebar-loading {
      padding: var(--space-3);

      .skeleton-item {
        height: 44px;
        border-radius: var(--radius-lg);
        background: var(--surface-hover);
        margin-bottom: var(--space-2);
        animation: skeletonPulse 1.5s ease-in-out infinite;
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

    .messages {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-8);
    }

    .input-area {
      flex-shrink: 0;
      padding: var(--space-4) var(--space-6) var(--space-6);
      background: var(--surface-card);
      border-top: 1px solid var(--border-light);

      .input-row {
        display: flex;
        gap: var(--space-3);
        align-items: flex-end;
        background: var(--input-bg);
        padding: var(--space-3);
        border-radius: var(--input-radius);
        border: 1px solid var(--input-border);
        box-shadow: var(--shadow-sm);
        transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

        &:focus-within {
          border-color: var(--input-border-focus);
          box-shadow: var(--input-shadow-focus);
        }
      }

      textarea {
        flex: 1;
        resize: none;
        border: none;
        background: transparent;
        padding: var(--space-2) var(--space-2);
        color: var(--text-primary);
        font-family: inherit;
        font-size: var(--font-sm);
        line-height: 1.5;
        max-height: 150px;

        &:focus { outline: none; }

        &::placeholder { color: var(--text-muted); }
      }

      .upload-btn {
        width: 38px;
        height: 38px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        border-radius: var(--radius-lg);
        background: var(--surface-hover);
        color: var(--text-secondary);
        cursor: pointer;
        transition: all var(--transition-fast);
        flex-shrink: 0;

        &:hover:not(:disabled) {
          background: var(--color-primary-light);
          color: var(--color-primary);
        }

        &:disabled { opacity: 0.4; cursor: not-allowed; }

        .btn-icon { width: 20px; height: 20px; }
      }

      .send-btn {
        width: 38px;
        height: 38px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        border-radius: var(--radius-lg);
        background: var(--color-primary);
        color: var(--text-inverse);
        cursor: pointer;
        transition: all var(--transition-fast);
        flex-shrink: 0;

        &:hover:not(:disabled) {
          background: var(--color-primary-hover);
          transform: scale(1.05);
        }

        &:disabled {
          background: var(--border-default);
          cursor: not-allowed;
        }

        .btn-icon { width: 20px; height: 20px; }
      }

      .hidden-input { display: none; }
    }
  }
}

/* File chips */
.selected-files {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  padding: 0 var(--space-1);

  .file-chip {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--surface-hover);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-lg);
    transition: all var(--transition-fast);

    &:hover { border-color: var(--color-primary); }

    .file-info {
      display: flex;
      align-items: center;
      gap: var(--space-2);

      .file-icon { width: 18px; height: 18px; color: var(--color-primary); flex-shrink: 0; }

      .file-details {
        display: flex;
        flex-direction: column;
        gap: 1px;

        .file-name { font-size: var(--font-xs); color: var(--text-primary); font-weight: var(--font-medium); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .file-size { font-size: 10px; color: var(--text-muted); }
      }
    }

    .remove-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border: none;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      border-radius: var(--radius-sm);
      transition: all var(--transition-fast);

      &:hover { background: var(--color-error); color: white; }

      .rm-icon { width: 16px; height: 16px; }
    }
  }
}

/* Empty state */
.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  color: var(--text-muted);
  padding: var(--space-16) var(--space-8);

  .empty-icon-wrapper {
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-2xl);
    background: var(--surface-hover);
    margin-bottom: var(--space-2);

    .empty-icon { width: 40px; height: 40px; color: var(--color-primary); }
  }

  h3 { font-size: var(--font-xl); color: var(--text-primary); font-weight: var(--font-semibold); }

  p { font-size: var(--font-sm); }

  .feature-hints {
    display: flex;
    gap: var(--space-2);
    margin-top: var(--space-2);

    .hint {
      padding: var(--space-1) var(--space-3);
      background: var(--surface-hover);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-full);
      font-size: var(--font-xs);
      color: var(--text-secondary);
      font-weight: var(--font-medium);
    }
  }
}

/* Streaming indicator */
.streaming-indicator {
  display: flex;
  gap: 4px;
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-6);

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-primary);
    animation: dotBounce 1.4s ease-in-out infinite;

    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }
}

/* Animations */
@keyframes skeletonPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@keyframes dotBounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

/* Responsive */
@media (max-width: 768px) {
  .ai-chat {
    .chat-container {
      padding: 0;
    }

    .sidebar {
      display: none;
    }

    .chat-main {
      border-radius: 0;
      border: none;

      .messages {
        padding: var(--space-4);
      }

      .input-area {
        padding: var(--space-3) var(--space-4) var(--space-4);
      }
    }
  }
}
</style>
