<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

const props = defineProps<{ data: ReportDto }>()
const { t } = useI18n()

const responses = computed(() => props.data.report.responses)
</script>

<template>
  <ReportDuel :data="data" />

  <ReportSection
    v-if="responses.histogram && responses.mineSamples + responses.theirsSamples > 0"
    :title="t('report.speed.title')"
    :text="t('report.speed.text')"
  >
    <ReplySpeedChart :histogram="responses.histogram" :received-label="data.summary.title" />
  </ReportSection>
</template>
