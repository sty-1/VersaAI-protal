<template>
  <div class="manus-root">
    <div class="chat-container">
      <aside class="sidebar" aria-label="Task history sidebar">
        <div class="sidebar-header">
          <h2>History</h2>
          <button class="btn-new-chat" @click="startNewTask" aria-label="Start new task">
            <PlusIcon class="icon" aria-hidden="true" />
            <span>New Task</span>
          </button>
        </div>
        <div class="history-list" v-if="!isLoadingHistory">
          <button
            v-for="chat in chatHistory"
            :key="chat.id"
            class="history-item"
            :class="{ 'active': currentChatId === chat.id }"
            @click="loadChat(chat.id)"
            :aria-label="`Open task: ${chat.title}`"
            :aria-current="currentChatId === chat.id ? 'true' : undefined"
          >
            <SparklesIcon class="item-icon" aria-hidden="true" />
            <span class="item-title">{{ chat.title || 'New Task' }}</span>
          </button>
          <div v-if="chatHistory.length === 0" class="sidebar-empty">
            <p>No task history yet</p>
          </div>
        </div>
        <div v-else class="sidebar-loading">
          <div class="skeleton-item" v-for="i in 4" :key="i"></div>
        </div>
      </aside>

      <div class="chat-main">
        <div class="messages" ref="messagesRef">
          <div v-if="timeline.length === 0 && !isRunning" class="empty-state">
            <div class="empty-icon-wrapper">
              <SparklesIcon class="empty-icon" aria-hidden="true" />
            </div>
            <h3>SuperManus</h3>
            <p>Your all-capable AI agent — describe any task and watch it execute autonomously</p>
            <div class="feature-hints">
              <span class="hint">Web Search</span>
              <span class="hint">File Ops</span>
              <span class="hint">Scraping</span>
              <span class="hint">Downloads</span>
            </div>
          </div>

          <template v-for="(item, index) in timeline" :key="index">
            <ChatMessage v-if="item.role === 'user'" :message="item" />

            <div v-else-if="item.type === 'thinking'" class="thinking-row">
              <div class="thinking-avatar">
                <SparklesIcon class="avatar-icon" aria-hidden="true" />
              </div>
              <div class="thinking-bubble">
                <span>Analyzing</span>
                <span class="dots"><span>.</span><span>.</span><span>.</span></span>
              </div>
            </div>

            <div v-else-if="item.type === 'tool_call'" class="tool-card tool-call-card">
              <div class="tool-card-header">
                <WrenchScrewdriverIcon class="tool-icon call-icon" aria-hidden="true" />
                <span class="tool-action">Calling</span>
                <code class="tool-name">{{ item.tool }}</code>
              </div>
              <div class="tool-card-body" v-if="item.args && item.args !== '{}'">
                <pre class="tool-args">{{ formatArgs(item.args) }}</pre>
              </div>
            </div>

            <div v-else-if="item.type === 'tool_result'" class="tool-card tool-result-card">
              <div class="tool-card-header">
                <CheckCircleIcon class="tool-icon result-icon" aria-hidden="true" />
                <span class="tool-action">Completed</span>
              </div>
              <div class="tool-card-body">
                <div class="result-content" v-html="renderMd(item.content)"></div>
                <div v-if="item.files && item.files.length > 0" class="file-downloads">
                  <button
                    v-for="file in item.files"
                    :key="file.path"
                    class="file-download-btn"
                    @click="downloadFile(file)"
                    :title="'Download ' + file.name"
                  >
                    <ArrowDownTrayIcon class="dl-icon" aria-hidden="true" />
                    <span class="dl-name">{{ file.name }}</span>
                    <span class="dl-hint">Click to download</span>
                  </button>
                </div>
              </div>
            </div>

            <ChatMessage v-else-if="item.type === 'done'" :message="{ role: 'assistant', content: item.content, timestamp: new Date() }" />

            <div v-else-if="item.type === 'error'" class="tool-card tool-error-card">
              <div class="tool-card-header">
                <ExclamationCircleIcon class="tool-icon error-icon" aria-hidden="true" />
                <span class="tool-action">Error</span>
              </div>
              <div class="tool-card-body"><p>{{ item.content }}</p></div>
            </div>
          </template>
        </div>

        <div class="input-area">
          <div class="input-row">
            <textarea ref="inputRef" v-model="userInput" class="task-input"
              placeholder="Describe what you want SuperManus to do..."
              rows="1" @keydown.ctrl.enter="startTask" @input="adjustInputHeight"
              :disabled="isRunning" aria-label="Task description"></textarea>
            <button class="send-btn" @click="isRunning ? stopTask() : startTask()"
              :disabled="!isRunning && !userInput.trim()"
              :aria-label="isRunning ? 'Stop' : 'Send'" :class="{ 'is-stop': isRunning }">
              <StopIcon v-if="isRunning" class="btn-icon" aria-hidden="true" />
              <PaperAirplaneIcon v-else class="btn-icon" aria-hidden="true" />
            </button>
          </div>
          <p class="input-hint">{{ isRunning ? 'SuperManus is working...' : 'Ctrl + Enter to send' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import {
  SparklesIcon, PaperAirplaneIcon, StopIcon, PlusIcon,
  WrenchScrewdriverIcon, CheckCircleIcon, ExclamationCircleIcon, ArrowDownTrayIcon
} from '@heroicons/vue/24/outline'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import ChatMessage from '../components/ChatMessage.vue'
import { chatAPI } from '../services/api'

const BASE_URL = 'http://localhost:8080'
const TMP_DIR = 'tmp'
const userInput = ref('')
const timeline = ref([])
const isRunning = ref(false)
const isLoadingHistory = ref(false)
const inputRef = ref(null)
const messagesRef = ref(null)
const currentChatId = ref(null)
const chatHistory = ref([])
let abortController = null

const renderMd = (text) => {
  if (!text) return ''
  return DOMPurify.sanitize(marked.parse(text))
}

const formatArgs = (args) => {
  try { return JSON.stringify(JSON.parse(args), null, 2) }
  catch { return args }
}

const adjustInputHeight = () => {
  const el = inputRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
}

const scrollToBottom = async () => {
  await nextTick()
  if (messagesRef.value) messagesRef.value.scrollTop = messagesRef.value.scrollHeight
}

// ── SSE event processing ──────────────────────────────────
const handleEvent = (evt) => {
  console.log('[SuperManus] SSE event:', evt.type, evt)
  switch (evt.type) {
    case 'thinking':
      timeline.value.push({ role: 'assistant', type: 'thinking' })
      break
    case 'tool_call': {
      let tool = '', args = ''
      try { const p = typeof evt.content === 'string' ? JSON.parse(evt.content) : evt.content; tool = p.tool || ''; args = p.args || '' }
      catch { tool = evt.content || '' }
      removeLastThinking()
      timeline.value.push({ role: 'assistant', type: 'tool_call', tool, args })
      break
    }
    case 'tool_result':
      removeLastThinking()
      timeline.value.push({
        role: 'assistant', type: 'tool_result',
        content: evt.content || '',
        files: extractFiles(evt.content || '')
      })
      break
    case 'done':
      removeLastThinking()
      timeline.value.push({ role: 'assistant', type: 'done', content: evt.content || '' })
      break
    case 'error':
      removeLastThinking()
      timeline.value.push({ role: 'assistant', type: 'error', content: evt.content || 'Unknown error' })
      break
  }
}

const removeLastThinking = () => {
  const len = timeline.value.length
  if (len > 0 && timeline.value[len - 1].type === 'thinking') timeline.value.pop()
}

// ── File path extraction ─────────────────────────────────
const extractFiles = (text) => {
  if (!text) return []
  const files = []
  const s = text.replace(/\\+/g, '/')
  for (const prefix of [TMP_DIR + '/file/', TMP_DIR + '/download/']) {
    let pos = 0
    while ((pos = s.indexOf(prefix, pos)) !== -1) {
      let end = pos + prefix.length
      while (end < s.length) {
        const ch = s[end]
        if (ch === ' ' || ch === ',' || ch === ';' || ch === ':' || ch === '"' || ch === "'" ||
            ch === '<' || ch === '>' || ch === '{' || ch === '}' || ch === '[' || ch === ']' ||
            ch === '(' || ch === ')' || ch === '\n' || ch === '\r') break
        end++
      }
      const full = s.substring(pos, end)
      const dot = full.lastIndexOf('.')
      if (dot > prefix.length && dot < full.length - 1) {
        const rel = full.substring(TMP_DIR.length + 1)
        const name = rel.split('/').pop()
        if (!files.find(f => f.path === rel)) {
          files.push({ path: rel, name })
          console.log('[SuperManus] Found file:', rel)
        }
      }
      pos = end
    }
  }
  return files
}

const downloadFile = (file) => {
  const url = BASE_URL + '/ai/manus/file/download?path=' + encodeURIComponent(file.path)
  console.log('[SuperManus] Download:', url)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

// ── History management ───────────────────────────────────
const loadChat = async (chatId) => {
  currentChatId.value = chatId
  timeline.value = []
  try {
    const messages = await chatAPI.getChatMessages(chatId, 'manus')
    if (messages && messages.length > 0) {
      timeline.value = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => {
          if (m.role === 'user') {
            return { role: 'user', content: m.content, timestamp: new Date() }
          }
          return { role: 'assistant', type: 'done', content: m.content }
        })
    }
    await scrollToBottom()
  } catch (error) {
    console.error('Failed to load messages:', error)
    timeline.value = []
  }
}

const loadChatHistory = async () => {
  isLoadingHistory.value = true
  try {
    const history = await chatAPI.getChatHistory('manus')
    chatHistory.value = history || []
    if (history && history.length > 0) {
      await loadChat(history[0].id)
    } else {
      startNewTask()
    }
  } catch (error) {
    console.error('Failed to load chat history:', error)
    chatHistory.value = []
    startNewTask()
  } finally {
    isLoadingHistory.value = false
  }
}

const startNewTask = () => {
  const newChatId = Date.now().toString()
  currentChatId.value = newChatId
  timeline.value = []
  const newChat = { id: newChatId, title: `Task ${newChatId.slice(-6)}` }
  chatHistory.value = [newChat, ...chatHistory.value]
}

// ── Start / Stop task ────────────────────────────────────
const startTask = async () => {
  const prompt = userInput.value.trim()
  if (!prompt || isRunning.value) return
  timeline.value.push({ role: 'user', content: prompt, timestamp: new Date() })
  userInput.value = ''; adjustInputHeight(); await scrollToBottom()
  isRunning.value = true; abortController = new AbortController()

  try {
    const reader = await chatAPI.sendManusMessage(prompt, currentChatId.value)
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    while (true) {
      const { value, done } = await reader.read()
      if (done) { if (buffer.trim()) parseChunk(buffer); break }
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n'); buffer = parts.pop()
      parts.forEach(parseChunk)
    }
  } catch (e) {
    if (e.name !== 'AbortError') {
      console.error('[SuperManus] Error:', e)
      timeline.value.push({ role: 'assistant', type: 'error', content: e.message || 'Failed' })
    }
  } finally { isRunning.value = false; await scrollToBottom() }
}

const parseChunk = (text) => {
  text.split(/\r?\n/).forEach(line => {
    if (!line.startsWith('data:')) return
    try { handleEvent(JSON.parse(line.substring(5).trim())) }
    catch (e) { console.warn('[SuperManus] Bad JSON:', line, e) }
  })
}

const stopTask = () => { if (abortController) { abortController.abort(); abortController = null } }

onMounted(() => {
  loadChatHistory()
  adjustInputHeight()
})
onUnmounted(() => { if (abortController) abortController.abort() })
</script>

<style scoped lang="scss">
.manus-root {
  position: fixed; top: var(--navbar-height); left: 0; right: 0; bottom: 0;
  background: var(--surface-page); display: flex; flex-direction: column;
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
      background: hsl(30, 90%, 50%);
      color: #fff;
      border: none;
      font-size: var(--font-sm);
      font-weight: var(--font-medium);
      cursor: pointer;
      transition: all var(--transition-fast);
      white-space: nowrap;

      &:hover { background: hsl(20, 90%, 48%); }
      &:focus-visible { outline: 2px solid hsl(30, 90%, 50%); outline-offset: 2px; }

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
    min-width: 0;
  }
}

.messages {
  flex: 1; overflow-y: auto; padding: var(--space-8); scroll-behavior: smooth;
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: var(--card-border); border-radius: 3px; }
}

.empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 100%; text-align: center; padding: var(--space-8);
  .empty-icon-wrapper { width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; background: hsl(30, 80%, 92%); border-radius: var(--radius-2xl); margin-bottom: var(--space-5); }
  .empty-icon { width: 40px; height: 40px; color: hsl(30, 90%, 50%); }
  h3 { font-size: var(--font-2xl); font-weight: var(--font-bold); color: var(--text-primary); margin-bottom: var(--space-2); }
  p { font-size: var(--font-sm); color: var(--text-secondary); max-width: 420px; line-height: 1.6; margin-bottom: var(--space-5); }
}
.dark .empty-icon-wrapper { background: rgba(249, 115, 22, 0.15); }
.feature-hints { display: flex; flex-wrap: wrap; gap: var(--space-2); justify-content: center;
  .hint { font-size: var(--font-xs); padding: var(--space-1) var(--space-3); border-radius: var(--radius-full); background: var(--card-bg); border: 1px solid var(--card-border); color: var(--text-secondary); }
}
.thinking-row { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) 0; animation: fadeInUp 0.3s ease-out; }
.thinking-avatar { width: 34px; height: 34px; border-radius: var(--radius-lg); background: hsl(30, 80%, 92%); display: flex; align-items: center; justify-content: center; flex-shrink: 0; .avatar-icon { width: 18px; height: 18px; color: hsl(30, 90%, 50%); } }
.dark .thinking-avatar { background: rgba(249, 115, 22, 0.15); }
.thinking-bubble { display: flex; align-items: center; gap: var(--space-1); padding: var(--space-2) var(--space-4); background: var(--card-bg); border: 1px solid var(--card-border); border-radius: var(--radius-lg); font-size: var(--font-sm); color: var(--text-muted); .dots span { animation: dotBlink 1.4s ease-in-out infinite; &:nth-child(2) { animation-delay: 0.2s; } &:nth-child(3) { animation-delay: 0.4s; } } }
@keyframes dotBlink { 0%,80%,100%{opacity:.2} 40%{opacity:1} }
.tool-card { margin: var(--space-2) 0 var(--space-2) 44px; border-radius: var(--radius-lg); border: 1px solid var(--card-border); background: var(--card-bg); overflow: hidden; animation: fadeInUp 0.35s ease-out;
  .tool-card-header { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-4); font-size: var(--font-xs); font-weight: var(--font-semibold); }
  .tool-icon { width: 16px; height: 16px; flex-shrink: 0; }
  .tool-action { text-transform: uppercase; letter-spacing: 0.05em; }
  .tool-name { font-size: var(--font-xs); padding: 1px 8px; border-radius: var(--radius-sm); background: var(--surface-page); color: var(--color-primary); }
  .tool-card-body { padding: var(--space-2) var(--space-4) var(--space-3); border-top: 1px solid var(--card-border); font-size: var(--font-sm); color: var(--text-secondary); line-height: 1.6; }
  .tool-args { font-size: var(--font-xs); color: var(--text-muted); white-space: pre-wrap; word-break: break-all; margin: 0; font-family: 'SF Mono','Fira Code',monospace; }
  .result-content { :deep(p) { margin-bottom: var(--space-1); } :deep(code) { background: var(--surface-page); padding: 1px 6px; border-radius: 3px; font-size: .9em; } :deep(pre) { background: var(--surface-page); padding: var(--space-2); border-radius: var(--radius-sm); overflow-x: auto; } }
  .file-downloads { margin-top: var(--space-3); display: flex; flex-wrap: wrap; gap: var(--space-2); }
  .file-download-btn { display: inline-flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); background: var(--color-primary-light); border: 1px solid rgba(0,124,240,.2); border-radius: var(--radius-md); color: var(--color-primary); font-size: var(--font-xs); font-family: inherit; cursor: pointer; transition: all var(--transition-base);
    .dl-icon { width: 16px; height: 16px; flex-shrink: 0; } .dl-name { font-weight: var(--font-semibold); } .dl-hint { color: var(--text-muted); font-size: var(--font-xs); }
    &:hover { background: var(--color-primary); color: #fff; border-color: var(--color-primary); transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,124,240,.25); .dl-hint { color: rgba(255,255,255,.7); } }
  }
}
.dark .file-download-btn { background: rgba(0,124,240,.15); }
.tool-call-card { border-left: 3px solid hsl(30, 90%, 50%); .call-icon { color: hsl(30, 90%, 50%); } }
.tool-result-card { border-left: 3px solid var(--color-success); .result-icon { color: var(--color-success); } }
.tool-error-card { border-left: 3px solid var(--color-error); .error-icon { color: var(--color-error); } }
.input-area { flex-shrink: 0; padding: var(--space-4) var(--space-6) var(--space-5); border-top: 1px solid var(--card-border); background: var(--surface-card);
  .input-row { display: flex; gap: var(--space-3); align-items: flex-end; }
  .task-input { flex: 1; padding: var(--space-3) var(--space-4); border: 1px solid var(--card-border); border-radius: var(--radius-xl); background: var(--card-bg); color: var(--text-primary); font-size: var(--font-sm); font-family: inherit; line-height: 1.6; resize: none; outline: none; max-height: 160px; transition: border-color var(--transition-base); &:focus { border-color: hsl(30, 90%, 50%); } &::placeholder { color: var(--text-muted); } &:disabled { opacity: 0.5; cursor: not-allowed; } }
  .send-btn { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border: none; border-radius: var(--radius-xl); background: linear-gradient(135deg, hsl(30, 95%, 55%), hsl(20, 90%, 48%)); color: #fff; cursor: pointer; flex-shrink: 0; transition: all var(--transition-base); .btn-icon { width: 20px; height: 20px; } &:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(249, 115, 22, 0.35); } &:disabled { opacity: 0.4; cursor: not-allowed; } &.is-stop { background: var(--color-error); animation: pulseStop 2s ease-in-out infinite; } }
  .input-hint { font-size: var(--font-xs); color: var(--text-muted); text-align: center; margin-top: var(--space-2); }
}
@keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pulseStop { 0%,100%{box-shadow:0 0 0 0 rgba(255,77,79,.4)} 50%{box-shadow:0 0 0 8px rgba(255,77,79,0)} }
@keyframes skeletonPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
@media (max-width: 768px) {
  .chat-container { padding: 0; }
  .sidebar { display: none; }
  .chat-main { border-radius: 0; border: none; }
  .messages { padding: var(--space-4); }
  .input-area { padding: var(--space-3) var(--space-4) var(--space-4); }
  .tool-card { margin-left: 0; }
  .empty-state { padding: var(--space-6) var(--space-4); }
}
</style>
