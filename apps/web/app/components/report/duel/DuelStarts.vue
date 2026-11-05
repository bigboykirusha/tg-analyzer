<script setup lang="ts">
import type { Versus } from '../../../composables/useVersus'

/**
 * Who starts a conversation, kept small: the leader's share as a figure, who it is, and the
 * split as one bar. It sits under the reply-time card's neighbour, so it stays short.
 */
const props = defineProps<{ item: Versus; theirName: string }>()
const { t } = useI18n()

const pair = computed(() => props.item.pairs[0]!)
const mine = computed(() => pair.value.mine.value)
const lead = computed(() => (mine.value > 50 ? 'mine' : mine.value < 50 ? 'theirs' : null))
/** «Чаще вы — 51% разговоров», «Чаще Машка — 53% разговоров», or «Поровну». */
const answer = computed(() =>
  lead.value === 'mine'
    ? t('report.fmt.startsMine', { share: pair.value.mine.text })
    : lead.value === 'theirs'
      ? t('report.fmt.startsTheirs', { name: props.theirName, share: pair.value.theirs.text })
      : t('report.fmt.startsEven'),
)
</script>

<template>
  <ReportSection
    :title="item.title"
    :answer="answer"
    :sides="{ mine: pair.mine.text, theirs: pair.theirs.text, name: theirName }"
  >
    <i class="split-bar" role="img" :aria-label="`${pair.mine.text} / ${pair.theirs.text}`">
      <b :style="{ flexGrow: mine }" />
      <b :style="{ flexGrow: 100 - mine }" />
    </i>
  </ReportSection>
</template>
