<script setup lang="ts">
/**
 * The foot of every public page, quiet text only: the pages (the example, privacy and questions), the channel and
 * «Поддержать» when the site has them (NUXT_PUBLIC_CHANNEL_URL, NUXT_PUBLIC_SUPPORT_URL), then language and theme
 * as words, and the Telegram notice. Language and theme live here, as on Apple's, Stripe's and Linear's sites:
 * the language follows the browser and the theme the system, so they are corrections, not navigation.
 */
const { t } = useI18n()
const { channelUrl, supportUrl } = useRuntimeConfig().public
const route = useRoute()
const current = (path: string) => (route.path === path ? 'page' : undefined)
</script>

<template>
  <footer class="site-footer">
    <div class="site-footer__in">
      <nav class="site-footer__nav" :aria-label="t('site.footerNav')">
        <NuxtLink to="/example" :aria-current="current('/example')">{{ t('site.example') }}</NuxtLink>
        <NuxtLink to="/privacy" :aria-current="current('/privacy')">{{ t('site.privacy') }}</NuxtLink>
        <a v-if="channelUrl" :href="channelUrl" target="_blank" rel="noopener">{{ t('site.channel') }}</a>
        <a v-if="supportUrl" :href="supportUrl" target="_blank" rel="noopener">{{ t('site.support') }}</a>
      </nav>
      <div class="site-footer__prefs">
        <UiLocaleSwitch />
        <UiThemeToggle />
      </div>
      <p class="site-footer__note">{{ t('site.unofficial') }}</p>
    </div>
  </footer>
</template>

<style scoped>
.site-footer__in {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-2) var(--space-6);
  width: 100%;
  max-width: calc(var(--page-max) + var(--page-gutter) * 2);
  margin: 0 auto;
  padding: var(--space-6) var(--page-gutter) max(var(--space-6), env(safe-area-inset-bottom, 0px));
  color: var(--text-muted);
  font: var(--text-small);
}

.site-footer__nav,
.site-footer__prefs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 var(--space-6);
}

.site-footer__note {
  grid-column: 1 / -1;
}

/* Links and the two word-buttons are one look: muted text that turns to ink. */
.site-footer__nav > *,
.site-footer__prefs > * {
  display: inline-flex;
  align-items: center;
  min-height: var(--control-sm);
  color: var(--text-muted);
  transition: color var(--transition-fast);
}

.site-footer__nav > [aria-current='page'] {
  color: var(--text);
}

/* A finger gets a full 44 target without the line looking any different. */
@media (pointer: coarse) {
  .site-footer__nav > *,
  .site-footer__prefs > * {
    min-height: var(--control-md);
  }
}

@media (hover: hover) and (pointer: fine) {
  .site-footer__nav > :hover,
  .site-footer__prefs > :hover {
    color: var(--text);
  }
}

/* Phones: one column, left-aligned like the page — the pages, then language and theme, then the notice. */
@media (max-width: 640px) {
  .site-footer__in {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }

  .site-footer__note {
    margin-top: var(--space-2);
  }
}
</style>
