<script setup lang="ts">
import type { InsightDto, ReportDto } from '@tg-analyzer/shared'

/**
 * «Главное»: the strongest patterns of a private chat, each as a figure in the
 * margin and one plain sentence. The figure takes the colour of whoever the
 * sentence is about.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatNumber, formatPercent } = useI18n()

const name = computed(() => props.data.summary.title)

function num(insight: InsightDto, key: string) {
  const value = insight.values[key]
  return typeof value === 'number' ? value : 0
}

function describe(insight: InsightDto): { figure: string; text: string } | null {
  const mine = insight.side === 'mine'
  const params = { name: name.value }
  // The reply speed is a KPI tile, the streak and the trend are in «Время»: «Главное» keeps what is said nowhere else.
  if (insight.id === 'reply_speed' || insight.id === 'streak' || insight.id === 'trend') return null
  switch (insight.id) {
    case 'initiative':
    case 'last_word':
      return {
        figure: formatPercent(num(insight, 'pct')),
        text: t(`insight.${insight.id}.${mine ? 'mine' : 'theirs'}`, params),
      }
    case 'night_talks':
      return { figure: formatPercent(num(insight, 'pct')), text: t('insight.night_talks') }
    case 'double_texts':
    case 'questions':
    case 'laughs':
      return {
        figure: formatNumber(num(insight, 'count')),
        text: t(`insight.${insight.id}.${mine ? 'mine' : 'theirs'}`, {
          ...params,
          other: formatNumber(num(insight, 'other')),
        }),
      }
    case 'long_silence':
      return {
        figure: tc('insight.days', num(insight, 'days')),
        text: t(`insight.long_silence.${mine ? 'mine' : 'theirs'}`, params),
      }
    default:
      return null
  }
}

const items = computed(() =>
  (props.data.derived.insights ?? []).flatMap((insight) => {
    const described = describe(insight)
    return described ? [{ ...described, id: insight.id, side: insight.side }] : []
  }),
)
</script>

<template>
  <section v-if="items.length" class="tile insights" aria-labelledby="insights-title">
    <h2 id="insights-title" class="tile__label insights__title">{{ t('insight.title') }}</h2>
    <ol class="insights__list">
      <li v-for="item in items" :key="item.id" class="insight">
        <span class="insight__figure t-figure" :class="`insight__figure--${item.side}`">{{ item.figure }}</span>
        <p class="insight__text">{{ item.text }}</p>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.insights {
  gap: var(--space-2);
}

.insights__list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 var(--space-8);
  list-style: none;
}

/* A figure over one plain sentence, rows split by hairlines. */
.insight {
  display: grid;
  align-content: start;
  gap: var(--space-1);
  padding-block: var(--space-4);
  border-top: 1px solid var(--border);
}

.insights__list > .insight:nth-child(-n + 2) {
  border-top: 0;
}

.insight__figure {
  font: 600 28px/32px var(--font-sans);
  font-variant-numeric: tabular-nums lining-nums;
  letter-spacing: -0.04em;
  white-space: nowrap;
}

.insight__figure--mine {
  color: var(--you-ink);
}

.insight__figure--theirs {
  color: var(--them-ink);
}

.insight__text {
  color: var(--text-muted);
  font: var(--text-ui);
  font-weight: 400;
  text-wrap: pretty;
}

@media (max-width: 640px) {
  .insights__list {
    grid-template-columns: minmax(0, 1fr);
  }

  .insights__list > .insight:nth-child(2) {
    border-top: 1px solid var(--border);
  }

  .insight__figure {
    font-size: 24px;
    line-height: 28px;
  }
}
</style>
