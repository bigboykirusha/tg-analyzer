<script setup lang="ts">
import { fillDailyGaps, isEven, type PublicReportDto } from '@tg-analyzer/shared'
import { nbsp } from '../../lib/nbsp'

/**
 * A report opened by a shared link, without signing in: the same composition as the owner's report —
 * the poster, then the cards of one anatomy («Баланс», «Время», «Слова», «Эмодзи и реакции») — told in
 * the third person: the author's name stands where the owner reads «вы» («Мила и Аня пишут на равных»),
 * because the reader is the other side. Words and emoji come only when the author allowed them. It ends
 * on an invitation to one's own report, a card in the flow, so it never covers the text.
 */
const props = defineProps<{ share: PublicReportDto }>()
const { t, tc, formatNumber, formatDuration, formatDay, formatPercent } = useI18n()

const data = computed(() => {
  const value = props.share.data
  return { ...value, summary: { ...value.summary, title: value.summary.title || t('share.partner') } }
})
const report = computed(() => data.value.report)
const author = computed(() => (props.share.settings.showName ? props.share.author : t('share.author')))
const partner = computed(() => data.value.summary.title)
provideReportAuthor(() => author.value)

const days = computed(() => fillDailyGaps(report.value.activity.daily))
const heading = computed(() => t('publicReport.pair', { me: author.value, name: partner.value }))
const lede = computed(() => {
  const messages = tc('common.messagesCount', report.value.totals.messages)
  const first = days.value[0]?.date
  return first
    ? t('publicReport.lede', {
        name: author.value,
        messages,
        date: formatDay(first, { day: 'numeric', month: 'long', year: 'numeric' }).replace(/\s?г\.$/u, ''),
      })
    : messages
})

const totals = computed(() => report.value.totals)
/** «×1,8»: how many times more the leader writes, to a tenth. */
const times = (ratio: number) => `×${formatNumber(ratio >= 10 ? Math.round(ratio) : Math.round(ratio * 10) / 10)}`
const lead = computed(() => {
  const { sent, received } = totals.value
  if (!sent && !received) return null
  if (isEven(sent, received)) return { even: true as const }
  const ratio = Math.max(sent, received) / Math.max(1, Math.min(sent, received))
  return { even: false as const, figure: times(ratio), name: sent > received ? author.value : partner.value }
})
const answer = computed(() => {
  const item = lead.value
  if (!item) return null
  return item.even
    ? t('publicReport.even', { me: author.value, name: partner.value })
    : t('publicReport.writesMore', { name: item.name })
})
const rows = computed(() => {
  const { sent, received, messages } = totals.value
  const { medianMineSec: mineSec, medianTheirsSec: theirsSec, iWriteFirstPct } = report.value.responses
  const out = [
    {
      key: 'messages',
      label: t('report.balance.messages'),
      mine: sent,
      theirs: received,
      left: formatPercent((sent / Math.max(1, messages)) * 100),
      right: formatPercent((received / Math.max(1, messages)) * 100),
    },
  ]
  if (mineSec && theirsSec)
    out.push({
      key: 'speed',
      label: t('report.balance.speed'),
      mine: 1 / mineSec,
      theirs: 1 / theirsSec,
      left: nbsp(formatDuration(mineSec)),
      right: nbsp(formatDuration(theirsSec)),
    })
  if (iWriteFirstPct !== null && !data.value.derived.habitRows.skipped.includes('starts'))
    out.push({
      key: 'starts',
      label: t('report.balance.starts'),
      mine: iWriteFirstPct,
      theirs: 100 - iWriteFirstPct,
      left: formatPercent(iWriteFirstPct),
      right: formatPercent(100 - iWriteFirstPct),
    })
  return out
})

const allowed = computed(() => props.share.settings.words)
const view = computed(() => data.value.derived.words.view)
const word = computed(() => view.value.wordOfChat)
const mineWords = computed(() => view.value.vocabulary.mine.slice(0, 5))
const theirWords = computed(() => view.value.vocabulary.theirs.slice(0, 5))
const wordsAnswer = computed(() => (word.value ? tc('report.words.word', word.value.count) : t('report.words.differ')))
const hasWords = computed(
  () => allowed.value && Boolean(word.value || mineWords.value.length || theirWords.value.length),
)
</script>

<template>
  <div class="guest">
    <ReportPoster :data="data" :heading="heading" :lede="lede" />
    <UiPageContainer>
      <div class="guest__flow">
        <h2 class="sr-only">{{ t('publicReport.mainTitle') }}</h2>
        <ReportSection
          v-if="answer"
          :title="t('report.balance.title')"
          :figure="lead && !lead.even ? lead.figure : null"
          :answer="answer"
        >
          <div class="guest__rows">
            <div v-for="row in rows" :key="row.key" class="guest__row">
              <p class="t-label">{{ row.label }}</p>
              <ReportLine
                :mine="row.mine"
                :theirs="row.theirs"
                :left="row.left"
                :right="row.right"
                :left-name="author"
                :right-name="partner"
              />
            </div>
          </div>
        </ReportSection>

        <ReportTime :data="data" />

        <ReportSection
          v-if="hasWords"
          :title="t('report.words.card')"
          :figure="word ? `«${word.value}»` : null"
          :answer="wordsAnswer"
        >
          <div v-if="mineWords.length || theirWords.length" class="guest__words">
            <div v-if="mineWords.length" class="guest__side">
              <p class="t-label">{{ author }}</p>
              <WordChips :items="mineWords" :counts="false" tone="mine" />
            </div>
            <div v-if="theirWords.length" class="guest__side">
              <p class="t-label guest__them">{{ partner }}</p>
              <WordChips :items="theirWords" :counts="false" tone="theirs" />
            </div>
          </div>
        </ReportSection>
        <ReportFavourites v-if="allowed" :data="data" />

        <section class="tile guest__invite">
          <h2 class="t-h3">{{ t('publicReport.endTitle') }}</h2>
          <p class="t-label guest__invite-text">{{ t('publicReport.endText') }}</p>
          <UiButton variant="primary" block to="/login">{{ t('publicReport.cta') }}</UiButton>
        </section>
      </div>
    </UiPageContainer>
  </div>
</template>

<style scoped>
.guest__flow {
  display: flex;
  flex-direction: column;
  gap: var(--card-gap);
  min-width: 0;
  padding: var(--space-4) 0 var(--space-6);
}

.guest__rows,
.guest__words {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.guest__row,
.guest__side {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.guest__them {
  color: var(--them-ink);
}

.guest__invite {
  gap: var(--space-2);
}

.guest__invite-text {
  margin-bottom: var(--space-2);
  color: var(--text-muted);
}

@media (min-width: 901px) {
  .guest__flow {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
    padding-top: var(--space-8);
  }

  .guest__flow > :deep(.report-section--wide),
  .guest__invite {
    grid-column: 1 / -1;
  }
}
</style>
