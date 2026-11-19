<script setup lang="ts">
import { REPLY_BUCKETS_SEC, type ReportDto } from '@tg-analyzer/shared'
import { Clock } from '../../lib/icons'

const props = defineProps<{ data: ReportDto }>()
const { t, formatDuration, formatNumber, formatPercent } = useI18n()
const { me, name, rows } = useBalance(() => props.data)
const responses = computed(() => props.data.report.responses)

const buckets = computed(() => {
  const { histogram, mineSamples, theirsSamples } = responses.value
  if (
    !rows.value.some((row) => row.key === 'speed') ||
    histogram?.mine.length !== REPLY_BUCKETS_SEC.length + 1 ||
    histogram.theirs.length !== REPLY_BUCKETS_SEC.length + 1
  )
    return []

  return histogram.mine.map((count, index) => {
    const lower = REPLY_BUCKETS_SEC[index - 1]
    const upper = REPLY_BUCKETS_SEC[index]
    const mine = (count / mineSamples) * 100
    const theirs = (histogram.theirs[index]! / theirsSamples) * 100
    const label =
      lower === undefined
        ? t('report.replies.before', { to: formatDuration(upper) })
        : upper === undefined
          ? t('report.replies.after', { from: formatDuration(lower) })
          : t('report.replies.between', { from: formatDuration(lower), to: formatDuration(upper) })
    return { label, mine, theirs }
  })
})
</script>

<template>
  <ReportSection v-if="buckets.length" id="part-replies" :icon="Clock" :title="t('report.replies.title')">
    <table class="replies t-label">
      <thead>
        <tr>
          <th scope="col">{{ t('report.replies.interval') }}</th>
          <th scope="col">{{ me }}</th>
          <th scope="col" class="replies__theirs">{{ name }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="bucket in buckets" :key="bucket.label">
          <th scope="row">{{ bucket.label }}</th>
          <td>
            <span class="tnum">{{ formatPercent(bucket.mine) }}</span>
            <span class="replies__track" aria-hidden="true"><i :style="{ width: `${bucket.mine}%` }" /></span>
          </td>
          <td class="replies__theirs">
            <span class="tnum">{{ formatPercent(bucket.theirs) }}</span>
            <span class="replies__track" aria-hidden="true"><i :style="{ width: `${bucket.theirs}%` }" /></span>
          </td>
        </tr>
      </tbody>
    </table>
    <p class="replies__note t-caption">
      {{
        t('report.replies.sample', {
          mine: formatNumber(responses.mineSamples),
          theirs: formatNumber(responses.theirsSamples),
        })
      }}
    </p>
  </ReportSection>
</template>

<style scoped>
.replies {
  width: 100%;
  border-collapse: collapse;
  text-align: start;
}

.replies th,
.replies td {
  padding-block: var(--space-1);
  vertical-align: top;
}

.replies th:not(:first-child),
.replies td {
  width: 28%;
  padding-inline-start: var(--space-2);
}

.replies th {
  font: inherit;
  text-align: inherit;
  overflow-wrap: anywhere;
}

.replies :is(thead th:first-child, tbody th),
.replies__note {
  color: var(--text-muted);
}

.replies thead {
  border-block-end: 1px solid var(--border);
}

.replies__track {
  display: block;
  height: var(--space-1);
  border-radius: var(--radius-pill);
  background: var(--surface-2);
}

.replies__track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--text);
}

.replies__theirs {
  color: var(--them-ink);
}

.replies__theirs i {
  background: var(--them);
}
</style>
