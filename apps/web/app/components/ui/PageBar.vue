<script setup lang="ts">
/**
 * The title of an app screen, shown in the top bar instead of on the page:
 * an optional avatar, the one h1, a short meta line and the screen's actions.
 * The bar stays on screen, so the actions are always at hand. Document pages
 * (FAQ) keep `UiPageHeader` in the page.
 */
import { ChevronLeft } from '../../lib/icons'

withDefaults(
  defineProps<{
    title: string
    lede?: string
    /** Phones and tablets have no sidebar: a back arrow to this page. */
    back?: string
    /**
     * The home page: up to 900px the logo in the bar stands in for the name, which stays for
     * screen readers; wide screens, where the logo lives in the sidebar, show the name.
     */
    untitled?: boolean
    /** Wide screens only: the name goes quiet (the example report), phones keep it next to the back arrow. */
    quietOnWide?: boolean
  }>(),
  { lede: '', back: '', untitled: false, quietOnWide: false },
)
const { t } = useI18n()
const router = useRouter()

/**
 * Back means pop, as on iPhone: when the person came here from inside the app, the arrow returns to
 * that screen (and the edge swipe agrees with it). A deep link has nothing to pop, so it goes to `back`.
 */
function goBack(event: MouseEvent) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
  if (typeof window.history.state?.back !== 'string') return
  event.preventDefault()
  router.back()
}
</script>

<template>
  <Teleport to="#header-page" defer>
    <div
      class="page-bar"
      :data-back="back ? '' : undefined"
      :data-untitled="untitled ? '' : undefined"
      :data-leading="$slots.leading ? '' : undefined"
    >
      <NuxtLink v-if="back" :to="back" class="page-bar__back hit-area" :aria-label="t('nav.back')" @click="goBack">
        <ChevronLeft aria-hidden="true" />
      </NuxtLink>
      <slot name="leading" />
      <div
        class="page-bar__copy"
        :class="{ 'page-bar__copy--untitled': untitled, 'page-bar__copy--quiet': quietOnWide }"
      >
        <h1 class="page-bar__title" :title="title">{{ title }}</h1>
        <p v-if="lede" class="page-bar__lede t-num" :title="lede">{{ lede }}</p>
      </div>
      <div v-if="$slots.actions" class="page-bar__actions no-print"><slot name="actions" /></div>
    </div>
  </Teleport>
</template>

<style scoped>
.page-bar {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: var(--space-3);
}

.page-bar__back {
  display: none;
  flex: none;
  width: var(--control-sm);
  height: var(--control-sm);
  margin-left: calc(var(--space-2) * -1);
  place-items: center;
  border-radius: var(--radius-full);
  color: var(--text);
  -webkit-tap-highlight-color: transparent;
}

.page-bar__back:active {
  background: var(--hover);
}

@media (max-width: 900px) {
  .page-bar__back {
    display: grid;
  }
}

.page-bar__copy {
  display: grid;
  min-width: 0;
  flex: 1;
}

.page-bar__copy--untitled {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

@media (min-width: 901px) {
  .page-bar__copy--quiet {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
}

.page-bar__title {
  overflow: hidden;
  font: var(--text-title);
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Wide screens: the screen's name in the editorial face. */
@media (min-width: 901px) {
  .page-bar__title {
    font: var(--text-h3);
    letter-spacing: var(--tracking-h3);
  }
}

.page-bar__lede {
  overflow: hidden;
  color: var(--text-muted);
  font: var(--text-small);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-bar__actions {
  display: flex;
  margin-left: auto;
  flex: none;
  align-items: center;
  gap: var(--space-1);
}

/* Header buttons are 36 px on phones too; the touch area still reaches 44 px. */
@media (max-width: 640px) and (pointer: coarse) {
  .page-bar__actions :deep(.btn--sm) {
    min-height: var(--control-sm);
  }

  .page-bar__actions :deep(.btn--icon-only.btn--sm) {
    width: var(--control-sm);
  }

  .page-bar__actions :deep(.btn--sm)::before {
    content: '';
    position: absolute;
    inset: calc((var(--control-sm) - var(--hit-min)) / 2);
  }
}
</style>
