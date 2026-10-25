<script setup lang="ts">
import type { InsightDto, ReportDto } from '@tg-analyzer/shared'

/**
 * «Главное»: the strongest patterns of a private chat, each as a figure in the
 * margin and one plain sentence. The figure takes the colour of whoever the
 * sentence is about.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatDuration, formatNumber, formatPercent } = useI18n()

const name = computed(() => props.data.summary.title)

function num(insight: InsightDto, key: string) {
  const value = insight.values[key]
  return typeof value === 'number' ? value : 0
}

function describe(insight: InsightDto): { figure: string; text: string } | null {
  const mine = insight.side === 'mine'
  const params = { name: name.value }
  switch (insight.id) {
    case 'initiative':
    case 'last_word':
      return {
        figure: formatPercent(num(insight, 'pct')),
        text: t(`insight.${insight.id}.${mine ? 'mine' : 'theirs'}`, params),
      }
    case 'night_talks':
      return { figure: formatPercent(num(insight, 'pct')), text: t('insight.night_talks') }
    case 'reply_speed':
      return {
        figure: formatDuration(num(insight, 'fastSec')),
        text: t(`insight.reply_speed.${mine ? 'mine' : 'theirs'}`, {
          ...params,
          slow: formatDuration(num(insight, 'slowSec')),
        }),
      }
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
    case 'streak':
      return { figure: tc('insight.days', num(insight, 'days')), text: t('insight.streak') }
    case 'trend':
      return {
        figure: insight.values.trend === 'growing' ? '↗' : '↘',
        text: t(insight.values.trend === 'growing' ? 'insight.trend.growing' : 'insight.trend.fading'),
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
  <section v-if="items.length" class="insights" aria-labelledby="insights-title">
    <h2 id="insights-title" class="t-label insights__title">{{ t('insight.title') }}</h2>
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
  display: grid;
  gap: var(--space-4);
}

.insights__list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 var(--space-8);
  list-style: none;
}

/* A ledger: a hairline above each line, the figure in the left margin. */
.insight {
  display: grid;
  grid-template-columns: 136px minmax(0, 1fr);
  align-items: baseline;
  gap: var(--space-4);
  padding-block: var(--space-4);
  border-top: 1px solid var(--border);
}

.insight__figure {
  font: 600 28px/32px var(--font-display);
  font-variant-numeric: tabular-nums lining-nums;
  letter-spacing: -0.02em;
  white-space: nowrap;
}

.insight__figure--mine {
  color: var(--you-ink);
}

.insight__figure--theirs {
  color: var(--them-ink);
}

.insight__text {
  font: var(--text-body);
  text-wrap: pretty;
}

@media (max-width: 900px) {
  .insights__list {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 480px) {
  .insight {
    grid-template-columns: 84px minmax(0, 1fr);
    gap: var(--space-3);
  }

  .insight__figure {
    font-size: 22px;
    line-height: 28px;
  }
}
</style>
