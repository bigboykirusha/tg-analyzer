<script setup lang="ts">
import { buildApiPath, type PublicShareDto } from '@tg-analyzer/shared'
import { FetchError, ofetch } from 'ofetch'
import { hueAt } from '../../lib/hue'

/**
 * What a share link opens, without signing in: the quiz for the other side or the report as its owner
 * chose to show it. A turned-off or expired link is one status page. A request that failed on the way
 * (no connection, a server error, too many requests) is another, with «Повторить»: the link may still
 * work. Plain requests, not `api()`: a guest has no session to refresh.
 */
const route = useRoute()
const { t } = useI18n()
const token = computed(() => String(route.params.token))
const share = ref<PublicShareDto | null>(null)
const state = ref<'loading' | 'ready' | 'gone' | 'failed'>('loading')
useSeoMeta({
  title: () => (share.value?.kind === 'quiz' ? t('publicQuiz.seoTitle') : t('report.title')),
  robots: 'noindex, nofollow',
})
// The person keeps the colour the owner sees them in; the quiz wears it too.
useHead({ htmlAttrs: { 'data-hue': () => (share.value ? hueAt(share.value.hue) : undefined) } })

/** The API answers 404 for a link that is off, deleted or expired, and 400 for an address that cannot be one. */
const isGone = (error: unknown) => error instanceof FetchError && (error.status === 404 || error.status === 400)

async function open() {
  state.value = 'loading'
  try {
    share.value = await ofetch<PublicShareDto>(buildApiPath('/api/v1/public/:token', { token: token.value }))
    state.value = 'ready'
  } catch (error) {
    state.value = isGone(error) ? 'gone' : 'failed'
  }
}

onMounted(open)
</script>

<template>
  <div class="shared">
    <p v-if="state === 'loading'" class="shared__loading" role="status">
      <span class="spinner" aria-hidden="true" />{{ t('publicShare.loading') }}
    </p>
    <StatusPage
      v-else-if="state === 'failed'"
      :title="t('publicShare.failedTitle')"
      :text="t('errors.network')"
      :action="t('common.retry')"
      @action="open"
    />
    <StatusPage
      v-else-if="state === 'gone' || !share"
      :title="t('publicShare.goneTitle')"
      :text="t('publicShare.goneText')"
      :action="t('publicReport.cta')"
      to="/login"
      :secondary="t('publicShare.about')"
      secondary-to="/"
    />
    <PublicQuiz v-else-if="share.kind === 'quiz'" :quiz="share" :token="token" />
    <GuestReport v-else :share="share" />
  </div>
</template>

<style scoped>
.shared {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.shared__loading {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  color: var(--text-muted);
  font: var(--text-small);
}
</style>
