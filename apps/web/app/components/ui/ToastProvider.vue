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
  <Teleport to="body">
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
            <button v-if="toast.action" type="button" class="toast__action" @click="runAction(toast)">
              {{ toast.action.label }}
            </button>
          </div>
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
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: var(--space-3);
  width: 100%;
  min-width: 0;
  padding: 14px var(--space-4);
  border-radius: var(--radius-xl);
  background: var(--inverse-surface);
  box-shadow: var(--shadow-overlay);
  color: var(--on-inverse);
  pointer-events: auto;
}

.toast__icon {
  margin-top: 2px;
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
  gap: 2px;
  min-width: 0;
}

.toast__title {
  color: var(--on-inverse);
  font: var(--text-ui);
  font-weight: 600;
}

.toast__text {
  color: var(--on-inverse);
  opacity: 0.72;
  font: var(--text-small);
  overflow-wrap: anywhere;
}

.toast__action {
  justify-self: start;
  margin-top: var(--space-2);
  padding: 0;
  border: 0;
  border-radius: var(--radius-xs);
  background: none;
  color: var(--on-inverse);
  cursor: pointer;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  font: var(--text-small);
  font-weight: 600;
}

.toast__action:hover {
  text-decoration-thickness: 2px;
}

/* The 32px close button sits in the corner without growing the toast. */
.toast .toast__close {
  margin: calc(var(--space-1) * -1.5) calc(var(--space-1) * -1.5) 0 0;
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
  transform: translateY(-8px) scale(0.97);
}

@media (max-width: 640px) {
  .toast-region {
    top: calc(env(safe-area-inset-top, 0px) + var(--space-2));
  }
}
</style>
