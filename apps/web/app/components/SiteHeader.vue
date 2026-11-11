<script setup lang="ts">
/**
 * The header of every public page (landing, privacy, sign-in, the example report, a shared link, 404).
 * Always the logo on the left — it is also the way home; there is no back circle on public pages.
 * Right: on desktop «Пример отчёта», «Приватность» (the current one marked) and «Войти»; on a phone only
 * «Войти». «Войти» is one button everywhere (secondary, sm) and is absent on the sign-in page itself and offline.
 * Over a poster (the example, a shared link) the bar is the poster with its ink; past it, glass.
 */
const { t } = useI18n()
const route = useRoute()
/** Not on the sign-in page itself, and not offline: without a connection there is nowhere to sign in. */
const showSignIn = computed(() => route.path !== '/login' && route.path !== '/offline')
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
      <nav class="site-header__nav" :aria-label="t('nav.main')">
        <NuxtLink
          to="/example"
          class="nav-link nav-link--wide"
          :aria-current="route.path === '/example' ? 'page' : undefined"
        >
          {{ t('site.example') }}
        </NuxtLink>
        <NuxtLink
          to="/privacy"
          class="nav-link nav-link--wide"
          :aria-current="route.path === '/privacy' ? 'page' : undefined"
        >
          {{ t('site.privacy') }}
        </NuxtLink>
        <UiButton v-if="showSignIn" to="/login" size="sm">{{ t('site.signIn') }}</UiButton>
      </nav>
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

.site-header.is-over-poster :deep(.brand-link),
.site-header.is-over-poster .nav-link {
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

.site-header__nav {
  display: flex;
  align-items: center;
  gap: var(--space-8);
}

/* Text links in headers: one look, a full hit area. */
.nav-link {
  display: inline-flex;
  align-items: center;
  min-height: var(--control-md);
  color: var(--text-muted);
  font: var(--text-ui);
}

.nav-link[aria-current='page'] {
  color: var(--text);
}

@media (hover: hover) and (pointer: fine) {
  .nav-link:hover {
    color: var(--text);
  }
}

/* Phones: only «Войти». */
.nav-link--wide {
  display: none;
}

@media (min-width: 901px) {
  .nav-link--wide {
    display: inline-flex;
  }

  .nav-link {
    min-height: var(--control-sm);
  }
}
</style>
