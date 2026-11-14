<script setup lang="ts">
import { hueOf } from '../../lib/hue'
import { useI18n } from '../../composables/useI18n'
import { useToast, type ToastMessage, type ToastVariant } from '../../composables/useToast'
import { AlertTriangle, ChevronRight, CircleCheck, CircleX, Info } from '../../lib/icons'

/**
 * Notifications as banners at the top, the way iOS shows one (14.11): a rounded card with a picture, a title and a
 * line, nothing else — no buttons, no close. News about a person (a report is ready) is a banner in that person's
 * colour with their avatar; everything else (a link copied, an error, an analysis cancelled) is the same banner in
 * grey with an icon. A tap does what the banner is about (opens the report) or puts it away; a flick up puts it away.
 */
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

/** Moved up more than this, the banner goes; less, it was a tap. */
const AWAY = 24
const SLOP = 6
const drag = reactive<Record<string, number>>({})
let start: { id: string; y: number; moved: boolean } | null = null

function down(toast: ToastMessage, event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  start = { id: toast.id, y: event.clientY, moved: false }
  pause(toast.id)
}
function move(event: PointerEvent) {
  if (!start) return
  const delta = event.clientY - start.y
  if (Math.abs(delta) > SLOP) start.moved = true
  // Up follows the finger; down only gives a little.
  drag[start.id] = delta < 0 ? delta : Math.sqrt(delta) * 2
}
function up(toast: ToastMessage) {
  if (!start) return
  const { moved } = start
  const delta = drag[toast.id] ?? 0
  start = null
  delete drag[toast.id]
  if (delta < -AWAY) remove(toast.id)
  else if (!moved) activate(toast)
  else resume(toast.id)
}
function activate(toast: ToastMessage) {
  toast.action?.onClick()
  remove(toast.id)
}

function label(toast: ToastMessage) {
  return [toast.title, toast.description, toast.action?.label].filter(Boolean).join('. ')
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
          :class="[`toast--${toast.variant}`, { 'toast--person': toast.chatId, 'is-dragging': drag[toast.id] }]"
          :data-hue="toast.chatId ? hueOf(toast.chatId) : undefined"
          :role="toast.variant === 'error' ? 'alert' : 'status'"
          :style="drag[toast.id] ? { transform: `translateY(${drag[toast.id]}px)` } : undefined"
          @pointerenter="pause(toast.id)"
          @pointerleave="resume(toast.id)"
        >
          <ChatAvatar
            v-if="toast.chatId"
            class="toast__picture"
            :chat-id="toast.chatId"
            :title="toast.avatarTitle ?? toast.description ?? toast.title"
            on-poster
          />
          <span v-else class="toast__picture toast__icon" aria-hidden="true">
            <component :is="variantIcon[toast.variant]" />
          </span>
          <div class="toast__copy">
            <span class="sr-only">{{ variantLabel(toast.variant) }}</span>
            <strong class="toast__title">{{ toast.title }}</strong>
            <p v-if="toast.description" class="toast__text">{{ toast.description }}</p>
          </div>
          <ChevronRight v-if="toast.action" class="toast__go" aria-hidden="true" />
          <!-- The whole banner is the one control: a tap does its action or puts it away. -->
          <button
            type="button"
            class="toast__hit"
            :aria-label="label(toast)"
            @pointerdown="down(toast, $event)"
            @pointermove="move"
            @pointerup="up(toast)"
            @pointercancel="up(toast)"
            @keydown.enter.prevent="activate(toast)"
            @keydown.space.prevent="activate(toast)"
            @keydown.esc.prevent="remove(toast.id)"
            @focus="pause(toast.id)"
            @blur="resume(toast.id)"
          />
        </article>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
/* On top, out of the way of the sheets and the bottom panel. */
.toast-region {
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + var(--space-2));
  right: var(--space-3);
  left: var(--space-3);
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  pointer-events: none;
}

@media (min-width: 901px) {
  .toast-region {
    top: var(--space-4);
    right: var(--space-6);
    left: auto;
    align-items: flex-end;
    width: var(--dialog-sm);
  }
}

/* A notification card: grey by default, the person's poster when it is about them. */
.toast {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  max-width: var(--dialog-sm);
  padding: var(--space-3) var(--space-4) var(--space-3) var(--space-3);
  border-radius: var(--radius-card);
  background: var(--surface-raised);
  color: var(--text);
  box-shadow: var(--shadow-overlay);
  pointer-events: auto;
  touch-action: none;
  transition: transform var(--duration-sheet) var(--ease-drawer);
}

.toast.is-dragging {
  transition: none;
}

.toast--person {
  background-color: var(--poster);
  background-image: var(--poster-image);
  color: var(--on-poster);
}

.toast__picture {
  flex: none;
}

.toast__icon {
  display: grid;
  place-items: center;
  width: var(--avatar-md);
  height: var(--avatar-md);
  border-radius: var(--radius-pill);
  background: var(--fill-raised);
  color: var(--text);
  --icon-size: var(--icon-md);
}

.toast--error .toast__icon,
.toast--warning .toast__icon {
  color: var(--danger);
}

.toast__copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.toast__title {
  font: var(--text-body);
}

.toast__text {
  overflow: hidden;
  color: var(--text-muted);
  font: var(--text-label);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toast--person .toast__text {
  color: var(--on-poster-muted);
}

.toast__go {
  flex: none;
  color: var(--text-muted);
}

.toast--person .toast__go {
  color: var(--on-poster-muted);
}

.toast__hit {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  -webkit-tap-highlight-color: transparent;
}

.toast__hit:focus-visible {
  outline: 2px solid var(--focus-ring-color);
  outline-offset: 2px;
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
  transform: translateY(calc(-1 * var(--space-8)));
}

@media (prefers-reduced-motion: reduce) {
  .toast,
  .toast-enter-active,
  .toast-leave-active {
    transition-duration: var(--duration-none);
  }
}
</style>
