<script setup lang="ts">
import { useI18n } from '../../composables/useI18n'
import { useToast, type ToastMessage, type ToastVariant } from '../../composables/useToast'
import { AlertTriangle, CircleCheck, CircleX, Info, X } from '../../lib/icons'

const { toasts, remove, pause, resume } = useToast()
const { t } = useI18n()

function variantLabel(variant: ToastVariant) {
  return {
    success: t('toast.success'),
    error: t('toast.error'),
    info: t('toast.info'),
    warning: t('toast.warning'),
  }[variant]
}

const variantIcon = { success: CircleCheck, error: CircleX, info: Info, warning: AlertTriangle }

function runAction(toast: ToastMessage) {
  toast.action?.onClick()
  remove(toast.id)
}
</script>

<template>
  <Teleport to="#teleports">
    <div class="toast-region" role="region" aria-live="polite" :aria-label="t('toast.notifications')">
      <TransitionGroup name="toast">
        <article
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          :class="`toast--${toast.variant}`"
          :role="toast.variant === 'error' ? 'alert' : 'status'"
          @pointerenter="pause(toast.id)"
          @pointerleave="resume(toast.id)"
          @focusin="pause(toast.id)"
          @focusout="resume(toast.id)"
        >
          <component :is="variantIcon[toast.variant]" class="toast__icon" aria-hidden="true" />
          <div class="toast__copy">
            <span class="sr-only">{{ variantLabel(toast.variant) }}</span>
            <strong class="toast__title">{{ toast.title }}</strong>
            <p v-if="toast.description" class="toast__text">{{ toast.description }}</p>
          </div>
          <button v-if="toast.action" type="button" class="toast__action" @click="runAction(toast)">
            {{ toast.action.label }}
          </button>
          <button type="button" class="toast__close" :aria-label="t('common.close')" @click="remove(toast.id)">
            <X class="icon-sm" aria-hidden="true" />
          </button>
        </article>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
/* Phones: above the floating «Новый анализ», under the thumb. Desktop: top right, out of the way. */
.toast-region {
  position: fixed;
  right: var(--page-gutter);
  bottom: calc(env(safe-area-inset-bottom, 0px) + var(--control-md) + var(--space-6));
  left: var(--page-gutter);
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: var(--space-2);
  pointer-events: none;
}

@media (min-width: 901px) {
  .toast-region {
    top: var(--space-4);
    right: var(--space-6);
    bottom: auto;
    left: auto;
    flex-direction: column;
    align-items: flex-end;
    width: var(--dialog-sm);
  }
}

/* Ink, 16 corners, one line of title and an optional line under it; the action is an outlined pill. */
.toast {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  max-width: var(--dialog-sm);
  min-height: var(--control-md);
  padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--inverse-surface);
  color: var(--on-inverse);
  box-shadow: var(--shadow-overlay);
  pointer-events: auto;
}

.toast__icon {
  flex: none;
}

.toast--error .toast__icon {
  color: var(--danger-on-inverse);
}

.toast__copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.toast__title {
  font: var(--text-ui);
}

.toast__text {
  color: var(--on-inverse-muted);
  font: var(--text-small);
}

.toast__action {
  flex: none;
  height: var(--control-sm);
  padding: 0 var(--space-3);
  border-radius: var(--radius-full);
  box-shadow: var(--ring-current);
  font: var(--text-small-strong);
  white-space: nowrap;
}

.toast__close {
  position: relative;
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: var(--control-sm);
  height: var(--control-sm);
  border-radius: var(--radius-full);
  color: var(--on-inverse-muted);
}

.toast__close::after {
  content: '';
  position: absolute;
  inset: calc((var(--control-sm) - var(--hit-min)) / 2);
}

@media (hover: hover) and (pointer: fine) {
  .toast__action:hover,
  .toast__close:hover {
    background: var(--on-inverse-hover);
  }
}

.toast-enter-active {
  transition:
    opacity var(--duration-fast) var(--ease-standard),
    transform var(--duration-sheet) var(--spring-snappy);
}

.toast-leave-active {
  transition:
    opacity var(--transition-exit),
    transform var(--transition-exit);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(var(--space-4)) scale(0.98);
}
</style>
