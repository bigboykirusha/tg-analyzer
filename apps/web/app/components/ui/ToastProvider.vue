<script setup lang="ts">
const { toasts, remove } = useToast()
const { t } = useI18n()

function variantLabel(variant: string) {
  return {
    success: t('toast.success'),
    error: t('toast.error'),
    info: t('toast.info'),
    warning: t('toast.warning'),
  }[variant] ?? 'Info'
}
</script>

<template>
  <Teleport to="body">
    <div class="toast-region" aria-live="polite" :aria-label="t('toast.notifications')">
      <TransitionGroup name="toast">
        <article
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          :class="`toast-${toast.variant}`"
          role="status"
        >
          <div class="toast-indicator" aria-hidden="true" />
          <div class="toast-copy">
            <span class="screen-reader">{{ variantLabel(toast.variant) }}</span>
            <strong>{{ toast.title }}</strong>
            <p v-if="toast.description">{{ toast.description }}</p>
          </div>
          <button class="toast-close" type="button" :aria-label="t('common.close')" @click="remove(toast.id)">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m7 7 10 10M17 7 7 17" />
            </svg>
          </button>
        </article>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-region {
  position: fixed;
  top: var(--space-5);
  right: var(--space-5);
  z-index: 100;
  display: grid;
  gap: var(--space-2);
  width: min(360px, calc(100vw - 32px));
  pointer-events: none;
}

.toast {
  display: grid;
  grid-template-columns: 4px minmax(0, 1fr) auto;
  gap: var(--space-3);
  align-items: start;
  min-width: 0;
  padding: var(--space-3);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--panel-translucent);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(14px);
  pointer-events: auto;
}

.toast-indicator {
  width: 4px;
  height: 100%;
  min-height: 36px;
  border-radius: var(--radius-full);
  background: currentColor;
}

.toast-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.toast-copy strong {
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
}

.toast-copy p {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.toast-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.toast-close:hover {
  background: var(--bg-overlay);
  color: var(--text-primary);
}

.toast-close svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-width: 1.8;
}

.toast-success {
  color: var(--color-success);
}

.toast-error {
  color: var(--color-danger);
}

.toast-info {
  color: var(--color-info);
}

.toast-warning {
  color: var(--color-warning);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity var(--transition-base), transform var(--transition-base);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (max-width: 640px) {
  .toast-region {
    top: auto;
    right: var(--space-3);
    bottom: var(--space-3);
    left: var(--space-3);
    width: auto;
  }
}
</style>
