<template>
  <div class="pdf-view">
    <div class="pdf-header">
      <DocumentTextIcon class="header-icon" aria-hidden="true" />
      <span class="filename">{{ fileName }}</span>
    </div>
    <div class="pdf-content">
      <transition name="fade-loading">
        <div v-if="isLoading" class="pdf-loading">
          <div class="loading-spinner" aria-label="Loading"></div>
          <p class="loading-text">Loading PDF...</p>
        </div>
      </transition>
      <div class="pdf-container" ref="viewerRef"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { DocumentTextIcon } from '@heroicons/vue/24/outline'
import { useDark } from '@vueuse/core'

const isDark = useDark()
const props = defineProps({
  file: { type: [File, null], default: null },
  fileName: { type: String, default: '' }
})

const isLoading = ref(false)
const viewerRef = ref(null)
let instance = null

const createIframe = (file) => {
  const iframe = document.createElement('iframe')
  iframe.style.width = '100%'
  iframe.style.height = '100%'
  iframe.style.border = 'none'
  iframe.style.borderRadius = '0'

  const url = URL.createObjectURL(file)
  iframe.style.backgroundColor = isDark.value ? '#1a1a1a' : '#ffffff'
  iframe.src = url
  return { iframe, url }
}

const loadPdf = (file) => {
  if (instance?.url) URL.revokeObjectURL(instance.url)
  isLoading.value = true

  const { iframe, url } = createIframe(file)
  if (viewerRef.value) {
    viewerRef.value.innerHTML = ''
    viewerRef.value.appendChild(iframe)
  }
  iframe.onload = () => { isLoading.value = false }
  instance = { url, iframe }
}

onMounted(() => {
  if (viewerRef.value && props.file) loadPdf(props.file)
})

watch(() => props.file, (newFile) => {
  if (newFile) loadPdf(newFile)
})

watch(() => isDark.value, (dark) => {
  if (instance?.iframe) {
    instance.iframe.style.backgroundColor = dark ? '#1a1a1a' : '#ffffff'
  }
})

onUnmounted(() => {
  if (instance?.url) URL.revokeObjectURL(instance.url)
})
</script>

<style scoped lang="scss">
.pdf-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-light);
  background: var(--surface-card);
  min-width: 0;

  .pdf-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--border-light);
    background: var(--surface-card);

    .header-icon {
      width: 20px;
      height: 20px;
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .filename {
      flex: 1;
      font-size: var(--font-sm);
      font-weight: var(--font-medium);
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .pdf-content {
    flex: 1;
    position: relative;
    overflow: hidden;
    background: var(--surface-hover);

    .pdf-container {
      width: 100%;
      height: 100%;
    }

    .pdf-loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-4);
      background: var(--surface-card);
      padding: var(--space-8);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-lg);
      z-index: 2;

      .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid var(--border-default);
        border-left-color: var(--color-primary);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      .loading-text {
        font-size: var(--font-sm);
        color: var(--text-secondary);
        font-weight: var(--font-medium);
      }
    }
  }
}

.fade-loading-enter-active,
.fade-loading-leave-active { transition: opacity 0.25s ease; }
.fade-loading-enter-from,
.fade-loading-leave-to { opacity: 0; }

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 1024px) {
  .pdf-view {
    border-right: none;
    border-bottom: 1px solid var(--border-light);
    max-height: 50vh;
  }
}
</style>
