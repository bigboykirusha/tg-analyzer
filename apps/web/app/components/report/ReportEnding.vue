<script setup lang="ts">
import { fillDailyGaps, type ReportDto } from '@tg-analyzer/shared'
import { Play, Share } from '../../lib/icons'

/**
 * The end of a report mirrors its start: the person's poster again, its pulse, «Итоги» and sharing. The
 * example and a shared link end on an invitation to one's own report instead (`invite`).
 * Phones: the poster runs edge to edge at the bottom. Desktop: a poster tile in the column, the copy on
 * the left, the pulse on the right.
 */
const props = defineProps<{
  data: ReportDto
  invite?: { title: string; text: string; cta: string }
}>()
const emit = defineEmits<{ story: []; share: [] }>()
const { t } = useI18n()
const titleId = useId()
const wide = useMediaQuery('(min-width: 901px)')
const days = computed(() => fillDailyGaps(props.data.report.activity.daily))
const lede = computed(() =>
  props.data.summary.type === 'group' ? t('report.ending.ledeGroup') : t('report.ending.lede'),
)
</script>

<template>
  <section class="ending no-print" :aria-labelledby="titleId">
    <UiPageContainer>
      <div class="ending__card">
        <Pulse
          v-if="days.length > 1"
          class="ending__pulse"
          :data="days"
          :bars="wide ? 72 : 56"
          :height="wide ? 40 : 24"
        />
        <div class="ending__copy">
          <h2 :id="titleId" class="ending__title">
            {{ invite?.title ?? t('share.title', { name: data.summary.title }) }}
          </h2>
          <p class="ending__lede">{{ invite?.text ?? lede }}</p>
          <div class="ending__actions">
            <UiButton v-if="invite" variant="poster" size="lg" to="/login">{{ invite.cta }}</UiButton>
            <template v-else>
              <UiButton variant="poster" size="lg" :icon="Play" @click="emit('story')">{{ t('share.watch') }}</UiButton>
              <UiButton variant="poster-soft" size="lg" :icon="Share" aria-haspopup="dialog" @click="emit('share')">
                {{ t('share.open') }}
              </UiButton>
            </template>
          </div>
        </div>
      </div>
    </UiPageContainer>
  </section>
</template>

<style scoped>
.ending {
  --text: var(--on-poster);
  --text-muted: var(--on-poster-muted);
  --pulse-you: var(--on-poster);
  --pulse-them: var(--on-them);
  margin-top: var(--page-gap);
  margin-bottom: calc(-1 * var(--page-bottom));
  padding: var(--space-8) 0 calc(var(--space-6) + env(safe-area-inset-bottom, 0px));
  background: var(--poster);
  color: var(--on-poster);
}

.ending__card {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.ending__copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
}

.ending__title {
  font: var(--text-h1);
  letter-spacing: var(--tracking-h1);
  text-wrap: balance;
}

.ending__lede {
  max-width: var(--measure);
  color: var(--on-poster-muted);
  font: var(--text-small);
  text-wrap: pretty;
}

.ending__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-top: var(--space-2);
}

/* Desktop: a poster tile at the end of the column, the pulse beside the copy. */
@media (min-width: 901px) {
  .ending {
    margin-bottom: 0;
    padding: 0;
    background: transparent;
  }

  .ending__card {
    flex-direction: row-reverse;
    align-items: center;
    gap: var(--space-10);
    padding: var(--space-8);
    border-radius: var(--radius-lg);
    background: var(--poster);
  }

  .ending__pulse {
    flex: 1;
  }

  .ending__copy {
    flex: 1;
  }

  .ending__lede {
    font: var(--text-body);
  }

  .ending__actions {
    flex-direction: row;
  }
}
</style>
