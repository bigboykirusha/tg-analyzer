<script setup lang="ts">
import type { PublicReportDto } from '@tg-analyzer/shared'

/**
 * A report opened by a shared link, without signing in: the same composition as the owner's report —
 * the poster, then the cards of one anatomy («Баланс», «Время», «Слова», «Эмодзи и реакции») — told in
 * the third person: the author's name stands where the owner reads «вы» («Мила и Аня пишут на равных»),
 * because the reader is the other side. Words and emoji come only when the author allowed them. It ends
 * on an invitation to one's own report, a card in the flow, so it never covers the text.
 */
const props = defineProps<{ share: PublicReportDto }>()
const { t } = useI18n()

const data = computed(() => {
  const value = props.share.data
  return { ...value, summary: { ...value.summary, title: value.summary.title || t('share.partner') } }
})
const author = computed(() => (props.share.settings.showName ? props.share.author : t('share.author')))
const partner = computed(() => data.value.summary.title)
provideReportAuthor(() => author.value)

const heading = computed(() => t('publicReport.pair', { me: author.value, name: partner.value }))
/** Who shared it, then the same line as the owner's poster (useChatSpan). */
const chatSpan = useChatSpan()
const lede = computed(() => t('publicReport.lede', { name: author.value, span: chatSpan(data.value) }))

const allowed = computed(() => props.share.settings.words)
</script>

<template>
  <div class="guest">
    <ReportPoster :data="data" :heading="heading" :lede="lede" />
    <UiPageContainer>
      <div class="guest__flow">
        <h2 class="sr-only">{{ t('publicReport.mainTitle') }}</h2>
        <ReportBalance :data="data" :author="author" />

        <ReportTime :data="data" />

        <ReportWords v-if="allowed" :data="data" :author="author" />
        <ReportFavourites v-if="allowed" :data="data" />

        <section class="tile guest__invite">
          <h2 class="t-h3">{{ t('publicReport.endTitle') }}</h2>
          <p class="t-label guest__invite-text">{{ t('publicReport.endText') }}</p>
          <UiButton class="guest__cta" variant="primary" to="/login">{{ t('publicReport.cta') }}</UiButton>
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

.guest__invite {
  gap: var(--space-2);
}

.guest__invite-text {
  margin-bottom: var(--space-2);
  color: var(--text-muted);
}

/* A phone: the invitation's button under the thumb, the card's whole width. */
.guest__cta {
  align-self: stretch;
}

/*
 * Desktop: the report's own rule (ReportPart) — two cards to a row of one height, a card left alone takes the
 * whole row; the invitation's button is as wide as its words.
 */
@media (min-width: 901px) {
  .guest__flow {
    flex-flow: row wrap;
    align-items: stretch;
    padding-top: var(--space-8);
  }

  .guest__flow > :deep(*) {
    flex: 1 1 40%;
    min-width: 0;
  }

  .guest__flow > :deep(.report-section--wide),
  .guest__flow > .guest__invite {
    flex-basis: 100%;
  }

  .guest__cta {
    align-self: flex-start;
  }
}
</style>
