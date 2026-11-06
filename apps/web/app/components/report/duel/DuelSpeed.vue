<script setup lang="ts">
import type { Versus } from '../../../composables/useVersus'

/**
 * Who replies faster: the answer in one sentence and one line of the two usual reply times. The
 * longer part of the line is the slower side. When neither leads, a line would still look like a
 * lead, so the two times stand side by side instead.
 */
const props = defineProps<{ item: Versus; theirName: string }>()
const { t } = useI18n()
const pair = computed(() => props.item.pairs[0]!)

/** «Мила — в 2 раза быстрее», or «Отвечаете синхронно» when neither leads. */
const answer = computed(() =>
  props.item.lead ? `${props.item.figure} — ${props.item.note}` : t('report.fmt.speedEven'),
)
</script>

<template>
  <ReportSection :title="item.title" :text="t('report.speed.text')" :answer="answer">
    <ReportLine
      v-if="item.lead"
      :mine="pair.mine.value"
      :theirs="pair.theirs.value"
      :left="pair.mine.text"
      :right="pair.theirs.text"
    />
    <p v-else class="speed-pair t-num">
      <span><ReportSideAvatar side="mine" :name="theirName" />{{ pair.mine.text }}</span>
      <span><ReportSideAvatar side="theirs" :name="theirName" />{{ pair.theirs.text }}</span>
    </p>
  </ReportSection>
</template>

<style scoped>
.speed-pair {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-6);
  font: var(--text-small);
  color: var(--text-muted);
}

.speed-pair > span {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}
</style>
