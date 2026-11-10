<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

/**
 * «Эмодзи и реакции»: the answer says each side's favourite emoji; one row of the chat's emoji with how
 * often; under it each side's favourite reaction and sticker. `derived.favourites` keeps only what was
 * used often enough to be a taste, so a side without one has no line rather than a weak guess.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, formatNumber } = useI18n()
const you = useYouLabel()

const favourites = computed(() => props.data.derived.favourites)
const name = computed(() => props.data.summary.title)

const answer = computed(() => {
  const { emoji, topEmoji } = favourites.value
  const mine = emoji.mine?.value
  const theirs = emoji.theirs?.value
  if (mine && theirs)
    return mine === theirs
      ? t('report.favourites.same', { emoji: mine })
      : t('report.favourites.both', { me: you.value, mine, name: name.value, theirs })
  if (mine || theirs)
    return t('report.favourites.one', { who: mine ? you.value : name.value, emoji: (mine ?? theirs)! })
  const top = topEmoji[0]
  return top ? t('report.favourites.top', { emoji: top.value }) : null
})

const chips = computed(() => favourites.value.topEmoji.slice(0, 8))

/** Each side's favourite reaction and sticker, as lines under the side's name; empty sides are dropped. */
const sides = computed(() => {
  const { reaction, sticker } = favourites.value
  return (['mine', 'theirs'] as const)
    .map((side) => ({
      key: side,
      name: side === 'mine' ? you.value : name.value,
      lines: [
        reaction[side] && {
          key: 'reaction',
          emoji: reaction[side]!.value,
          label: t('report.favourites.reaction'),
          count: reaction[side]!.count,
        },
        sticker[side]?.emoji && {
          key: 'sticker',
          emoji: sticker[side]!.emoji!,
          label: t('report.favourites.sticker'),
          count: sticker[side]!.count,
        },
      ].filter((line): line is { key: string; emoji: string; label: string; count: number } => Boolean(line)),
    }))
    .filter((side) => side.lines.length)
})
</script>

<template>
  <ReportSection v-if="answer" id="part-favourites" :title="t('report.favourites.title')" :answer="answer">
    <ul v-if="chips.length" class="emoji">
      <li v-for="item in chips" :key="item.value" class="emoji__chip t-label">
        <span class="t-h2">{{ item.value }}</span>
        {{ formatNumber(item.count) }}
      </li>
    </ul>
    <div v-if="sides.length" class="sides">
      <div v-for="side in sides" :key="side.key" class="sides__side">
        <p class="t-label" :class="{ 'sides__name--them': side.key === 'theirs' }">{{ side.name }}</p>
        <p v-for="line in side.lines" :key="line.key" class="sides__line">
          <span class="t-h2">{{ line.emoji }}</span>
          <span class="t-label sides__label">{{ line.label }}</span>
          <span class="t-label">{{ formatNumber(line.count) }}</span>
        </p>
      </div>
    </div>
  </ReportSection>
</template>

<style scoped>
.emoji {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.emoji__chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0 var(--space-3) 0 var(--space-2);
  border-radius: var(--radius-full);
  background: var(--surface-2);
}

.sides {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
  padding-top: var(--space-3);
  box-shadow: var(--divider-top);
}

.sides__side {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.sides__name--them {
  color: var(--them-ink);
}

.sides__line {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.sides__label {
  color: var(--text-muted);
}
</style>
