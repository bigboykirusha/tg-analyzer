<script setup lang="ts">
import { SIGNED_IN_HINT } from '../stores/auth'

/**
 * The header of every public page (landing, privacy, sign-in, the example report, a shared link, 404): the logo
 * on the left — it is also the way home — and «Войти» on the right (secondary, sm). It is absent on the landing,
 * whose own «Войти через Telegram» is always on its one screen, on the sign-in page itself and offline. No
 * language or theme here: the language comes from the browser and the theme from the system; both are changed in
 * the account. Over a poster (the example, a shared link) the bar is the poster with its ink; past it, glass.
 */
const { t } = useI18n()
const route = useRoute()
const showSignIn = computed(() => !['/', '/login', '/offline'].includes(route.path))
// Someone already signed in goes to their reports, not to the sign-in page (the hint is set by the auth store).
const signedIn = useCookie(SIGNED_IN_HINT, { readonly: true })
const { scrolled, overPoster } = usePosterHeader()
</script>

<template>
  <header
    class="site-header"
    data-toolbar
    :class="{ 'is-over-poster': overPoster, 'is-scrolled': scrolled && !overPoster }"
  >
    <div class="site-header__in">
      <BrandLink class="site-header__brand" />
      <template v-if="showSignIn">
        <UiButton v-if="signedIn" to="/dashboard" size="sm">{{ t('site.myReports') }}</UiButton>
        <UiButton v-else to="/login" size="sm">{{ t('site.signIn') }}</UiButton>
      </template>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: var(--z-header);
  padding-top: env(safe-area-inset-top, 0px);
  background: var(--bg);
}

/* Past a poster, as in the app: the material and a hairline. */
.site-header.is-scrolled {
  background: var(--header-glass);
  box-shadow: var(--divider-bottom);
  -webkit-backdrop-filter: var(--glass-filter);
  backdrop-filter: var(--glass-filter);
}

/* Over a poster every element is the poster's ink. */
.site-header.is-over-poster {
  background: var(--poster);
  color: var(--on-poster);
}

.site-header.is-over-poster :deep(.brand-link) {
  color: var(--on-poster);
}

.site-header__in {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  width: 100%;
  max-width: calc(var(--page-max) + var(--page-gutter) * 2);
  min-height: var(--topbar-height);
  margin: 0 auto;
  padding: 0 var(--page-gutter);
}
</style>
