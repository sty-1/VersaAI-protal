<template>
  <div class="message" :class="{ 'message-user': isUser }">
    <div class="avatar" aria-hidden="true">
      <UserCircleIcon v-if="isUser" class="avatar-icon user-avatar" />
      <ComputerDesktopIcon v-else class="avatar-icon assistant-avatar" />
    </div>
    <div class="bubble-container">
      <div class="bubble" :class="{ 'bubble-user': isUser, 'bubble-assistant': !isUser }">
        <button
          v-if="isUser"
          class="copy-btn copy-btn-user"
          @click="copyContent"
          :title="copyButtonTitle"
          :aria-label="copyButtonTitle"
        >
          <CheckIcon v-if="copied" class="copy-icon copied" />
          <DocumentDuplicateIcon v-else class="copy-icon" />
        </button>
        <div class="text" ref="contentRef" v-if="isUser">
          {{ message.content }}
        </div>
        <div class="text markdown-content" ref="contentRef" v-else v-html="processedContent"></div>
        <div v-if="!isUser" class="bubble-footer">
          <button class="copy-btn" @click="copyContent" :title="copyButtonTitle" :aria-label="copyButtonTitle">
            <CheckIcon v-if="copied" class="copy-icon copied" />
            <DocumentDuplicateIcon v-else class="copy-icon" />
            <span class="copy-label">{{ copied ? 'Copied' : 'Copy' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, nextTick, ref, watch } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { UserCircleIcon, ComputerDesktopIcon, DocumentDuplicateIcon, CheckIcon } from '@heroicons/vue/24/outline'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'

const contentRef = ref(null)
const copied = ref(false)
const copyButtonTitle = computed(() => copied.value ? 'Copied' : 'Copy content')

marked.setOptions({
  breaks: true,
  gfm: true,
  sanitize: false
})

const processContent = (content) => {
  if (!content) return ''

  let result = ''
  let isInThinkBlock = false
  let currentBlock = ''

  for (let i = 0; i < content.length; i++) {
    if (content.slice(i, i + 7) === '<think>') {
      isInThinkBlock = true
      if (currentBlock) {
        result += marked.parse(currentBlock)
      }
      currentBlock = ''
      i += 6
      continue
    }

    if (content.slice(i, i + 8) === '</think>') {
      isInThinkBlock = false
      result += `<div class="think-block"><div class="think-badge">Thinking</div>${marked.parse(currentBlock)}</div>`
      currentBlock = ''
      i += 7
      continue
    }

    currentBlock += content[i]
  }

  if (currentBlock) {
    if (isInThinkBlock) {
      result += `<div class="think-block"><div class="think-badge">Thinking</div>${marked.parse(currentBlock)}</div>`
    } else {
      result += marked.parse(currentBlock)
    }
  }

  const cleanHtml = DOMPurify.sanitize(result, {
    ADD_TAGS: ['code', 'pre', 'span'],
    ADD_ATTR: ['class', 'language']
  })

  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = cleanHtml

  const preElements = tempDiv.querySelectorAll('pre')
  preElements.forEach(pre => {
    const code = pre.querySelector('code')
    if (code) {
      const lang = code.className.match(/language-(\w+)/)?.[1] || ''
      const wrapper = document.createElement('div')
      wrapper.className = 'code-block-wrapper'

      const header = document.createElement('div')
      header.className = 'code-header'
      header.innerHTML = `
        <span class="code-lang">${lang || 'code'}</span>
        <button class="code-copy-btn" title="Copy code" aria-label="Copy code">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      `

      const successMsg = document.createElement('span')
      successMsg.className = 'code-copy-success'
      successMsg.textContent = 'Copied!'

      header.appendChild(successMsg)
      wrapper.appendChild(header)
      wrapper.appendChild(pre.cloneNode(true))
      pre.parentNode.replaceChild(wrapper, pre)
    }
  })

  return tempDiv.innerHTML
}

const processedContent = computed(() => {
  if (!props.message.content) return ''
  return processContent(props.message.content)
})

const setupCodeBlockCopyButtons = () => {
  if (!contentRef.value) return

  const codeBlocks = contentRef.value.querySelectorAll('.code-block-wrapper')
  codeBlocks.forEach(block => {
    const copyButton = block.querySelector('.code-copy-btn')
    const codeElement = block.querySelector('code')
    const successMessage = block.querySelector('.code-copy-success')

    if (copyButton && codeElement) {
      const newCopyButton = copyButton.cloneNode(true)
      copyButton.parentNode.replaceChild(newCopyButton, copyButton)

      newCopyButton.addEventListener('click', async (e) => {
        e.preventDefault()
        e.stopPropagation()
        try {
          const code = codeElement.textContent || ''
          await navigator.clipboard.writeText(code)
          if (successMessage) {
            successMessage.classList.add('visible')
            setTimeout(() => successMessage.classList.remove('visible'), 2000)
          }
        } catch (err) {
          console.error('Failed to copy code:', err)
        }
      })
    }
  })
}

const highlightCode = async () => {
  await nextTick()
  if (contentRef.value) {
    contentRef.value.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block)
    })
    setupCodeBlockCopyButtons()
  }
}

const props = defineProps({
  message: {
    type: Object,
    required: true
  }
})

const isUser = computed(() => props.message.role === 'user')

const copyContent = async () => {
  try {
    let textToCopy = props.message.content
    if (!isUser.value && contentRef.value) {
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = processedContent.value
      textToCopy = tempDiv.textContent || tempDiv.innerText || ''
    }
    await navigator.clipboard.writeText(textToCopy)
    copied.value = true
    setTimeout(() => { copied.value = false }, 3000)
  } catch (err) {
    console.error('Copy failed:', err)
  }
}

watch(() => props.message.content, () => {
  if (!isUser.value) highlightCode()
})

onMounted(() => {
  if (!isUser.value) highlightCode()
})
</script>

<style scoped lang="scss">
.message {
  display: flex;
  margin-bottom: var(--space-6);
  gap: var(--space-3);
  animation: messageIn 0.35s ease-out both;

  &.message-user {
    flex-direction: row-reverse;
  }

  .avatar {
    flex-shrink: 0;
    width: 36px;
    height: 36px;

    .avatar-icon {
      width: 100%;
      height: 100%;
      padding: 6px;
      border-radius: var(--radius-lg);
      transition: all var(--transition-fast);

      &.user-avatar {
        color: var(--color-primary);
        background: var(--color-primary-light);
      }

      &.assistant-avatar {
        color: var(--text-secondary);
        background: var(--surface-hover);
      }
    }
  }

  .bubble-container {
    max-width: 80%;
  }

  .bubble {
    position: relative;
    padding: var(--space-3) var(--space-4);
    line-height: 1.65;
    font-size: var(--font-sm);

    .copy-btn-user {
      position: absolute;
      left: -32px;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0;
      transition: opacity var(--transition-fast);
      color: var(--text-muted);

      &:hover { color: var(--color-primary); }
    }

    &:hover .copy-btn-user {
      opacity: 1;
    }

    &.bubble-user {
      background: var(--chat-user-bg);
      color: var(--chat-user-text);
      border-radius: 16px 16px 4px 16px;
    }

    &.bubble-assistant {
      background: var(--chat-assistant-bg);
      color: var(--chat-assistant-text);
      border-radius: 16px 16px 16px 4px;
      border: 1px solid var(--border-light);

      .bubble-footer {
        display: flex;
        justify-content: flex-start;
        margin-top: var(--space-2);
        padding-top: var(--space-2);
        border-top: 1px solid var(--border-light);

        .copy-btn {
          display: inline-flex;
          align-items: center;
          gap: var(--space-1);
          background: transparent;
          border: none;
          font-size: var(--font-xs);
          color: var(--text-muted);
          padding: var(--space-1) var(--space-2);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all var(--transition-fast);

          &:hover {
            background: var(--surface-hover);
            color: var(--text-secondary);
          }

          .copy-icon {
            width: 14px;
            height: 14px;

            &.copied { color: var(--color-success); }
          }

          .copy-label {
            font-size: var(--font-xs);
          }
        }
      }
    }
  }

  .text {
    white-space: pre-wrap;
    word-break: break-word;

    :deep(.think-block) {
      position: relative;
      margin: var(--space-3) 0;
      padding: var(--space-4) var(--space-4) var(--space-4) var(--space-5);
      background: rgba(0, 0, 0, 0.02);
      border-left: 3px solid var(--border-default);
      border-radius: 0 var(--radius-md) var(--radius-md) 0;
      color: var(--text-muted);
      font-style: italic;
      font-size: 0.925em;
      animation: thinkSlideIn 0.3s ease-out;

      .think-badge {
        display: inline-block;
        padding: 2px 8px;
        font-size: 11px;
        font-weight: var(--font-medium);
        font-style: normal;
        background: var(--surface-hover);
        border-radius: var(--radius-full);
        color: var(--text-muted);
        margin-bottom: var(--space-2);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
    }

    :deep(.code-block-wrapper) {
      margin: var(--space-4) 0;
      border-radius: var(--radius-lg);
      overflow: hidden;
      border: 1px solid rgba(0, 0, 0, 0.08);
      background: #1e1e1e;

      .code-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--space-2) var(--space-3);
        background: rgba(255, 255, 255, 0.04);
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);

        .code-lang {
          font-size: 11px;
          font-weight: var(--font-medium);
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .code-copy-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.4);
          cursor: pointer;
          padding: 4px;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);

          &:hover {
            color: rgba(255, 255, 255, 0.8);
            background: rgba(255, 255, 255, 0.08);
          }
        }

        .code-copy-success {
          font-size: 11px;
          color: var(--color-success);
          opacity: 0;
          transform: translateY(-4px);
          transition: all var(--transition-fast);
          margin-left: var(--space-2);

          &.visible {
            opacity: 1;
            transform: translateY(0);
          }
        }
      }

      pre {
        margin: 0;
        padding: var(--space-4);
        overflow-x: auto;

        code {
          font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, monospace;
          font-size: 13px;
          line-height: 1.6;
          background: transparent;
          padding: 0;
        }
      }
    }

    :deep(pre) {
      background: #1e1e1e;
      padding: var(--space-4);
      border-radius: var(--radius-lg);
      overflow-x: auto;
      margin: var(--space-3) 0;

      code {
        background: transparent;
        padding: 0;
        color: #d4d4d4;
        font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
        font-size: 13px;
        line-height: 1.6;
      }
    }
  }

  .markdown-content {
    :deep(p) {
      margin: var(--space-2) 0;

      &:first-child { margin-top: 0; }
      &:last-child { margin-bottom: 0; }
    }

    :deep(ul), :deep(ol) {
      margin: var(--space-2) 0;
      padding-left: var(--space-6);
    }

    :deep(li) {
      margin: var(--space-1) 0;
    }

    :deep(code) {
      background: rgba(0, 0, 0, 0.06);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.9em;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
    }

    :deep(pre code) {
      background: transparent;
      padding: 0;
    }

    :deep(table) {
      border-collapse: collapse;
      margin: var(--space-3) 0;
      width: 100%;
      font-size: var(--font-sm);
    }

    :deep(th), :deep(td) {
      border: 1px solid var(--border-default);
      padding: var(--space-2) var(--space-3);
      text-align: left;
    }

    :deep(th) {
      background: var(--surface-hover);
      font-weight: var(--font-semibold);
    }

    :deep(blockquote) {
      margin: var(--space-3) 0;
      padding-left: var(--space-4);
      border-left: 3px solid var(--color-primary);
      color: var(--text-secondary);
    }
  }
}

/* Dark mode overrides */
.dark {
  .message .bubble.bubble-assistant {
    .bubble-footer .copy-btn:hover {
      background: var(--surface-hover);
    }
  }

  .text {
    :deep(.think-block) {
      background: rgba(255, 255, 255, 0.03);
      border-left-color: var(--border-strong);
    }

    :deep(.code-block-wrapper) {
      border-color: rgba(255, 255, 255, 0.06);
      background: #0d1117;
    }

    :deep(pre) {
      background: #0d1117;
    }
  }

  .markdown-content {
    :deep(code) {
      background: rgba(255, 255, 255, 0.1);
    }

    :deep(th), :deep(td) {
      border-color: var(--border-strong);
    }

    :deep(th) {
      background: rgba(255, 255, 255, 0.06);
    }

    :deep(blockquote) {
      border-left-color: var(--color-primary);
      color: var(--text-muted);
    }
  }
}

@keyframes messageIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes thinkSlideIn {
  from {
    opacity: 0;
    transform: translateX(-8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
