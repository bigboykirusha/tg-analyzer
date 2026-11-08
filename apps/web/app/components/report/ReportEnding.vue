<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { Play, Send, Share } from '../../lib/icons'
import { hueOf } from '../../lib/hue'

/**
 * The end of a report mirrors its start: the poster again, full width, with the same pulse, and the
 * things worth doing next — your own report: watch «Итоги» and share; the example and a shared link:
 * an invitation to make one's own (`invite`). Every report closes on the person, not on the last table.
 */
const props = defineProps<{
  data: ReportDto
  /** The example or a shared link: one action, to the reader's own report. */
  invite?: { title: string; text: string; cta: string }
  /** «Кого разобрать следующим»: the busiest chat of the month without a report. */
  next?: { chatId: string; title: string; messages: number } | null
  /** That chat's analysis is starting or queued. */
  nextBusy?: boolean
}>()
const emit = defineEmits<{ story: []; share: []; analyse: [chatId: string] }>()
const { t, tc } = useI18n()
const titleId = useId()
const nextId = useId()
const isGroup = computed(() => props.data.summary.type === 'group')
</script>

<template>
  <section class="ending no-print" :class="{ 'ending--with-next': next && !invite }" :aria-labelledby="titleId">
    <UiPageContainer class="ending__in">
      <ReportPulse :data="data" bare class="ending__pulse" />
      <div v-if="invite" class="ending__copy">
        <h2 :id="titleId" class="ending__title">{{ invite.title }}</h2>
        <p class="ending__lede">{{ invite.text }}</p>
      </div>
      <div v-else class="ending__copy">
        <h2 :id="titleId" class="ending__title">{{ t('share.title', { name: data.summary.title }) }}</h2>
        <p class="ending__lede">{{ isGroup ? t('report.ending.ledeGroup') : t('report.ending.lede') }}</p>
      </div>
      <div v-if="invite" class="ending__actions">
        <UiButton variant="primary" size="lg" :icon="Send" to="/login">{{ invite.cta }}</UiButton>
      </div>
      <div v-else class="ending__actions">
        <UiButton variant="primary" size="lg" :icon="Play" @click="emit('story')">{{ t('share.watch') }}</UiButton>
        <UiButton variant="ghost" size="lg" :icon="Share" aria-haspopup="dialog" @click="emit('share')">
          {{ t('share.open') }}
        </UiButton>
      </div>
    </UiPageContainer>
  </section>
  <UiPageContainer v-if="next && !invite" class="ending__after no-print">
    <section v-if="next && !invite" class="ending__next" :data-hue="hueOf(next.chatId)" :aria-labelledby="nextId">
      <h3 :id="nextId" class="ending__next-title">{{ t('report.ending.next') }}</h3>
      <div class="ending__next-row">
        <ChatAvatar :chat-id="next.chatId" :title="next.title" />
        <span class="ending__next-copy">
          <strong>{{ next.title }}</strong>
          <span class="t-num">{{ tc('report.ending.nextMeta', next.messages) }}</span>
        </span>
        <UiButton variant="secondary" size="sm" :loading="nextBusy" @click="emit('analyse', next.chatId)">
          {{ t('dashboard.analyse') }}
        </UiButton>
      </div>
    </section>
  </UiPageContainer>
</template>

<style scoped>
/* The poster's own ink: light type and a light button on the person's colour, like the top. */
.ending {
  --text: var(--on-poster);
  --text-muted: var(--on-poster-muted);
  --border: var(--on-poster-line);
  --you: var(--on-poster);
  --them: var(--on-poster-muted);
  --them-ink: var(--on-poster-muted);
  --accent: var(--on-poster);
  --accent-hover: var(--on-poster-muted);
  --on-accent: var(--poster);
  --hover: var(--on-poster-well);
  --pressed: var(--on-poster-line);
  --focus-ring: 0 0 0 2px var(--poster), 0 0 0 4px var(--on-poster);
  margin-top: var(--page-gap);
  margin-bottom: calc(-1 * var(--page-bottom));
  padding: var(--space-12) 0 calc(var(--space-12) + env(safe-area-inset-bottom, 0px));
  background: var(--poster);
  color: var(--on-poster);
}

.ending__in {
  display: grid;
  gap: var(--space-8);
}

.ending__copy {
  display: grid;
  gap: var(--space-2);
  max-width: var(--measure);
}

.ending__title {
  font: var(--text-h1);
  letter-spacing: var(--tracking-h1);
  text-wrap: balance;
}

.ending__lede {
  color: var(--on-poster-muted);
  font: var(--text-body);
  text-wrap: pretty;
}

.ending__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

/* With «Кого разобрать следующим» the poster stops short of the page's end; the card follows on the room. */
.ending--with-next {
  margin-bottom: 0;
}

.ending__after {
  padding-top: var(--page-gap);
}

.ending__next {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-3);
  padding: var(--card-padding);
  border-radius: var(--radius-lg);
  background: var(--surface);
}

.ending__next-title {
  font: var(--text-h3);
  letter-spacing: var(--tracking-h3);
}

.ending__next-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.ending__next-copy {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 1fr);
  min-width: 0;
}

.ending__next-copy strong {
  overflow: hidden;
  font: var(--text-title);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ending__next-copy span {
  min-width: 0;
  color: var(--text-muted);
  font: var(--text-small);
  text-wrap: pretty;
}

@media (max-width: 640px) {
  .ending {
    padding: var(--space-8) 0 calc(var(--space-8) + env(safe-area-inset-bottom, 0px));
  }

  .ending__in {
    gap: var(--space-6);
  }

  .ending__actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
