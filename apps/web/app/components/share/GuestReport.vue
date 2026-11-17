<script setup lang="ts">
import type { PublicReportDto } from '@tg-analyzer/shared'

/**
 * A report opened by a shared link, without signing in: the same composition as the owner's report —
 * the poster, then the cards of one anatomy («Баланс», «Время», «Слова», «Эмодзи и реакции») — told in
 * the third person: the author's name stands where the owner reads «вы» («Мила и Аня пишут на равных»),
 * because the reader is the other side. Words and emoji come only when the author allowed them. A group's link
 * opens the group's own cards (people, roles, pairs, talk, time, words), its members as «Участник N» unless the
 * author named them. It ends
 * on an invitation to one's own report, a card in the flow, so it never covers the text.
 */
const props = defineProps<{ share: PublicReportDto }>()
const { t } = useI18n()

const isGroup = computed(() => Boolean(props.share.data.report.group))
const reportHeading = useSharedReportHeading()
const cover = computed(() =>
  reportHeading(props.share.data.summary.title, props.share.author, isGroup.value, props.share.settings.showName),
)
const data = computed(() => {
  const value = props.share.data
  return {
    ...value,
    summary: { ...value.summary, title: cover.value.partner },
  }
})
provideReportAuthor(() => cover.value.author)

const allowed = computed(() => props.share.settings.words)
</script>

<template>
  <div class="guest">
    <ReportPoster
      :data="data"
      :heading="cover.heading"
      :caption="cover.caption"
      :anonymous-cast="!share.settings.showName"
    />
    <UiPageContainer>
      <div class="guest__flow">
        <h2 class="sr-only">{{ t('publicReport.mainTitle') }}</h2>
        <GroupReport v-if="isGroup" :data="data" />
        <template v-else>
          <ReportBalance
            class="guest__balance"
            :data="data"
            :author="cover.author"
            :anonymous="!share.settings.showName"
          />

          <ReportTime :data="data" compact />

          <ReportWords v-if="allowed" :data="data" :author="cover.author" />
          <ReportFavourites v-if="allowed" :data="data" />
        </template>

        <section class="tile guest__invite">
          <div class="guest__invite-copy">
            <h2 class="t-h3">{{ t('publicReport.endTitle') }}</h2>
            <p class="t-label guest__invite-text">{{ t('publicReport.endText') }}</p>
          </div>
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
  margin-top: var(--space-2);
  gap: var(--space-4);
}

.guest__invite-copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.guest__invite-text {
  color: var(--text-muted);
}

/* A phone: the invitation's button under the thumb, the card's whole width. */
.guest__cta {
  align-self: stretch;
}

/*
 * Balance and time can be read side by side. Other cards keep their own layout and full-width cards span the row.
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

  .guest__balance :deep(.balance) {
    margin-block: auto;
  }

  .guest__invite {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .guest__cta {
    flex: none;
    align-self: center;
  }
}
</style>
