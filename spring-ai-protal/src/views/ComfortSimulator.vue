<template>
  <div class="comfort-simulator">
    <div class="redirect-card">
      <HeartIcon class="redirect-icon" aria-hidden="true" />
      <h2>Persuasion Lab</h2>
      <p>This feature has moved to the new experience</p>
      <router-link to="/game" class="redirect-btn">
        Launch
        <svg class="arrow" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
        </svg>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { HeartIcon } from '@heroicons/vue/24/outline'
</script>

<style scoped lang="scss">
.comfort-simulator {
  min-height: calc(100vh - var(--navbar-height));
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-page);
  padding: var(--space-8);

  .redirect-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-12) var(--space-16);
    background: var(--surface-card);
    border-radius: var(--radius-2xl);
    box-shadow: var(--shadow-md);
    border: 1px solid var(--border-light);
    text-align: center;

    .redirect-icon {
      width: 56px;
      height: 56px;
      color: var(--color-error);
      animation: heartPulse 2s ease-in-out infinite;
    }

    h2 {
      font-size: var(--font-2xl);
      color: var(--text-primary);
    }

    p {
      color: var(--text-secondary);
      font-size: var(--font-sm);
    }

    .redirect-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      margin-top: var(--space-2);
      padding: var(--space-3) var(--space-8);
      background: var(--gradient-brand);
      color: var(--text-inverse);
      border-radius: var(--radius-lg);
      text-decoration: none;
      font-weight: var(--font-semibold);
      transition: all var(--transition-base);

      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-glow-blue);
      }

      .arrow { width: 18px; height: 18px; transition: transform var(--transition-fast); }
      &:hover .arrow { transform: translateX(2px); }
    }
  }
}

@keyframes heartPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}
</style>
