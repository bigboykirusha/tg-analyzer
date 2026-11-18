<script setup lang="ts">
import type { PublicReportDto } from '@tg-analyzer/shared'

/**
 * The public report uses the same surfaces and chapter rhythm. It names the author's side and
 * renders the words and names allowed by the link settings.
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
      <h2 class="sr-only">{{ t('publicReport.mainTitle') }}</h2>
      <div class="report-flow guest__flow">
        <GroupReport v-if="isGroup" :data="data" />
        <template v-else>
          <div class="guest__overview">
            <ReportBalance
              class="guest__balance"
              :data="data"
              :author="cover.author"
              :anonymous="!share.settings.showName"
            />
            <ReportTime :data="data" compact />
          </div>

          <ReportPart v-if="allowed" id="words" :title="t('report.tabs.words')">
            <ReportWords :data="data" :author="cover.author" />
            <ReportFavourites :data="data" />
          </ReportPart>
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
  padding: var(--space-4) 0 var(--space-6);
}

.guest__overview {
  display: flex;
  flex-direction: column;
  gap: var(--card-gap);
}

.guest__overview:empty {
  display: none;
}

.guest__invite {
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

@media (min-width: 901px) {
  .guest__flow {
    padding-top: var(--space-8);
  }

  .guest__overview {
    flex-direction: row;
  }

  .guest__overview > :deep(.report-section) {
    flex: 5 1 0;
  }

  .guest__overview > .guest__balance {
    flex-grow: 4;
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
