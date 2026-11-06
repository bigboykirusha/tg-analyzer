<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { Mic } from '../../../lib/icons'

/** The longest voice message as a poster: its length like a clock, who recorded it and when. */
const props = defineProps<{ data: ReportDto }>()
const { t, formatCountdown, formatDay } = useI18n()

const longest = computed(() => props.data.report.voice?.voice.longest ?? null)
const who = computed(() => (longest.value?.mine ? t('report.you') : props.data.summary.title))
const day = computed(() =>
  longest.value ? formatDay(longest.value.at.slice(0, 10), { day: 'numeric', month: 'long' }) : '',
)
</script>

<template>
  <ReportSection v-if="longest && longest.seconds >= 60" :title="t('report.longestVoice.title')">
    <div class="longest">
      <span class="longest__badge" :class="{ 'longest__badge--theirs': !longest.mine }"><Mic class="icon-lg" /></span>
      <span class="longest__time">{{ formatCountdown(longest.seconds) }}</span>
    </div>
    <p class="longest__by">
      <ReportSideAvatar :side="longest.mine ? 'mine' : 'theirs'" :name="data.summary.title" />
      {{ who }} · {{ day }}
    </p>
  </ReportSection>
</template>

<style scoped>
.longest {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.longest__badge {
  display: grid;
  flex: none;
  place-items: center;
  width: var(--control-lg);
  height: var(--control-lg);
  border-radius: var(--radius-full);
  background: var(--surface-2);
  color: var(--you);
}

/* The colour of the side that recorded it. */
.longest__badge--theirs {
  color: var(--them-ink);
}

.longest__time {
  font: var(--text-figure-lg);
  letter-spacing: var(--tracking-figure);
}

.longest__by {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-muted);
  font: var(--text-small);
}
</style>
