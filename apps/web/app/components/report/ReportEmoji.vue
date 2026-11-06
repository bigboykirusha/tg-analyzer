<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

/**
 * «Любимые эмодзи»: the chat's favourite emoji, each with one line of who sends it — you on the
 * left, the other side on the right. On wide screens two columns, ranks read down each column.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, formatNumber } = useI18n()

const MAX = 6

const rows = computed(() => {
  const { topEmoji, topEmojiBySender } = props.data.report.vocabulary
  const count = (items: { value: string; count: number }[], value: string) =>
    items.find((item) => item.value === value)?.count ?? 0
  return topEmoji.slice(0, MAX).map((item) => ({
    value: item.value,
    mine: count(topEmojiBySender.mine, item.value),
    theirs: count(topEmojiBySender.theirs, item.value),
  }))
})
</script>

<template>
  <ReportSection v-if="rows.length" wide :title="t('report.emoji.title')">
    <ol class="emoji-rows" :style="{ '--rows': Math.ceil(rows.length / 2) }">
      <li v-for="row in rows" :key="row.value" class="emoji-rows__row">
        <span class="emoji-rows__emoji">{{ row.value }}</span>
        <ReportLine
          :mine="row.mine"
          :theirs="row.theirs"
          :left="formatNumber(row.mine)"
          :right="formatNumber(row.theirs)"
        />
      </li>
    </ol>
  </ReportSection>
</template>

<style scoped>
.emoji-rows {
  display: grid;
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (min-width: 901px) {
  .emoji-rows {
    grid-auto-flow: column;
    grid-template-rows: repeat(var(--rows), auto);
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.emoji-rows__row {
  display: grid;
  grid-template-columns: var(--emoji-size) minmax(0, 1fr);
  align-items: center;
  gap: var(--space-2);
}

.emoji-rows__emoji {
  font-size: var(--emoji-size);
  line-height: 1;
}
</style>
