<script setup lang="ts">
import { useI18n } from '../../composables/useI18n'
import { useToast, type ToastMessage, type ToastVariant } from '../../composables/useToast'
import { AlertTriangle, CircleCheck, CircleX, Info, X } from '../../lib/icons'
import IconButton from './IconButton.vue'

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
          <IconButton
            class="toast__close"
            :label="t('common.close')"
            :icon="X"
            variant="ghost"
            size="xs"
            @click="remove(toast.id)"
          />
        </article>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
/* Top centre, just under the header: where the eye already is, clear of the thumb. */
.toast-region {
  position: fixed;
  top: calc(var(--topbar-height) + var(--space-2));
  left: 50%;
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  width: min(400px, calc(100vw - var(--space-6)));
  pointer-events: none;
  translate: -50% 0;
}

.toast {
  display: grid;
  /* Icon, words, the action and the close button in one row: a short strip, not a card. */
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-width: 0;
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--inverse-surface);
  box-shadow: var(--shadow-overlay);
  color: var(--on-inverse);
  pointer-events: auto;
}

.toast__icon {
  color: var(--on-inverse);
}

.toast--success .toast__icon {
  color: var(--lime);
}

.toast--error .toast__icon {
  color: var(--danger);
}

.toast--warning .toast__icon {
  color: var(--warning);
}

.toast__copy {
  display: grid;
  gap: var(--space-0-5);
  min-width: 0;
}

.toast__title {
  color: var(--on-inverse);
  font: var(--text-ui);
}

.toast__text {
  color: var(--on-inverse);
  opacity: 0.72;
  font: var(--text-small);
  overflow-wrap: anywhere;
}

.toast__action {
  min-height: var(--control-xs);
  padding: 0 var(--space-3);
  border: 1px solid var(--on-inverse-line);
  border-radius: var(--radius-full);
  background: none;
  color: var(--on-inverse);
  cursor: pointer;
  font: var(--text-small);
  font-weight: 500;
  white-space: nowrap;
}

@media (hover: hover) and (pointer: fine) {
  .toast__action:hover {
    border-color: var(--on-inverse);
  }
}

/* The 32px close button sits in the corner without growing the toast. */
.toast .toast__close {
  margin: calc(var(--space-1) * -1.5) calc(var(--space-1) * -1.5) calc(var(--space-1) * -1.5) 0;
  color: var(--on-inverse);
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
  transform: translateY(calc(var(--space-2) * -1)) scale(var(--press-scale));
}

@media (max-width: 640px) {
  .toast-region {
    top: calc(env(safe-area-inset-top, 0px) + var(--space-2));
  }

  /* On a phone the toast covers the header: keep it to two short lines. */
  .toast {
    padding: var(--space-3);
  }

  .toast__text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
