<template>
  <div class="customer-service">
    <div class="chat-container">
      <aside class="sidebar" aria-label="Inquiry history sidebar">
        <div class="sidebar-header">
          <h2>History</h2>
          <button class="btn-new-chat" @click="startNewChat" aria-label="Start new inquiry">
            <PlusIcon class="icon" aria-hidden="true" />
            <span>New Inquiry</span>
          </button>
        </div>
        <div class="history-list" v-if="!isLoadingHistory">
          <button
            v-for="chat in chatHistory"
            :key="chat.id"
            class="history-item"
            :class="{ 'active': currentChatId === chat.id }"
            @click="loadChat(chat.id)"
            :aria-label="`Open inquiry: ${chat.title}`"
          >
            <ChatBubbleLeftRightIcon class="item-icon" aria-hidden="true" />
            <span class="item-title">{{ chat.title || 'New Inquiry' }}</span>
          </button>
          <div v-if="chatHistory.length === 0" class="sidebar-empty">
            <p>No inquiries yet</p>
          </div>
        </div>
        <div v-else class="sidebar-loading">
          <div class="skeleton-item" v-for="i in 3" :key="i"></div>
        </div>
      </aside>

      <div class="chat-main">
        <div class="service-header">
          <div class="service-avatar">
            <ComputerDesktopIcon class="avatar-icon" aria-hidden="true" />
            <div class="status-dot" aria-hidden="true"></div>
          </div>
          <div class="service-info">
            <h3>Nex</h3>
            <p>Online · AI Concierge</p>
          </div>
        </div>

        <div class="messages" ref="messagesRef">
          <div v-if="currentMessages.length === 0 && !isStreaming" class="empty-state">
            <div class="empty-icon-wrapper">
              <ChatBubbleLeftRightIcon class="empty-icon" aria-hidden="true" />
            </div>
            <h3>AI Concierge</h3>
            <p>Ask me anything — I'm here to help, anytime</p>
          </div>
          <ChatMessage
            v-for="(message, index) in currentMessages"
            :key="index"
            :message="message"
            :is-stream="isStreaming && index === currentMessages.length - 1"
          />
          <div v-if="isStreaming && currentMessages[currentMessages.length - 1]?.content === ''" class="streaming-indicator">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          </div>
        </div>

        <div class="input-area">
          <textarea
            v-model="userInput"
            @keydown.enter.prevent="sendMessage()"
            placeholder="Type your question..."
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

    <!-- Booking modal -->
    <transition name="modal-fade">
      <div v-if="showBookingModal" class="booking-modal" @click.self="showBookingModal = false" role="dialog" aria-modal="true" aria-label="Booking details">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Booking Confirmed</h3>
            <button class="modal-close" @click="showBookingModal = false" aria-label="Close">&times;</button>
          </div>
          <div class="modal-body" v-html="bookingInfo"></div>
          <div class="modal-footer">
            <button class="btn-confirm" @click="showBookingModal = false">Confirm</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  PlusIcon,
  ComputerDesktopIcon
} from '@heroicons/vue/24/outline'
import ChatMessage from '../components/ChatMessage.vue'
import { chatAPI } from '../services/api'

const messagesRef = ref(null)
const inputRef = ref(null)
const userInput = ref('')
const isStreaming = ref(false)
const isLoadingHistory = ref(false)
const currentChatId = ref(null)
const currentMessages = ref([])
const chatHistory = ref([])
const showBookingModal = ref(false)
const bookingInfo = ref('')

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
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

const sendMessage = async (content) => {
  if (isStreaming.value || (!content && !userInput.value.trim())) return

  const messageContent = content || userInput.value.trim()

  currentMessages.value.push({
    role: 'user',
    content: messageContent,
    timestamp: new Date()
  })

  if (!content) { userInput.value = ''; adjustTextareaHeight() }
  await scrollToBottom()

  const assistantMessage = { role: 'assistant', content: '', timestamp: new Date(), isMarkdown: true }
  currentMessages.value.push(assistantMessage)
  isStreaming.value = true

  let accumulatedContent = ''

  try {
    const reader = await chatAPI.sendServiceMessage(messageContent, currentChatId.value)
    const decoder = new TextDecoder('utf-8')

    while (true) {
      try {
        const { value, done } = await reader.read()
        if (done) break
        accumulatedContent += decoder.decode(value)

        await nextTick(() => {
          const updatedMessage = { ...assistantMessage, content: accumulatedContent, isMarkdown: true }
          const lastIndex = currentMessages.value.length - 1
          currentMessages.value.splice(lastIndex, 1, updatedMessage)
        })
        await scrollToBottom()
      } catch (readError) {
        console.error('Stream read error:', readError)
        break
      }
    }

    if (accumulatedContent.includes('预约编号') || accumulatedContent.includes('Booking #')) {
      const bookingMatch = accumulatedContent.match(/【(.*?)】/s)
      if (bookingMatch) {
        bookingInfo.value = DOMPurify.sanitize(marked.parse(bookingMatch[1]), {
          ADD_TAGS: ['code', 'pre', 'span'],
          ADD_ATTR: ['class', 'language']
        })
        showBookingModal.value = true
      }
    }
  } catch (error) {
    console.error('Failed to send message:', error)
    assistantMessage.content = 'Sorry, an error occurred. Please try again.'
  } finally {
    isStreaming.value = false
    await scrollToBottom()
  }
}

const loadChat = async (chatId) => {
  currentChatId.value = chatId
  try {
    const messages = await chatAPI.getChatMessages(chatId, 'service')
    currentMessages.value = messages.map(msg => ({
      ...msg,
      isMarkdown: msg.role === 'assistant'
    }))
  } catch (error) {
    console.error('Failed to load messages:', error)
    currentMessages.value = []
  }
}

const loadChatHistory = async () => {
  isLoadingHistory.value = true
  try {
    const history = await chatAPI.getChatHistory('service')
    chatHistory.value = history || []
    if (history && history.length > 0) {
      await loadChat(history[0].id)
    } else {
      await startNewChat()
    }
  } catch (error) {
    console.error('Failed to load chat history:', error)
    chatHistory.value = []
    await startNewChat()
  } finally {
    isLoadingHistory.value = false
  }
}

const startNewChat = async () => {
  const newChatId = Date.now().toString()
  currentChatId.value = newChatId
  currentMessages.value = []
  const newChat = { id: newChatId, title: `Inquiry ${newChatId.slice(-6)}` }
  chatHistory.value = [newChat, ...chatHistory.value]
  await sendMessage('Hello')
}

onMounted(() => {
  loadChatHistory()
  adjustTextareaHeight()
})
</script>

<style scoped lang="scss">
.customer-service {
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

      h2 { font-size: var(--font-lg); font-weight: var(--font-semibold); color: var(--text-primary); }
    }

    .btn-new-chat {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-4);
      border-radius: var(--radius-lg);
      background: var(--text-primary);
      color: var(--surface-page);
      border: none;
      font-size: var(--font-sm);
      font-weight: var(--font-medium);
      cursor: pointer;
      transition: all var(--transition-fast);
      white-space: nowrap;

      &:hover { opacity: 0.85; }
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
        padding: var(--space-3);
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
        .item-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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

    .service-header {
      flex-shrink: 0;
      padding: var(--space-4) var(--space-6);
      border-bottom: 1px solid var(--border-light);
      display: flex;
      align-items: center;
      gap: var(--space-4);

      .service-avatar {
        position: relative;

        .avatar-icon {
          width: 48px;
          height: 48px;
          padding: 8px;
          color: var(--text-primary);
          background: var(--surface-hover);
          border-radius: var(--radius-xl);
        }

        .status-dot {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 12px;
          height: 12px;
          background: var(--color-success);
          border: 2px solid var(--surface-card);
          border-radius: 50%;
          animation: statusPulse 2s ease-in-out infinite;
        }
      }

      .service-info {
        h3 { font-size: var(--font-lg); font-weight: var(--font-semibold); color: var(--text-primary); }
        p { font-size: var(--font-sm); color: var(--text-secondary); }
      }
    }

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
          border-color: var(--input-border-focus);
          box-shadow: var(--input-shadow-focus);
        }

        &::placeholder { color: var(--text-muted); }
      }

      .send-btn {
        width: 42px;
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        border-radius: var(--radius-lg);
        background: var(--text-primary);
        color: var(--surface-page);
        cursor: pointer;
        transition: all var(--transition-fast);
        flex-shrink: 0;

        &:hover:not(:disabled) { opacity: 0.85; transform: scale(1.05); }
        &:disabled { background: var(--border-default); cursor: not-allowed; }
        .btn-icon { width: 20px; height: 20px; }
      }
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

  .empty-icon-wrapper {
    width: 72px;
    height: 72px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-2xl);
    background: var(--surface-hover);
    .empty-icon { width: 36px; height: 36px; color: var(--color-primary); }
  }

  h3 { font-size: var(--font-xl); color: var(--text-primary); font-weight: var(--font-semibold); }
  p { font-size: var(--font-sm); }
}

/* Streaming indicator */
.streaming-indicator {
  display: flex;
  gap: 4px;
  padding: var(--space-3) var(--space-4);
  .dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--color-primary);
    animation: dotBounce 1.4s ease-in-out infinite;
    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }
}

/* Booking modal */
.booking-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);

  .modal-content {
    background: var(--surface-card);
    border-radius: var(--radius-2xl);
    max-width: 480px;
    width: 90%;
    box-shadow: var(--shadow-xl);
    animation: modalIn 0.3s ease-out;

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-5) var(--space-6);
      border-bottom: 1px solid var(--border-light);

      h3 { font-size: var(--font-xl); font-weight: var(--font-semibold); color: var(--text-primary); }
      .modal-close {
        background: none; border: none;
        font-size: 24px; color: var(--text-muted);
        cursor: pointer; padding: var(--space-1);
        border-radius: var(--radius-sm);
        transition: color var(--transition-fast);
        &:hover { color: var(--text-primary); }
      }
    }

    .modal-body {
      padding: var(--space-6);
      line-height: 1.7;
      color: var(--text-secondary);

      :deep(table) {
        width: 100%;
        border-collapse: collapse;
        margin: var(--space-3) 0;
        th, td {
          padding: var(--space-2) var(--space-3);
          border: 1px solid var(--border-default);
          text-align: left;
        }
        th { background: var(--surface-hover); font-weight: var(--font-semibold); }
      }
    }

    .modal-footer {
      padding: var(--space-4) var(--space-6);
      border-top: 1px solid var(--border-light);
      display: flex;
      justify-content: flex-end;

      .btn-confirm {
        padding: var(--space-2) var(--space-8);
        background: var(--color-primary);
        color: var(--text-inverse);
        border: none;
        border-radius: var(--radius-lg);
        font-size: var(--font-sm);
        font-weight: var(--font-medium);
        cursor: pointer;
        transition: all var(--transition-fast);
        &:hover { background: var(--color-primary-hover); }
      }
    }
  }
}

.modal-fade-enter-active { transition: opacity 0.3s ease; }
.modal-fade-enter-from,
.modal-fade-leave-to { opacity: 0; }

@keyframes modalIn {
  from { opacity: 0; transform: scale(0.95) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes skeletonPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@keyframes dotBounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

@keyframes statusPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(82, 196, 26, 0.4); }
  50% { box-shadow: 0 0 0 6px rgba(82, 196, 26, 0); }
}

@media (max-width: 768px) {
  .customer-service {
    .chat-container { padding: 0; }
    .sidebar { display: none; }
    .chat-main { border-radius: 0; border: none;
      .messages { padding: var(--space-4); }
      .input-area { padding: var(--space-3); }
    }
  }
}
</style>
