<script setup lang="ts">
import { computeChapters, type ReportDto } from '@tg-analyzer/shared'
import { Play } from '../../lib/icons'

/**
 * The top of a report, like a contact poster: the person's name very large on their own colour,
 * how much you have written since when, and the pulse of the whole chat (you above the line, them
 * below), with its chapters when the history has at least three. Full width under the toolbar, which
 * takes the poster's colour until the page scrolls past it (AppHeader).
 */
/** Without `data` it is the loading shape: the name when it is known, quiet bars for the rest. */
/** `story`: the poster offers «Смотреть итоги» — the recap one tap from the top, not only at the end. */
const props = defineProps<{ data?: ReportDto | null; title?: string | null; story?: boolean }>()
const emit = defineEmits<{ story: [] }>()
const nameOf = useParticipantName()

/** «В ролях»: a group's most active members on its poster, then «ещё N»; each leads to «Люди». */
const CAST = 3
const cast = computed(() => {
  const participants = [...(props.data?.report.group?.participants ?? [])].sort(
    (a, b) => b.messageCount - a.messageCount,
  )
  return { shown: participants.slice(0, CAST), more: Math.max(0, participants.length - CAST) }
})
const { t, tc, formatDate } = useI18n()

const chapters = computed(() =>
  !props.data || props.data.report.group ? [] : computeChapters(props.data.report.activity.daily),
)
const meta = computed(() => {
  if (!props.data) return ''
  const messages = tc('common.messagesCount', props.data.report.totals.messages)
  const first = props.data.summary.firstMessageAt
  return first
    ? t('report.poster.since', {
        messages,
        date: formatDate(first, { day: 'numeric', month: 'long', year: 'numeric' }),
      })
    : messages
})
</script>

<template>
  <section class="poster" data-poster>
    <UiPageContainer class="poster__in">
      <div class="poster__head">
        <!-- The name is the page's h1 in the toolbar; here it is the picture of it. -->
        <p v-if="data || title" class="poster__name" aria-hidden="true">{{ data?.summary.title ?? title }}</p>
        <UiSkeleton v-else width="40%" height="var(--space-16)" />
        <p v-if="data" class="poster__meta">{{ meta }}</p>
        <UiSkeleton v-else width="30%" height="var(--space-4)" />
      </div>
      <template v-if="data">
        <ReportPulse :data="data" bare class="poster__pulse" />
        <ReportChapters v-if="chapters.length > 2" :chapters="chapters" class="poster__chapters" />
        <div v-if="cast.shown.length" class="cast">
          <span class="cast__label">{{ t('group.cast') }}</span>
          <ul class="cast__list">
            <li v-for="person in cast.shown" :key="person.id">
              <a class="cast__person" href="#part-people">
                <UiAvatar :title="nameOf(person)" :seed="person.id" :side="person.isSelf ? 'mine' : null" size="md" />
                <span>{{ nameOf(person) }}</span>
              </a>
            </li>
            <li v-if="cast.more">
              <a class="cast__person" href="#part-people">
                <span class="cast__more t-num">+{{ cast.more }}</span>
                <span>{{ t('group.castMore') }}</span>
              </a>
            </li>
          </ul>
        </div>
        <UiButton v-if="story" class="poster__story" variant="primary" size="lg" :icon="Play" @click="emit('story')">
          {{ t('share.watch') }}
        </UiButton>
      </template>
      <UiSkeleton v-else height="var(--space-20)" radius="var(--radius-sm)" aria-hidden="true" />
    </UiPageContainer>
  </section>
</template>

<style scoped>
/*
 * Everything on the poster is drawn in its own light ink: you solid, them translucent, so the two
 * sides still read by position and weight while the poster carries the person's colour.
 */
.poster {
  --text: var(--on-poster);
  --text-muted: var(--on-poster-muted);
  --border: var(--on-poster-line);
  --you: var(--on-poster);
  --them: var(--on-poster-muted);
  --them-ink: var(--on-poster-muted);
  --skeleton: var(--on-poster-well);
  /* Its one button is light on the person's colour, as on the report's ending. */
  --accent: var(--on-poster);
  --accent-hover: var(--on-poster-muted);
  --on-accent: var(--poster);
  --focus-ring: 0 0 0 2px var(--poster), 0 0 0 4px var(--on-poster);
  margin-top: calc(-1 * var(--page-top));
  padding: var(--space-6) 0 var(--space-8);
  background: var(--poster);
  color: var(--on-poster);
}

.poster__in {
  display: grid;
  gap: var(--space-8);
}

.poster__head {
  display: grid;
  gap: var(--space-2);
  min-width: 0;
}

.poster__name {
  overflow: hidden;
  font: var(--text-display);
  letter-spacing: var(--tracking-display);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.poster__meta {
  color: var(--on-poster-muted);
  font: var(--text-title);
  font-weight: 400;
}

.cast {
  display: grid;
  gap: var(--space-2);
}

.cast__label {
  color: var(--on-poster-muted);
  font: var(--text-small);
}

.cast__list {
  display: flex;
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  overflow-x: auto;
  list-style: none;
  scrollbar-width: none;
}

.cast__person {
  display: grid;
  justify-items: center;
  gap: var(--space-1);
  width: var(--avatar-lg);
  color: var(--on-poster);
  font: var(--text-caption);
  text-align: center;
  text-decoration: none;
}

.cast__person span:last-child {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* «Вы» on a poster: a light ring keeps the ink circle from sinking into a dark colour. */
.cast__person :deep(.avatar--mine) {
  box-shadow: var(--ring-on-poster);
}

.cast__more {
  display: grid;
  place-items: center;
  width: var(--avatar-md);
  height: var(--avatar-md);
  border-radius: var(--radius-full);
  background: var(--on-poster-chip);
  font: var(--text-ui);
  font-weight: 600;
}

.poster__story {
  justify-self: start;
}

.poster__chapters {
  margin-top: calc(-1 * var(--space-4));
}

@media (max-width: 640px) {
  .poster {
    padding: var(--space-4) 0 var(--space-6);
  }

  .poster__in {
    gap: var(--space-6);
  }

  .poster__story {
    justify-self: stretch;
  }

  /* A long name wraps to two lines instead of losing its end. */
  .poster__name {
    display: -webkit-box;
    white-space: normal;
    overflow-wrap: anywhere;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
}
</style>
