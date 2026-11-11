<script setup lang="ts">
/**
 * The header of every public page (landing, privacy, sign-in, the example report, a shared link, 404): the logo
 * on the left — it is also the way home — and «Войти» on the right. Nothing else: the example and privacy are in
 * the page itself and in the footer, language and theme in the footer — a header that repeats the hero is noise.
 * «Войти» is one button everywhere (secondary, sm), absent on the sign-in page itself and offline. On the landing
 * it waits until the hero's own «Войти через Telegram» has scrolled away, so the first screen has one call to
 * action, not two. Over a poster (the example, a shared link) the bar is the poster with its ink; past it, glass.
 */
const { t } = useI18n()
const route = useRoute()
/** Not on the sign-in page itself, and not offline: without a connection there is nowhere to sign in. */
const showSignIn = computed(() => route.path !== '/login' && route.path !== '/offline')
/** On the landing: whether its hero buttons are on screen (pages/index.vue). True until it says otherwise, on the
 *  server and in the browser alike, so the first paint and the hydration agree. */
const heroInView = useState('hero-cta-in-view', () => true)
const waiting = computed(() => route.path === '/' && heroInView.value)
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
      <UiButton
        v-if="showSignIn"
        to="/login"
        size="sm"
        class="site-header__sign-in"
        :class="{ 'is-waiting': waiting }"
        :tabindex="waiting ? -1 : undefined"
        :aria-hidden="waiting || undefined"
      >
        {{ t('site.signIn') }}
      </UiButton>
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

/* «Войти» fades in once the hero's buttons are gone; its place is kept, so nothing shifts. */
.site-header__sign-in {
  transition:
    opacity var(--duration-fast) var(--ease-standard),
    visibility var(--duration-fast);
}

.site-header__sign-in.is-waiting {
  visibility: hidden;
  opacity: 0;
}
</style>
