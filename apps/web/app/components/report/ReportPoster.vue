<script setup lang="ts">
import { fillDailyGaps, reportChatSpan, type ReportDto } from '@tg-analyzer/shared'
import { Play, Share } from '../../lib/icons'

/**
 * The top of a report, like a contact poster: the name very large on the person's light colour, how
 * much you have written over which days, then the mirrored pulse of the whole chat — you above the line
 * in ink, them below in their deep tone — and the way into «Итоги». No months under the pulse (19.11): the span is
 * already said under the count, and the ends of a pulse need no captions. A group shows its cast instead of
 * one person. Full width under the bar, which takes the poster's colour until the page scrolls past.
 *
 * Without `data` it is the loading shape of the same blocks, so nothing moves when the report arrives.
 */
const props = withDefaults(
  defineProps<{
    data?: ReportDto | null
    /** The name while the report loads (from the lists already on hand). */
    title?: string | null
    /** Quick report actions on desktop. */
    actions?: boolean
    caption?: string
    /** The heading on a shared report. */
    heading?: string | null
    /** Anonymous guest avatars already carry their participant number. */
    anonymousCast?: boolean
    /** The name is the page's h1 (the example: its header carries no name). */
    h1?: boolean
  }>(),
  { data: null, title: null, actions: false, caption: '', heading: null, anonymousCast: false, h1: false },
)
const emit = defineEmits<{ story: []; share: [] }>()
const { t, formatNumber } = useI18n()
const nameOf = useParticipantName()
const you = useYouLabel()
const wide = useMediaQuery('(min-width: 901px)')

const report = computed(() => props.data?.report ?? null)
const isGroup = computed(() => Boolean(report.value?.group))
const days = computed(() => (report.value ? fillDailyGaps(report.value.activity.daily) : []))

const spanParts = useChatSpanParts()
const meta = computed(() => (props.data ? spanParts(reportChatSpan(props.data.report)) : null))

const pulseData = computed(() => (props.data && days.value.length > 1 ? days.value : null))
const partner = computed(() => (isGroup.value ? t('report.pulse.others') : (props.data?.summary.title ?? '')))
const pulseLabel = computed(() => t('report.pulse.label', { above: you.value, below: partner.value }))

/**
 * The name is the display role fitted to the poster: its longest word sets the size, so «Продуктовая команда»
 * breaks between its words, never inside one.
 */
const nameChars = computed(() => {
  const name = props.data?.summary.title ?? props.title ?? ''
  return Math.max(1, ...name.split(/\s+/u).map((word) => [...word].length))
})

/** A group's most active members, then «+N ещё»; each leads to «Люди». */
const cast = computed(() => {
  // A phone's row holds five circles: four people and «+N».
  const limit = wide.value ? 5 : 4
  const people = [...(report.value?.group?.participants ?? [])]
    .filter((person) => !person.isSelf)
    .sort((a, b) => b.messageCount - a.messageCount)
  return { shown: people.slice(0, limit), more: Math.max(0, people.length - limit) }
})
</script>

<template>
  <section class="poster" data-poster :aria-busy="data ? undefined : 'true'">
    <UiPageContainer class="poster__in">
      <div class="poster__top">
        <div class="poster__head">
          <p v-if="caption" class="poster__caption t-label">{{ caption }}</p>
          <!-- A guest's heading is the page's h1; the owner's name is the h1 in the bar, here its picture. -->
          <h1 v-if="heading" class="poster__name poster__name--pair">{{ heading }}</h1>
          <h1 v-else-if="h1 && data" class="poster__name" :style="{ '--name-chars': nameChars }">
            {{ data.summary.title }}
          </h1>
          <p v-else-if="data || title" class="poster__name" :style="{ '--name-chars': nameChars }" aria-hidden="true">
            {{ data?.summary.title ?? title }}
          </p>
          <UiSkeleton v-else class="poster__name-skeleton" width="55%" radius="var(--radius-well)" />
          <p v-if="meta" class="poster__meta">
            <span class="poster__count">{{ meta.messages }}</span>
            <span v-if="meta.members">{{ meta.members }}</span>
            <span v-if="meta.period" class="poster__period">{{ meta.period }}</span>
          </p>
          <UiSkeleton v-else class="poster__meta-skeleton" width="62%" />
          <slot name="badge" />
        </div>
        <div v-if="actions" class="poster__actions no-print">
          <UiButton variant="secondary" :icon="Play" :disabled="!data" @click="emit('story')">{{
            t('share.watch')
          }}</UiButton>
          <UiButton
            class="poster__share"
            variant="secondary"
            :icon="Share"
            :disabled="!data"
            aria-haspopup="dialog"
            @click="emit('share')"
          >
            {{ t('share.open') }}
          </UiButton>
          <slot name="menu" />
        </div>
      </div>

      <ul v-if="cast.shown.length" class="cast">
        <li v-for="person in cast.shown" :key="person.id">
          <a class="cast__person" href="#part-people">
            <UiAvatar :title="nameOf(person)" :seed="person.id" size="md" on-poster />
            <span :class="anonymousCast ? 'sr-only' : 'cast__name'">{{ nameOf(person) }}</span>
          </a>
        </li>
        <li v-if="cast.more">
          <a class="cast__person" href="#part-people">
            <span class="cast__more">+{{ formatNumber(cast.more) }}</span>
            <span :class="anonymousCast ? 'sr-only' : 'cast__name'">{{ t('group.castMore') }}</span>
          </a>
        </li>
      </ul>

      <!-- The pulse is the poster's picture, the key to its two sides under it (19.11). -->
      <figure v-if="pulseData || !data" class="poster__pulse">
        <Pulse
          v-if="pulseData"
          :data="pulseData"
          :bars="wide ? 120 : 60"
          :height="wide ? 48 : 40"
          :label="pulseLabel"
        />
        <UiSkeleton v-else class="poster__pulse-skeleton" radius="var(--radius-well)" />
        <figcaption class="legend" :class="{ 'legend--loading': !data }" aria-hidden="true">
          <span class="legend__key">
            <i class="legend__dot" /><span class="legend__label">{{ you }}</span>
          </span>
          <span class="legend__key">
            <i class="legend__dot legend__dot--them" /><span class="legend__label">{{ partner }}</span>
          </span>
        </figcaption>
      </figure>
    </UiPageContainer>
  </section>
</template>

<style scoped>
/* Everything on the poster is ink on the person's light colour; their own side is their deep tone. */
.poster {
  --text: var(--on-poster);
  --text-muted: var(--on-poster-muted);
  --skeleton: var(--on-poster-chip);
  --pulse-you: var(--on-poster);
  --pulse-them: var(--on-them);
  position: relative;
  /* The poster runs up under the bar (the bar gives its height back and is transparent over it): no seam. */
  margin-top: calc(-1 * var(--page-top));
  padding: calc(var(--topbar-height) + env(safe-area-inset-top, 0px) + var(--space-4)) 0
    calc(var(--space-8) + var(--radius-sheet));
  background-color: var(--poster);
  background-image: var(--poster-image);
  color: var(--on-poster);
}

/*
 * A phone: the poster runs up under the browser's status strip, which Safari paints one flat colour (`--poster`,
 * usePosterHeader) — a lit top met it with a seam (13.11). Here the top is the flat colour under the bar and the light
 * of the material begins below it; the rest is `--poster-image` layer for layer.
 */
@media (max-width: 900px) {
  .poster {
    --poster-flat: calc(env(safe-area-inset-top, 0px) + var(--topbar-height));
    background-image:
      var(--grain),
      linear-gradient(
        180deg,
        var(--poster) var(--poster-flat),
        transparent calc(var(--poster-flat) + var(--space-12) * 2)
      ),
      radial-gradient(130% 100% at 0% 0%, var(--poster-light) 0%, transparent 60%),
      linear-gradient(165deg, var(--poster) 30%, var(--poster-shade) 100%);
  }
}

/* The report is a sheet laid over its poster: the page comes up with rounded shoulders. */
.poster::after {
  content: '';
  position: absolute;
  inset: auto 0 calc(-1 * var(--space-0-5));
  height: calc(var(--radius-sheet) + var(--space-0-5));
  border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
  background: var(--bg);
  pointer-events: none;
}

.poster__in {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.poster__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-6);
  min-width: 0;
}

.poster__head {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
  /* The name measures itself against this column. */
  container-type: inline-size;
}

/*
 * The display role, fitted: a name whose longest word is wider than the poster steps down until that word fits
 * (a glyph of Onest 600 at this tracking is about 0.62 em), down to the h1 size; only then may a word break.
 */
.poster__name {
  display: -webkit-box;
  overflow: hidden;
  font: var(--text-display);
  /* Declared here, not in tokens.css: it reads this name's own length and this poster's width. */
  --display-name-fit: clamp(var(--display-min), calc(100cqi / (var(--name-chars, 1) * 0.62)), var(--display-max));
  font-size: var(--display-name-fit);
  line-height: 1;
  letter-spacing: var(--tracking-display);
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

/* Two names read as a sentence: a step smaller on a phone, so «Дима и Мила» stays on one line. */
.poster__name--pair {
  font: var(--text-figure);
  letter-spacing: var(--tracking-figure);
}

/* Skeletons stand at the exact height of the lines they replace. */
.poster .poster__name-skeleton {
  height: var(--display-max);
}

/* The count's body line and the span's label line. */
.poster .poster__meta-skeleton {
  height: calc(var(--space-10) + var(--space-1));
}

.poster__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 var(--space-3);
  color: var(--on-poster-muted);
  font: var(--text-label);
}

.poster__period {
  flex-basis: 100%;
}

.poster__count {
  color: var(--on-poster);
  font: var(--text-body);
}

.poster__actions {
  display: none;
}

.poster__pulse {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
}

/* The pulse's two halves (40 each on a phone, 48 on a computer) and the line between. */
.poster .poster__pulse-skeleton {
  height: calc(var(--space-10) * 2 + var(--space-0-5));
}

.legend {
  display: flex;
  gap: var(--space-4);
  font: var(--text-label);
}

.legend--loading {
  visibility: hidden;
}

.legend__key {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-width: 0;
}

.legend__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.legend__dot {
  flex: none;
  width: var(--space-2);
  height: var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--on-poster);
}

.legend__dot--them {
  background: var(--on-them);
}

.poster__caption {
  color: var(--on-poster-muted);
}

.cast {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.cast > li {
  flex: 0 1 calc(var(--avatar-md) + var(--space-2));
  min-width: var(--avatar-md);
}

.cast__person {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  color: var(--on-poster-muted);
  font: var(--text-label);
  text-align: center;
}

.cast__name {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cast__more {
  display: grid;
  place-items: center;
  width: var(--avatar-md);
  height: var(--avatar-md);
  border-radius: var(--radius-pill);
  background: var(--on-poster-chip);
  color: var(--on-poster);
  font: var(--text-label);
}

/* Desktop: the actions stand at the top right, the name in full display size. */
@media (min-width: 901px) {
  /* A computer: the poster is an object in the column — a rounded card on the page, the bar's controls over it. */
  .poster {
    width: calc(100% - var(--page-gutter) * 2);
    max-width: var(--page-max);
    margin: calc(var(--space-6) - var(--page-top)) auto 0;
    padding: var(--space-8) 0;
    border-radius: var(--radius-sheet);
    box-shadow: var(--edge-light);
  }

  .poster::after {
    display: none;
  }

  .poster__in {
    --page-gutter: var(--card-padding);
    gap: var(--space-6);
  }

  .poster__actions {
    display: flex;
    flex: none;
    gap: var(--space-2);
    padding-top: var(--space-2);
  }

  .poster__name--pair {
    font: var(--text-display);
    letter-spacing: var(--tracking-display);
  }

  .poster .poster__pulse-skeleton {
    height: calc(var(--space-12) * 2 + var(--space-0-5));
  }
}
</style>
