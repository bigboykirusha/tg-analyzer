<script setup lang="ts">
/**
 * The floating overlay panel shared by UiPopoverMenu and UiSelect: a raised white card anchored
 * under (or over) its trigger. It only draws the panel; the owner decides when it shows, wraps it in
 * `<Transition name="menu-panel">` and handles keys. Rows inside are UiListRow / UiMenuItem.
 *
 * Geometry is concentric: the panel corner (--radius-lg 24) minus its padding (8) is the row corner
 * (--radius-md 16).
 */
withDefaults(
  defineProps<{
    /** Which edge of the trigger the panel lines up with; `stretch` takes the trigger's width. */
    align?: 'start' | 'end' | 'stretch'
    /** Opens below the trigger, or above it when there is no room underneath. */
    side?: 'bottom' | 'top'
    /** The panel scrolls itself; off when an inner list scrolls under a pinned search. */
    scroll?: boolean
  }>(),
  { align: 'end', side: 'bottom', scroll: true },
)

const el = ref<HTMLElement | null>(null)
defineExpose({ el })
</script>

<template>
  <div
    ref="el"
    class="menu-panel"
    :class="[`menu-panel--${align}`, `menu-panel--${side}`, { 'menu-panel--scroll': scroll }]"
  >
    <slot />
  </div>
</template>

<style scoped>
.menu-panel {
  position: absolute;
  z-index: var(--z-popover);
  display: flex;
  flex-direction: column;
  min-width: var(--menu-min);
  max-width: calc(100vw - var(--page-gutter) * 2);
  max-height: var(--menu-max-height);
  overflow: hidden;
  padding: var(--space-1);
  border-radius: var(--radius-md);
  background: var(--surface-raised);
  box-shadow: var(--shadow-overlay);
}

.menu-panel--scroll {
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}

.menu-panel--bottom {
  top: calc(100% + var(--space-2));
}

.menu-panel--top {
  bottom: calc(100% + var(--space-2));
}

.menu-panel--end {
  right: 0;
  transform-origin: top right;
}

.menu-panel--start {
  left: 0;
  transform-origin: top left;
}

.menu-panel--stretch {
  right: 0;
  left: 0;
  transform-origin: top center;
}

.menu-panel--top.menu-panel--end {
  transform-origin: bottom right;
}

.menu-panel--top.menu-panel--start {
  transform-origin: bottom left;
}

.menu-panel--top.menu-panel--stretch {
  transform-origin: bottom center;
}

/* The owner wraps the panel in <Transition name="menu-panel">: it grows out of its trigger. */
.menu-panel-enter-active,
.menu-panel-leave-active {
  transition:
    opacity var(--transition-fast),
    transform var(--transition-fast);
}

.menu-panel-leave-active {
  transition-duration: var(--duration-fast);
  transition-timing-function: var(--ease-exit);
}

.menu-panel-enter-from,
.menu-panel-leave-to {
  opacity: 0;
  transform: translateY(calc(var(--space-1) * -1)) scale(var(--press-scale));
}

.menu-panel--top.menu-panel-enter-from,
.menu-panel--top.menu-panel-leave-to {
  transform: translateY(var(--space-1)) scale(var(--press-scale));
}
</style>
