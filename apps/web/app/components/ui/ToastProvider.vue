<script setup lang="ts">
import { useI18n } from '../../composables/useI18n'
import { useToast } from '../../composables/useToast'
import { X } from '../../lib/icons'
import IconButton from './IconButton.vue'
const { toasts, remove } = useToast()
const { t } = useI18n()
const route = useRoute()
const hasMobileNavigation = computed(() => route.path === '/dashboard' || route.path === '/history')

function variantLabel(variant: string) {
  return (
    {
      success: t('toast.success'),
      error: t('toast.error'),
      info: t('toast.info'),
      warning: t('toast.warning'),
    }[variant] ?? 'Info'
  )
}
</script>

<template>
  <Teleport to="body">
    <div
      class="toast-region"
      :class="{ 'toast-region--with-nav': hasMobileNavigation }"
      role="region"
      aria-live="polite"
      :aria-label="t('toast.notifications')"
    >
      <TransitionGroup name="toast">
        <article
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          :class="`toast-${toast.variant}`"
          :role="toast.variant === 'error' ? 'alert' : 'status'"
        >
          <div class="toast-indicator" aria-hidden="true" />
          <div class="toast-copy">
            <span class="sr-only">{{ variantLabel(toast.variant) }}</span>
            <strong>{{ toast.title }}</strong>
            <p v-if="toast.description">{{ toast.description }}</p>
          </div>
          <IconButton
            class="toast-close"
            :label="t('common.close')"
            :icon="X"
            variant="secondary"
            size="sm"
            @click="remove(toast.id)"
          />
        </article>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-region {
  position: fixed;
  top: auto;
  right: var(--space-5);
  bottom: var(--space-5);
  z-index: 100;
  display: grid;
  gap: var(--space-3);
  width: min(380px, calc(100vw - 32px));
  pointer-events: none;
}

.toast {
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr) auto;
  gap: var(--space-3);
  align-items: center;
  min-width: 0;
  min-height: 68px;
  padding: var(--space-3) var(--space-3) var(--space-3) var(--space-4);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--glass-inset), var(--shadow-md);
  backdrop-filter: var(--glass-filter);
  pointer-events: auto;
}

.toast-indicator {
  width: 8px;
  height: 8px;
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
  font-size: 14px;
  font-weight: 650;
  line-height: 1.35;
}

.toast-copy p {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.toast-close {
  width: 36px;
  height: 36px;
  min-height: 36px;
  padding: 0;
  border-radius: var(--radius-full);
  justify-self: end;
}

.toast-success {
  color: var(--success);
}

.toast-error {
  color: var(--danger);
}

.toast-info {
  color: var(--info);
}

.toast-warning {
  color: var(--warning);
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity var(--transition-normal),
    transform var(--transition-normal);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

@media (max-width: 640px) {
  .toast-region {
    top: auto;
    right: var(--space-3);
    bottom: max(var(--space-3), env(safe-area-inset-bottom));
    left: var(--space-3);
    width: auto;
  }

  .toast-region--with-nav {
    bottom: calc(84px + env(safe-area-inset-bottom));
  }
}
</style>
