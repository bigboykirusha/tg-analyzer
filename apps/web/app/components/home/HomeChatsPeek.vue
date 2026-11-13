<script setup lang="ts">
import { Search } from '../../lib/icons'

/**
 * Phones and tablets: the chat list peeks from the bottom of home — its handle and its search, the way a sheet in
 * Apple Maps rests at the bottom of the map. A tap, or a pull up, opens the whole list («Новый анализ», `?pick`),
 * where the people of the month stand over all chats. It is the edge of a sheet that belongs to the screen, not a
 * button floating over the page; the page keeps room for it at its end, so it never covers the last report.
 * While an analysis runs the edge tells that instead (AnalysisLive): a tap opens the details and cancel.
 */
const { t } = useI18n()
const route = useRoute()
const view = useAnalysisView()
const to = computed(() => ({ query: { ...route.query, pick: 'search' } }))
/**
 * iOS shows the keyboard only for a focus made inside the tap itself, and the sheet's search is not on the page yet:
 * the tap focuses this hidden field first, so the keyboard is already up when the sheet hands focus to its search.
 */
const proxy = ref<HTMLInputElement | null>(null)
function holdKeyboard() {
  proxy.value?.focus({ preventScroll: true })
}

/** A pull up of more than a few pixels opens the list, as the sheet's own handle would. */
const PULL = 24
let startY: number | null = null
function down(event: PointerEvent) {
  startY = event.clientY
}
function up(event: PointerEvent) {
  if (startY !== null && startY - event.clientY > PULL && !view.value) void navigateTo(to.value)
  startY = null
}
</script>

<template>
  <div class="peek" @pointerdown="down" @pointerup="up" @pointercancel="startY = null">
    <span class="peek__handle" aria-hidden="true" />
    <input ref="proxy" class="peek__proxy" type="search" tabindex="-1" aria-hidden="true" />
    <AnalysisLive v-if="view" />
    <NuxtLink v-else :to="to" class="peek__search" @click="holdKeyboard">
      <Search aria-hidden="true" />
      <span>{{ t('home.peekSearch') }}</span>
    </NuxtLink>
  </div>
</template>

<style scoped>
.peek {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: var(--z-dock);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--page-gutter) calc(var(--space-3) + env(safe-area-inset-bottom, 0px));
  border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
  background: var(--surface-raised);
  box-shadow: var(--shadow-peek);
  touch-action: none;
}

/* Off the screen and invisible, but a real field (16 px, so iOS does not zoom) — see holdKeyboard. */
.peek__proxy {
  position: fixed;
  top: 0;
  left: 0;
  width: 1px;
  height: 1px;
  opacity: 0;
  font: var(--text-body);
  pointer-events: none;
}

.peek__handle {
  width: var(--space-10);
  height: var(--space-1);
  border-radius: var(--radius-pill);
  background: var(--border-strong);
}

.peek :deep(.live) {
  width: 100%;
}

/* The search of the list it opens: the grey of controls on a sheet (its muted words keep 4.5:1), a size a thumb finds. */
.peek__search {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  height: var(--control-md);
  padding: 0 var(--space-4);
  border-radius: var(--radius-pill);
  background: var(--fill-raised);
  color: var(--text-muted);
  font: var(--text-body);
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--duration-press) var(--ease-standard);
  --icon-size: var(--icon-md);
}

.peek__search:active {
  transform: scale(var(--press-scale));
}

@media (min-width: 901px) {
  .peek {
    display: none;
  }
}

@media print {
  .peek {
    display: none;
  }
}
</style>
