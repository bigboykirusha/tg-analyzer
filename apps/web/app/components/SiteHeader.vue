<script setup lang="ts">
/**
 * The header of every public page (landing, privacy, sign-in, the example report, a shared link, 404): the logo
 * on the left — it is also the way home — and on the right the language and the theme as round icons, then
 * «Войти». «Войти» is one button everywhere (secondary, sm); it is absent on the landing, whose own «Войти через
 * Telegram» is always on its one screen, on the sign-in page itself and offline. Over a poster (the example, a
 * shared link) the bar is the poster with its ink; past it, glass.
 */
const { t } = useI18n()
const route = useRoute()
const showSignIn = computed(() => !['/', '/login', '/offline'].includes(route.path))
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
      <div class="site-header__end">
        <UiLocaleSwitch />
        <UiThemeToggle />
        <UiButton v-if="showSignIn" to="/login" size="sm" class="site-header__sign-in">
          {{ t('site.signIn') }}
        </UiButton>
      </div>
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

/*
 * Language and theme are quiet glyphs, not slabs: no circle until pressed. The last glyph's box overhangs the
 * gutter by its own padding, so the glyph itself — not its invisible box — lines up with the page's right edge.
 */
.site-header__end {
  --btn-plain-text: var(--text-muted);
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin-right: calc((var(--icon-md) - var(--control-sm)) / 2);
}

.site-header__end:has(.site-header__sign-in) {
  margin-right: 0;
}

.site-header.is-over-poster .site-header__end {
  --btn-plain-text: var(--on-poster);
}

/* A little more air before the one text button than between the two icons. */
.site-header__sign-in {
  margin-left: var(--space-2);
}
</style>
