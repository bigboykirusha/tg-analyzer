<script setup lang="ts">
definePageMeta({
  middleware: ['guest'],
})

const { t } = useI18n()
</script>

<template>
  <div class="redirect-screen">
    <div class="redirect-shell">
      <span class="redirect-mark">&lt;T&gt;</span>
      <div class="redirect-copy">
        <span class="text-label">tg analyzer</span>
        <span class="text-body-sm">{{ t('common.redirecting') }}</span>
      </div>
      <span class="redirect-line" aria-hidden="true" />
    </div>
  </div>
</template>

<style scoped>
.redirect-screen {
  display: flex;
  min-height: 100vh;
  min-height: 100dvh;
  align-items: center;
  justify-content: center;
  background: var(--bg-base);
  color: var(--text-secondary);
  padding: var(--space-6);
}

.redirect-shell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}

.redirect-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 18px;
  box-shadow: var(--shadow-sm);
}

.redirect-copy {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.redirect-line {
  width: 96px;
  height: 3px;
  border-radius: var(--radius-full);
  background: linear-gradient(90deg, transparent 0%, var(--accent) 50%, transparent 100%);
  opacity: 0.72;
}
</style>
