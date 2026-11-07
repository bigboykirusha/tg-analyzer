<script setup lang="ts">
import { buildApiPath, type PublicShareDto, type ReportDto } from '@tg-analyzer/shared'
import { ofetch } from 'ofetch'
import { Link2Off } from '../../lib/icons'

/**
 * What a share link opens, without signing in: the quiz for the other side or the report as its
 * owner chose to show it. A turned-off or expired link is one card with «Сделать свой отчёт».
 * Plain requests, not `api()`: a guest has no session to refresh.
 */
const route = useRoute()
const { t } = useI18n()
const token = computed(() => String(route.params.token))
const share = ref<PublicShareDto | null>(null)
useSeoMeta({
  title: () => (share.value?.kind === 'report' ? t('report.title') : t('publicQuiz.seoTitle')),
  robots: 'noindex, nofollow',
})
const state = ref<'loading' | 'ready' | 'gone'>('loading')

onMounted(async () => {
  try {
    share.value = await ofetch<PublicShareDto>(buildApiPath('/api/v1/public/:token', { token: token.value }))
    state.value = 'ready'
  } catch {
    state.value = 'gone'
  }
})

/** The hidden name becomes «Собеседник» everywhere the report says it. */
const report = computed<ReportDto | null>(() => {
  const value = share.value
  if (value?.kind !== 'report') return null
  const title = value.data.summary.title || t('share.partner')
  return { ...value.data, summary: { ...value.data.summary, title } }
})
</script>

<template>
  <UiPageContainer>
    <div class="page">
      <p v-if="state === 'loading'" class="public__loading t-small t-muted">
        <span class="spinner" aria-hidden="true" />{{ t('publicShare.loading') }}
      </p>

      <section v-else-if="state === 'gone'" class="tile public__gone">
        <span class="public__icon"><Link2Off aria-hidden="true" /></span>
        <h1 class="t-h2">{{ t('publicShare.goneTitle') }}</h1>
        <p class="t-small t-muted">{{ t('publicShare.goneText') }}</p>
        <UiButton variant="primary" block to="/login">{{ t('publicReport.cta') }}</UiButton>
      </section>

      <PublicQuiz v-else-if="share?.kind === 'quiz'" :quiz="share" :token="token" />

      <template v-else-if="share?.kind === 'report' && report">
        <ReportHeader :summary="report.summary" demo />
        <p class="note" role="status">{{ t('publicReport.banner', { name: share.author }) }}</p>
        <PrivateReport :data="report" :no-words="!share.settings.words" />
        <section class="tile public__end" aria-labelledby="public-end-title">
          <h2 id="public-end-title" class="t-h2">{{ t('publicReport.endTitle') }}</h2>
          <p class="t-lede">{{ t('publicReport.endText') }}</p>
          <UiButton variant="primary" size="lg" to="/login">{{ t('publicReport.cta') }}</UiButton>
        </section>
      </template>
    </div>
  </UiPageContainer>
</template>

<style scoped>
.public__loading {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

/* One card in the middle, like the sign-in page. */
.public__gone {
  justify-items: start;
  width: 100%;
  max-width: 440px;
  margin: 0 auto;
}

.public__icon {
  display: grid;
  place-items: center;
  width: var(--control-md);
  height: var(--control-md);
  border-radius: var(--radius-md);
  background: var(--surface-2);
}

.public__end {
  align-items: flex-start;
}

@media (max-width: 640px) {
  .public__end .btn {
    align-self: stretch;
  }
}
</style>
