<script setup lang="ts">
/**
 * Inverse-theme label over its trigger: after 300 ms of hover, at once on
 * keyboard focus, hidden at once, Esc closes. Only a supplement — never the
 * only place important text lives. No tooltips on touch screens.
 */
const props = withDefaults(
  defineProps<{
    text: string
    /** Link the trigger through aria-describedby. Off when the text repeats aria-label. */
    describe?: boolean
    disabled?: boolean
  }>(),
  { describe: true, disabled: false },
)

const SHOW_DELAY_MS = 300
const EDGE = 8

const id = useId()
const anchorRef = ref<HTMLElement | null>(null)
const tipRef = ref<HTMLElement | null>(null)
const open = ref(false)
const position = ref({ top: 0, left: 0, below: false })
let timer: number | undefined

async function show() {
  if (props.disabled || !props.text || !anchorRef.value) return
  open.value = true
  await nextTick()
  const rect = anchorRef.value?.getBoundingClientRect()
  const tip = tipRef.value
  if (!rect || !tip) return
  const gap = Number.parseFloat(getComputedStyle(tip).getPropertyValue('--gap')) || EDGE
  const below = rect.top - tip.offsetHeight - gap < EDGE
  const half = tip.offsetWidth / 2
  const center = rect.left + rect.width / 2
  position.value = {
    top: below ? rect.bottom + gap : rect.top - gap,
    left: Math.min(Math.max(center, half + EDGE), window.innerWidth - half - EDGE),
    below,
  }
}

function hide() {
  window.clearTimeout(timer)
  open.value = false
}

function onPointerEnter(event: PointerEvent) {
  if (event.pointerType === 'touch' || !window.matchMedia('(hover: hover)').matches) return
  window.clearTimeout(timer)
  timer = window.setTimeout(show, SHOW_DELAY_MS)
}

function onFocusIn(event: FocusEvent) {
  const target = event.target as HTMLElement | null
  if (target?.matches(':focus-visible')) void show()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) hide()
}

onBeforeUnmount(() => window.clearTimeout(timer))
</script>

<template>
  <span
    ref="anchorRef"
    class="tip-anchor"
    @pointerenter="onPointerEnter"
    @pointerleave="hide"
    @pointerdown="hide"
    @focusin="onFocusIn"
    @focusout="hide"
    @keydown="onKeydown"
  >
    <slot :describedby="describe && open ? id : undefined" />
    <Teleport to="body">
      <span
        v-if="open"
        :id="id"
        ref="tipRef"
        class="tooltip"
        :class="{ 'tooltip--below': position.below }"
        role="tooltip"
        :aria-hidden="describe ? undefined : 'true'"
        :style="{ top: `${position.top}px`, left: `${position.left}px` }"
      >
        {{ text }}
      </span>
    </Teleport>
  </span>
</template>

<style scoped>
.tip-anchor {
  position: relative;
  display: inline-flex;
  min-width: 0;
}

.tooltip {
  --gap: var(--space-2);
  position: fixed;
  z-index: var(--z-popover);
  max-width: 260px;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--inverse-surface);
  box-shadow: var(--shadow-overlay);
  color: var(--on-inverse);
  font: var(--text-caption);
  pointer-events: none;
  transform: translate(-50%, -100%);
  animation: tooltip-in var(--duration-fast) var(--ease-standard) both;
}

.tooltip--below {
  transform: translate(-50%, 0);
}

@keyframes tooltip-in {
  from {
    opacity: 0;
  }
}
</style>
