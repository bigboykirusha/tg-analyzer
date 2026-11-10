<script setup lang="ts">
import type { Versus } from '../../../composables/useVersus'

/**
 * Who replies faster: the answer as a sentence («Мила отвечает в 3 раза быстрее»), then the two usual
 * reply times side by side — no bar, since a longer one would read as better.
 */
const props = defineProps<{ item: Versus; theirName: string }>()
const { t } = useI18n()
const pair = computed(() => props.item.pairs[0]!)

const answer = computed(() => {
  const { lead, note } = props.item
  if (lead === 'mine') return t('report.speed.answerMine', { note })
  if (lead === 'theirs') return t('report.speed.answerTheirs', { name: props.theirName, note })
  return t('report.fmt.speedEven')
})
</script>

<template>
  <ReportSection :title="item.title" :answer="answer">
    <ReportLine
      size="lg"
      :bar="false"
      :mine="pair.mine.value"
      :theirs="pair.theirs.value"
      :right-name="theirName"
      :left="pair.mine.text"
      :right="pair.theirs.text"
    />
    <template #note>{{ t('report.speed.text') }}</template>
  </ReportSection>
</template>
