<script setup lang="ts">
import { fillDailyGaps, shouldShowYear, type ReportDto } from '@tg-analyzer/shared'
import { nbsp } from '../../lib/nbsp'
import { Play, Share } from '../../lib/icons'

/**
 * The top of a report, like a contact poster: the name very large on the person's light colour, how
 * much you have written over which days, then the mirrored pulse of the whole chat — you above the line
 * in ink, them below in their deep tone — and the way into «Итоги». A group shows its cast instead of
 * one person. Full width under the bar, which takes the poster's colour until the page scrolls past.
 *
 * Without `data` it is the loading shape of the same blocks, so nothing moves when the report arrives.
 */
const props = withDefaults(
  defineProps<{
    data?: ReportDto | null
    /** The name while the report loads (from the lists already on hand). */
    title?: string | null
    /** «Смотреть итоги» (and, on desktop, «Поделиться») on the poster. */
    actions?: boolean
    /** A guest's poster: «Дима и Мила» and who shared it, no legend, no actions. */
    heading?: string | null
    lede?: string | null
    /** The name is the page's h1 (the example: its header carries no name). */
    h1?: boolean
  }>(),
  { data: null, title: null, actions: false, heading: null, lede: null, h1: false },
)
const emit = defineEmits<{ story: []; share: [] }>()
const { t, tc, formatNumber, formatDay } = useI18n()
const nameOf = useParticipantName()
const wide = useMediaQuery('(min-width: 901px)')

const report = computed(() => props.data?.report ?? null)
const isGroup = computed(() => Boolean(report.value?.group))
const days = computed(() => (report.value ? fillDailyGaps(report.value.activity.daily) : []))

/**
 * «4 800 сообщений · май — ноябрь 2026»: the months the chat covers, the year on both ends when it spans
 * more than one (`shouldShowYear`). A group adds its size.
 */
const meta = computed(() => {
  if (props.lede) return props.lede
  const value = report.value
  if (!value) return ''
  const messages = nbsp(
    tc('common.messagesCount', value.totals.messages, { count: formatNumber(value.totals.messages) }),
  )
  const first = days.value[0]?.date
  const last = days.value.at(-1)?.date
  const NBSP = '\u00a0'
  const plain = (text: string) => text.replace(/\s?г\.$/u, '')
  if (isGroup.value) {
    const members = tc('report.poster.members', value.group?.participants.length ?? 0)
    return first
      ? t('report.poster.groupSince', {
          messages,
          members,
          date: plain(formatDay(first, { day: 'numeric', month: 'long', year: 'numeric' })),
        })
      : `${messages}, ${members}`
  }
  if (!first || !last) return messages
  const month = (day: string, year: boolean) =>
    plain(formatDay(day, year ? { month: 'long', year: 'numeric' } : { month: 'long' }))
  const span =
    first.slice(0, 7) === last.slice(0, 7)
      ? month(last, true)
      : `${month(first, shouldShowYear(first, last))}${NBSP}— ${month(last, true)}`
  return `${messages} · ${span}`
})

/** The two ends of the pulse: «апрель» and «ноябрь», with the year on wide screens. */
const axis = computed(() => {
  const first = days.value[0]?.date
  const last = days.value.at(-1)?.date
  if (!first || !last) return null
  const month = (day: string) => formatDay(day, { month: 'long' })
  const year = (day: string) => day.slice(0, 4)
  return { from: month(first), fromYear: year(first), to: month(last), toYear: year(last) }
})
const partner = computed(() => (isGroup.value ? t('report.pulse.others') : (props.data?.summary.title ?? '')))
const pulseLabel = computed(() =>
  isGroup.value ? t('report.pulse.labelGroup') : t('report.pulse.label', { name: partner.value }),
)

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
          <!-- A guest's heading is the page's h1; the owner's name is the h1 in the bar, here its picture. -->
          <h1 v-if="heading" class="poster__name poster__name--pair">{{ heading }}</h1>
          <h1 v-else-if="h1 && data" class="poster__name">{{ data.summary.title }}</h1>
          <p v-else-if="data || title" class="poster__name" aria-hidden="true">{{ data?.summary.title ?? title }}</p>
          <UiSkeleton v-else class="poster__name-skeleton" width="55%" radius="var(--radius-well)" />
          <p v-if="meta" class="poster__meta">{{ meta }}</p>
          <UiSkeleton v-else class="poster__meta-skeleton" width="62%" />
          <slot name="badge" />
        </div>
        <div v-if="actions" class="poster__actions no-print">
          <UiButton variant="primary" :icon="Play" :disabled="!data" @click="emit('story')">{{
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
        </div>
      </div>

      <ul v-if="cast.shown.length" class="cast">
        <li v-for="person in cast.shown" :key="person.id">
          <a class="cast__person" href="#part-people">
            <UiAvatar :title="nameOf(person)" :seed="person.id" size="md" on-poster />
            <span class="cast__name">{{ nameOf(person) }}</span>
          </a>
        </li>
        <li v-if="cast.more">
          <a class="cast__person" href="#part-people">
            <span class="cast__more">+{{ formatNumber(cast.more) }}</span>
            <span class="cast__name">{{ t('group.castMore') }}</span>
          </a>
        </li>
      </ul>

      <figure class="poster__pulse">
        <figcaption v-if="!heading" class="legend" :class="{ 'legend--loading': !data }" aria-hidden="true">
          <span class="legend__key"><i class="legend__dot" />{{ t('report.pulse.you') }}</span>
          <span class="legend__key"><i class="legend__dot legend__dot--them" />{{ partner }}</span>
        </figcaption>
        <Pulse
          v-if="data && days.length > 1"
          :data="days"
          :bars="wide ? 120 : 60"
          :height="wide ? 40 : 32"
          :label="pulseLabel"
        />
        <UiSkeleton v-else class="poster__pulse-skeleton" radius="var(--radius-well)" />
        <div class="poster__axis" aria-hidden="true">
          <template v-if="axis">
            <span
              >{{ axis.from }}<span class="poster__year">{{ axis.fromYear }}</span></span
            >
            <span
              >{{ axis.to }}<span class="poster__year">{{ axis.toYear }}</span></span
            >
          </template>
        </div>
      </figure>

      <div v-if="actions" class="poster__watch no-print">
        <UiButton variant="primary" :icon="Play" :disabled="!data" @click="emit('story')">{{
          t('share.watch')
        }}</UiButton>
      </div>
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
  margin-top: calc(-1 * var(--page-top));
  padding: var(--space-4) 0 var(--space-6);
  background: var(--poster);
  color: var(--on-poster);
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
}

.poster__name {
  display: -webkit-box;
  overflow: hidden;
  font: var(--text-display);
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

.poster .poster__meta-skeleton {
  height: calc(var(--space-4) + var(--space-1));
}

.poster__meta {
  color: var(--on-poster-muted);
  font: var(--text-label);
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

.poster .poster__pulse-skeleton {
  height: calc(var(--space-16) + var(--space-0-5));
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

.legend__dot {
  width: var(--space-2);
  height: var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--on-poster);
}

.legend__dot--them {
  background: var(--on-them);
}

.poster__axis {
  display: flex;
  justify-content: space-between;
  min-height: var(--space-4);
  color: var(--on-poster-muted);
  font: var(--text-label);
}

.poster__year {
  display: none;
}

.poster__watch {
  padding-top: var(--space-2);
}

.cast {
  display: flex;
  gap: var(--space-3);
  overflow-x: auto;
  scrollbar-width: none;
}

.cast__person {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  width: calc(var(--avatar-md) + var(--space-4));
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

/* Desktop: the actions stand at the top right, the name in full display size, the year on the axis. */
@media (min-width: 901px) {
  .poster {
    padding: var(--space-8) 0;
  }

  .poster__in {
    gap: var(--space-6);
  }

  .poster__actions {
    display: flex;
    flex: none;
    gap: var(--space-2);
    padding-top: var(--space-2);
  }

  .poster__watch {
    display: none;
  }

  .poster__name--pair {
    font: var(--text-display);
    letter-spacing: var(--tracking-display);
  }

  .poster__year {
    display: inline;
    margin-left: var(--space-1);
  }
}
</style>
