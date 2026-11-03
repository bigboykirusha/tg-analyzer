<script setup lang="ts">
import type { InsightDto, ReportDto } from '@tg-analyzer/shared'

/**
 * «Главное»: what the report says nowhere else, each as a figure over one plain
 * sentence. The sentence names whom it is about, so the figures stay ink.
 */
const props = defineProps<{ data: ReportDto; bare?: boolean }>()
const { t, tc, formatNumber, formatDay } = useI18n()

const name = computed(() => props.data.summary.title)

function num(insight: InsightDto, key: string) {
  const value = insight.values[key]
  return typeof value === 'number' ? value : 0
}

function describe(insight: InsightDto): { figure: string; text: string } | null {
  const side = insight.side === 'mine' ? 'mine' : 'theirs'
  switch (insight.id) {
    case 'double_texts':
    case 'laughs':
      return {
        figure: formatNumber(num(insight, 'count')),
        text: t(`insight.${insight.id}.${side}`, { name: name.value, other: formatNumber(num(insight, 'other')) }),
      }
    case 'long_silence':
      return {
        figure: tc('insight.days', num(insight, 'days')),
        text: t(`insight.long_silence.${side}`, { name: name.value }),
      }
    case 'busiest_day':
      return {
        figure: formatDay(String(insight.values.date), { day: 'numeric', month: 'long' }),
        text: tc('insight.busiest_day', num(insight, 'count')),
      }
    // Legacy stored insights must not reintroduce a misleading reply-rate verdict.
    case 'reply_rate':
      return null
    default:
      return null
  }
}

const items = computed(() =>
  (props.data.derived.insights ?? []).flatMap((insight) => {
    const described = describe(insight)
    return described ? [{ ...described, id: insight.id }] : []
  }),
)
</script>

<template>
  <section
    v-if="items.length > 1"
    class="insights"
    :class="{ tile: !bare, 'insights--bare': bare }"
    aria-labelledby="insights-title"
  >
    <h2 id="insights-title" :class="bare ? 'sr-only' : 'insights__title'">{{ t('insight.title') }}</h2>
    <ol class="insights__list">
      <li v-for="item in items" :key="item.id" class="insight">
        <span class="insight__figure">{{ item.figure }}</span>
        <p class="insight__text">{{ item.text }}</p>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.insights {
  gap: var(--space-4);
}

.insights--bare {
  display: grid;
  padding-top: var(--space-4);
  border-top: 1px solid var(--border);
}

.insights__title {
  font: var(--text-title);
}

/* One row of up to four facts; a figure over one plain sentence each. */
.insights__list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-4) var(--space-6);
  list-style: none;
}

.insight {
  display: grid;
  align-content: start;
  gap: var(--space-1);
}

.insight__figure {
  font: var(--text-h3);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.03em;
  white-space: nowrap;
}

.insight__text {
  color: var(--text-muted);
  font: var(--text-small);
  text-wrap: pretty;
}

/* Phones: a list, figure and sentence side by side would crowd; keep them stacked with hairlines. */
@media (max-width: 640px) {
  .insights__list {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }

  .insight {
    padding-block: var(--space-3);
  }

  .insight + .insight {
    border-top: 1px solid var(--border);
  }

  .insight:first-child {
    padding-top: 0;
  }

  .insight:last-child {
    padding-bottom: 0;
  }
}
</style>
