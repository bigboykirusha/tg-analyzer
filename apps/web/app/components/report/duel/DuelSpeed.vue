<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import type { Versus } from '../../../composables/useVersus'

/**
 * Reply time answers its own question: who is faster (or «почти одинаково»), both usual
 * answers under it, and the spread of replies below.
 */
const props = defineProps<{ data: ReportDto; item: Versus }>()
const { t } = useI18n()
const name = computed(() => props.data.summary.title)
const responses = computed(() => props.data.report.responses)
const pair = computed(() => props.item.pairs[0]!)

const hasHistogram = computed(
  () => Boolean(responses.value.histogram) && responses.value.mineSamples + responses.value.theirsSamples > 0,
)

/** «Машка — в 2 раза быстрее», or «Почти одинаково» when neither leads. */
const answer = computed(() =>
  props.item.lead ? `${props.item.figure} — ${props.item.note}` : t('report.fmt.speedEven'),
)
</script>

<template>
  <ReportSection
    :title="item.title"
    :text="t('report.speed.text')"
    :answer="answer"
    :sides="{ mine: pair.mine.text, theirs: pair.theirs.text, name }"
  >
    <ReplySpeedChart v-if="hasHistogram" :histogram="responses.histogram!" :received-label="name" />
  </ReportSection>
</template>
