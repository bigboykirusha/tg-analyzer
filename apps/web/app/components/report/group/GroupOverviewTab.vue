<script setup lang="ts">
import type { GroupReportDto } from '@tg-analyzer/shared'

/** The top of «Люди»: the awards, led by what stands out about the group. */
const props = defineProps<{ group: GroupReportDto }>()
const { t, formatPercent } = useI18n()
const nameOf = useParticipantName()
const pairName = usePairNames(() => props.group)

const ranked = computed(() => [...props.group.participants].sort((a, b) => b.messageCount - a.messageCount))
const health = computed(() => props.group.health)

const insights = computed(() => {
  const items: string[] = []
  const top = ranked.value[0]
  if (top && top.messageShare >= 35) {
    items.push(t('group.insight.dominant', { name: nameOf(top), share: formatPercent(top.messageShare) }))
  }
  if ((health.value?.lurkerRatio ?? 0) >= 45) items.push(t('group.insight.smallCore'))
  const pair = props.group.topPairs[0]
  if (pair) {
    items.push(
      t('group.insight.densestPair', {
        left: pairName(pair.leftParticipantId, pair.leftParticipantName),
        right: pairName(pair.rightParticipantId, pair.rightParticipantName),
      }),
    )
  }
  if (health.value?.momentum === 'growing') items.push(t('group.insight.growing'))
  return items
})
</script>

<template>
  <GroupAwards :group="group" :insights="insights" />
</template>
