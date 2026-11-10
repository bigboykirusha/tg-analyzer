<script setup lang="ts">
import { ArrowLeft } from '../../lib/icons'

/**
 * The title of an app screen.
 *
 * Phones and tablets: it goes up into the app bar — a back circle on the left, the title (and a short
 * second line) in the middle, the actions on the right; floating controls, one material.
 * Desktop: the same title is the page's large title (h1, a lede, actions at the end) at the top of the
 * column — unless `bar` keeps it in the bar (the report, over and after its poster).
 * Only one of the two is ever displayed, so there is one h1.
 */
const props = withDefaults(
  defineProps<{
    title: string
    lede?: string
    /** A back circle to this page (pop when the person came from inside the app). */
    back?: string
    /** Keep the title in the bar on desktop as well (the report). */
    bar?: boolean
    /** Phones: no title in the bar (it is on the page, e.g. a profile). */
    hideTitle?: boolean
  }>(),
  { lede: '', back: '', bar: false, hideTitle: false },
)
const { t } = useI18n()
const router = useRouter()

/** Back means pop, as on iPhone; a deep link has nothing to pop and goes to `back`. */
function goBack(event: MouseEvent) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
  if (typeof window.history.state?.back !== 'string') return
  event.preventDefault()
  router.back()
}
const titleId = useId()
</script>

<template>
  <Teleport to="#header-page" defer>
    <div class="page-bar" :class="{ 'page-bar--wide': props.bar }">
      <div class="page-bar__start">
        <UiIconButton
          v-if="back"
          :to="back"
          :label="t('common.back')"
          :icon="ArrowLeft"
          tone="chrome"
          class="page-bar__back"
          no-tooltip
          @click="goBack"
        />
        <slot name="leading" />
      </div>
      <div class="page-bar__copy" :class="{ 'page-bar__copy--hidden': hideTitle }">
        <slot name="title">
          <h1 :id="titleId" class="page-bar__title">{{ title }}</h1>
          <p v-if="lede" class="page-bar__lede">{{ lede }}</p>
        </slot>
      </div>
      <div class="page-bar__end no-print"><slot name="actions" /></div>
    </div>
  </Teleport>
  <!-- Desktop: the large title on the page itself. -->
  <header v-if="!props.bar" class="page-title">
    <div class="page-title__copy">
      <h1 class="t-h1">{{ title }}</h1>
      <p v-if="lede" class="page-title__lede">{{ lede }}</p>
    </div>
    <div v-if="$slots.actions" class="page-title__actions no-print"><slot name="actions" /></div>
  </header>
</template>

<style scoped>
.page-bar {
  display: grid;
  grid-template-columns: 1fr minmax(0, auto) 1fr;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  min-width: 0;
}

.page-bar__start,
.page-bar__end {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.page-bar__end {
  justify-content: flex-end;
}

.page-bar__copy {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  text-align: center;
}

.page-bar__copy--hidden {
  visibility: hidden;
}

.page-bar__title {
  max-width: 100%;
  overflow: hidden;
  font: var(--text-label);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-bar__lede {
  max-width: 100%;
  overflow: hidden;
  color: var(--text-muted);
  font: var(--text-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-title {
  display: none;
}

/* Desktop: the bar shows only a report's title, left-aligned; other screens title themselves on the page. */
@media (min-width: 901px) {
  .page-bar:not(.page-bar--wide) {
    display: none;
  }

  .page-bar--wide {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .page-bar--wide .page-bar__start {
    display: none;
  }

  .page-bar--wide .page-bar__copy {
    align-items: flex-start;
    text-align: left;
  }

  .page-bar--wide .page-bar__title {
    font: var(--text-body);
  }

  .page-title {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--space-6);
  }

  .page-title__copy {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    min-width: 0;
  }

  .page-title__lede {
    color: var(--text-muted);
    font: var(--text-body);
  }

  .page-title__actions {
    display: flex;
    flex: none;
    gap: var(--space-2);
  }
}
</style>
