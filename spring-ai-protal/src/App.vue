<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { useDark, useToggle } from '@vueuse/core'
import { SunIcon, MoonIcon, SparklesIcon } from '@heroicons/vue/24/outline'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { ref } from 'vue'

const isDark = useDark()
const toggleDark = useToggle(isDark)
const router = useRouter()

const currentRoute = ref(router.currentRoute.value.path)

router.beforeEach((to, from, next) => {
  if (from.path === '/chat-pdf') {
    window.dispatchEvent(new CustomEvent('cleanupChatPDF'))
  }
  currentRoute.value = to.path
  next()
})
</script>

<template>
  <div class="app" :class="{ 'dark': isDark }">
    <a href="#main-content" class="sr-only skip-link">Skip to content</a>
    <nav class="navbar" role="navigation" aria-label="Main navigation">
      <router-link to="/" class="logo" aria-label="Nexus AI Hub Home">
        <SparklesIcon class="logo-icon" aria-hidden="true" />
        <span class="logo-text">Nexus AI Hub</span>
      </router-link>
      <div class="nav-actions">
        <button
          @click="toggleDark()"
          class="theme-toggle"
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        >
          <transition name="rotate" mode="out-in">
            <SunIcon v-if="isDark" key="sun" class="icon" aria-hidden="true" />
            <MoonIcon v-else key="moon" class="icon" aria-hidden="true" />
          </transition>
        </button>
      </div>
    </nav>
    <main id="main-content">
      <router-view v-slot="{ Component, route }">
        <transition :name="route.meta.transition || 'page-fade'" mode="out-in">
          <component :is="Component" :key="route.path" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<style lang="scss">
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--surface-page);
}

/* Skip link for accessibility */
.skip-link {
  &:focus {
    position: fixed;
    top: var(--space-4);
    left: var(--space-4);
    z-index: var(--z-toast);
    padding: var(--space-3) var(--space-6);
    background: var(--color-primary);
    color: var(--text-inverse);
    border-radius: var(--radius-md);
    text-decoration: none;
    font-weight: var(--font-medium);
  }
}

/* ── Navbar ─────────────────────────────────────────────── */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 var(--space-8);
  height: var(--navbar-height);
  background: var(--navbar-bg);
  backdrop-filter: blur(var(--navbar-blur));
  -webkit-backdrop-filter: blur(var(--navbar-blur));
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  border-bottom: 1px solid var(--navbar-border);
  transition: background var(--transition-base);

  .logo {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    text-decoration: none;
    color: inherit;
    transition: opacity var(--transition-fast);

    &:hover {
      opacity: 0.85;
    }

    .logo-icon {
      width: 28px;
      height: 28px;
      color: var(--color-primary);
    }

    .logo-text {
      font-size: var(--font-xl);
      font-weight: var(--font-bold);
      background: var(--navbar-logo-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  }

  .nav-actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .theme-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: var(--btn-ghost-bg);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-lg);
    cursor: pointer;
    color: var(--text-primary);
    transition: all var(--transition-fast);

    &:hover {
      background: var(--surface-hover);
      border-color: var(--border-default);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    .icon {
      width: 20px;
      height: 20px;
    }
  }
}

/* ── Page Transitions ──────────────────────────────────── */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity var(--transition-base), transform var(--transition-base);
}

.page-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.page-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Rotate transition for theme icon */
.rotate-enter-active,
.rotate-leave-active {
  transition: transform var(--transition-fast), opacity var(--transition-fast);
}

.rotate-enter-from {
  transform: rotate(-90deg);
  opacity: 0;
}

.rotate-leave-to {
  transform: rotate(90deg);
  opacity: 0;
}

/* ── Responsive ────────────────────────────────────────── */
@media (max-width: 768px) {
  .navbar {
    padding: 0 var(--space-4);

    .logo .logo-text {
      font-size: var(--font-lg);
    }
  }
}
</style>
