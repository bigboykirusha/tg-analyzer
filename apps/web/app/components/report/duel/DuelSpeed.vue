<script setup lang="ts">
import type { Versus } from '../../../composables/useVersus'

/**
 * Who replies faster: the answer in one sentence and one line of the two usual reply times. The
 * longer part of the line is the slower side.
 */
const props = defineProps<{ item: Versus }>()
const { t } = useI18n()
const pair = computed(() => props.item.pairs[0]!)

/** «Мила — в 2 раза быстрее», or «Отвечаете синхронно» when neither leads. */
const answer = computed(() =>
  props.item.lead ? `${props.item.figure} — ${props.item.note}` : t('report.fmt.speedEven'),
)
</script>

<template>
  <ReportSection :title="item.title" :text="t('report.speed.text')" :answer="answer">
    <ReportLine :mine="pair.mine.value" :theirs="pair.theirs.value" :left="pair.mine.text" :right="pair.theirs.text" />
  </ReportSection>
</template>
