<script setup lang="ts">
import { api, ApiClientError, markSessionStart } from '../../composables/useApi'

/**
 * Where «Открыть» in a bot message leads (a «login_url» button, 14.11). Telegram opens it in its own browser, where
 * the person has no cookie, and appends who pressed it, signed with our bot's token. The page passes those fields on
 * to the API, which checks the signature and starts a session; then it opens the page the button was for. A browser
 * that already has a session just goes on; a signature that does not hold sends to the usual sign-in.
 */
definePageMeta({ layout: 'default' })
const { t } = useI18n()
useSeoMeta({ title: () => t('telegramSignIn.title'), robots: 'noindex, nofollow' })
const route = useRoute()
const auth = useAuthStore()

/** Only a path of this site: never another address. */
function target() {
  const to = route.query.to
  return typeof to === 'string' && to.startsWith('/') && !to.startsWith('//') ? to : '/dashboard'
}

onMounted(async () => {
  const to = target()
  const fields: Record<string, string> = {}
  for (const [key, value] of Object.entries(route.query)) {
    if (key !== 'to' && typeof value === 'string') fields[key] = value
  }
  // The signed fields leave the address bar at once: they are not for history or a screenshot.
  window.history.replaceState(window.history.state, '', '/auth/telegram')

  try {
    if (await useAuth().restoreSession()) return await navigateTo(to, { replace: true })
  } catch {
    // Offline: the sign-in below says so too.
  }
  if (fields.hash) {
    try {
      const result = await api('POST /api/v1/auth/telegram-login', { body: { fields } })
      auth.signIn(result)
      markSessionStart()
      return await navigateTo(to, { replace: true })
    } catch (error) {
      if (!(error instanceof ApiClientError)) throw error
    }
  }
  await navigateTo('/login', { replace: true })
})
</script>

<template>
  <StatusPage
    :title="t('telegramSignIn.title')"
    :text="t('telegramSignIn.text')"
    :action="t('telegramSignIn.byPhone')"
    @action="navigateTo('/login', { replace: true })"
  />
</template>
