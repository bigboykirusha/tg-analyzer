<script setup lang="ts">
import type { ReportSummaryDto } from '@tg-analyzer/shared'
import type { ChapterHeadline } from '../../composables/useChapterHeadlines'
import { Share } from '../../lib/icons'

/**
 * The report's bar (UiPageBar `bar`): the name and where the reader is — «Вы двое, 1 из 3».
 *
 * Phones and tablets: a back circle, the name in the middle, a share circle. Over the poster the name
 * stays on the poster and the bar shows only the circles (AppHeader).
 * Desktop: the bar appears once the poster has gone — the name and chapter on the left, «Поделиться».
 *
 * Installed on the home screen (display-mode: standalone) the chapters also sit in a dock under the thumb.
 */
const props = withDefaults(
  defineProps<{
    summary: ReportSummaryDto
    /** The example report: back to the landing, «Войти» instead of sharing. */
    demo?: boolean
    /** A shared link: just the name, nothing to go back to or share. */
    guest?: boolean
    headlines?: ChapterHeadline[]
    /** «4 800 сообщений»: the second line before the first chapter is reached. */
    meta?: string
  }>(),
  { demo: false, guest: false, headlines: () => [], meta: '' },
)
const emit = defineEmits<{ share: [] }>()
const { t } = useI18n()

const spy = useChapterSpy(() => props.headlines.map((headline) => headline.id))
const status = computed(() => {
  const index = props.headlines.findIndex((headline) => headline.id === spy.current.value)
  if (index < 0) return props.meta
  return t('report.chapterOf', {
    chapter: props.headlines[index]!.label,
    n: index + 1,
    total: props.headlines.length,
  })
})
const dock = computed(() => !props.demo && !props.guest && props.headlines.length > 1)
</script>

<template>
  <UiPageBar :title="summary.title" :lede="status" :back="guest ? '' : demo ? '/' : '/dashboard'" bar>
    <template v-if="!guest" #actions>
      <UiButton v-if="demo" variant="primary" size="sm" to="/login">{{ t('site.signIn') }}</UiButton>
      <template v-else>
        <UiIconButton
          class="report-bar__narrow"
          tone="chrome"
          :icon="Share"
          :label="t('share.open')"
          aria-haspopup="dialog"
          no-tooltip
          @click="emit('share')"
        />
        <UiButton
          class="report-bar__wide"
          variant="secondary"
          size="sm"
          :icon="Share"
          aria-haspopup="dialog"
          @click="emit('share')"
        >
          {{ t('share.open') }}
        </UiButton>
      </template>
    </template>
  </UiPageBar>

  <nav v-if="dock" class="report-dock no-print" :aria-label="t('report.tabs.label')">
    <div class="report-dock__chapters">
      <button
        v-for="headline in headlines"
        :key="headline.id"
        type="button"
        class="report-dock__chapter"
        :aria-current="headline.id === spy.current.value ? 'location' : undefined"
        @click="spy.go(headline.id)"
      >
        {{ headline.label }}
      </button>
    </div>
  </nav>
</template>

<style scoped>
.report-bar__wide {
  display: none;
}

@media (min-width: 901px) {
  .report-bar__narrow {
    display: none;
  }

  .report-bar__wide {
    display: inline-flex;
  }
}

.report-dock {
  display: none;
}

/* Installed: the chapters in one glass capsule above the home indicator. */
@media (display-mode: standalone) and (max-width: 900px) {
  .report-dock {
    position: fixed;
    z-index: var(--z-dock);
    inset: auto var(--page-gutter) calc(var(--space-3) + env(safe-area-inset-bottom, 0px));
    display: flex;
  }

  .report-dock__chapters {
    display: flex;
    flex: 1;
    min-width: 0;
    padding: var(--space-1);
    border-radius: var(--radius-full);
    background: var(--toolbar-glass);
    box-shadow: var(--shadow-float);
    -webkit-backdrop-filter: var(--glass-filter);
    backdrop-filter: var(--glass-filter);
  }

  .report-dock__chapter {
    flex: 1;
    min-width: 0;
    min-height: var(--control-md);
    border-radius: var(--radius-full);
    color: var(--text);
    font: var(--text-ui);
    white-space: nowrap;
  }

  .report-dock__chapter[aria-current] {
    background: var(--you);
    color: var(--on-you);
  }
}
</style>
