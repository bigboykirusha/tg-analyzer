<script setup lang="ts">
import type { Component } from 'vue'
import type { ReportDto } from '@tg-analyzer/shared'
import { Clock, Flame, Quote, Scale, Users } from '../../lib/icons'

/**
 * «Главное»: the verdict right under the poster — up to three findings, each the very line its card answers, read
 * from the same functions the cards read (`useStreak`, `useWordsFacts`, `useMatch`, `useBalance`, `usePeakWindow`),
 * so the verdict and the report never say two things. The three strongest the chat has, in a fixed order: the run of
 * days, the word of the chat, who leads the head to head, an uneven balance, the usual window, an even balance.
 * A finding its card would not draw is skipped; each row scrolls to its card.
 */
const props = defineProps<{ data: ReportDto; noWords?: boolean }>()
const { t } = useI18n()
const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')

const streak = useStreak(() => props.data)
const words = useWordsFacts(() => props.data)
const match = useMatch(() => props.data)
const balance = useBalance(() => props.data)
const peak = usePeakWindow(() => props.data)

interface Finding {
  key: string
  target: string
  icon: Component
  title: string
  subtitle?: string
}

const findings = computed(() => {
  const out: Finding[] = []
  if (streak.value)
    out.push({
      key: 'streak',
      target: 'part-streak',
      icon: Flame,
      title: streak.value.figure,
      subtitle: streak.value.answer,
    })
  if (!props.noWords && words.word.value && words.figure.value)
    out.push({
      key: 'word',
      target: 'part-word',
      icon: Quote,
      title: words.figure.value,
      subtitle: words.answer.value,
    })
  // Head to head: only when someone leads; «almost even everywhere» is the weakest thing it can say.
  if (match.answer.value && !match.mostlyEven.value && match.tally.value.mine !== match.tally.value.theirs)
    out.push({ key: 'match', target: 'part-match', icon: Users, title: match.answer.value })
  const unevenBalance = Boolean(balance.figure.value)
  if (balance.answer.value && balance.headline.value && unevenBalance)
    out.push({
      key: 'balance',
      target: 'part-balance',
      icon: Scale,
      title: balance.headline.value,
      subtitle: balance.answer.value,
    })
  if (peak.answer.value) out.push({ key: 'time', target: 'part-time', icon: Clock, title: peak.answer.value })
  if (balance.answer.value && balance.headline.value && !unevenBalance)
    out.push({
      key: 'balance',
      target: 'part-balance',
      icon: Scale,
      title: balance.headline.value,
      subtitle: balance.answer.value,
    })
  return out.slice(0, 3)
})

function go(event: MouseEvent, target: string) {
  const card = document.getElementById(target)
  if (!card) return
  event.preventDefault()
  card.scrollIntoView({ behavior: reduced.value ? 'auto' : 'smooth', block: 'start' })
}
</script>

<template>
  <UiGroup v-if="findings.length" class="highlights" :header="t('report.highlights.title')">
    <UiListRow
      v-for="item in findings"
      :key="item.key"
      :href="`#${item.target}`"
      :title="item.title"
      :subtitle="item.subtitle"
      wrap
      chevron
      @click="go($event, item.target)"
    >
      <template #leading><component :is="item.icon" class="highlights__icon" aria-hidden="true" /></template>
    </UiListRow>
  </UiGroup>
</template>

<style scoped>
/* The topic's glyph in the person's ink, as in the cards' own labels. */
.highlights :deep(.list-row__leading) {
  color: var(--them-ink);
}
</style>
