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
const figure = computed(() =>
  lead.value === 'theirs'
    ? pair.value.theirs.text
    : lead.value === 'mine'
      ? pair.value.mine.text
      : t('report.fmt.startsEven'),
)
const sentence = computed(() =>
  lead.value === 'mine'
    ? t('report.fmt.startsMine')
    : lead.value === 'theirs'
      ? t('report.fmt.startsTheirs', { name: props.theirName })
      : null,
)
</script>

<template>
  <ReportSection :title="item.title">
    <div class="starts">
      <p class="starts__fact">
        <span class="starts__figure t-num">{{ figure }}</span>
        <span v-if="sentence">{{ sentence }}</span>
      </p>
      <i class="starts__bar" role="img" :aria-label="`${pair.mine.text} / ${pair.theirs.text}`">
        <b :style="{ flexGrow: mine }" />
        <b :style="{ flexGrow: 100 - mine }" />
      </i>
      <p class="starts__sides t-num">
        <span>{{ t('report.you') }} · {{ pair.mine.text }}</span>
        <span>{{ theirName }} · {{ pair.theirs.text }}</span>
      </p>
    </div>
  </ReportSection>
</template>

<style scoped>
.starts {
  display: grid;
  gap: var(--space-2);
}

.starts__fact {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-1) var(--space-3);
  font: var(--text-body);
}

.starts__figure {
  font: var(--text-figure);
  letter-spacing: var(--tracking-h2);
}

.starts__bar {
  display: flex;
  gap: 3px;
  height: var(--bar-height);
}

.starts__bar b {
  border-radius: var(--radius-full);
  background: var(--you);
}

.starts__bar b + b {
  background: var(--them);
}

.starts__sides {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  color: var(--text-muted);
  font: var(--text-small);
}
</style>
