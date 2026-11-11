<script setup lang="ts">
/**
 * The foot of the public pages that scroll (privacy, sign-in, the example, a shared link), quiet text only: the
 * pages, the channel and «Поддержать» when the site has them (NUXT_PUBLIC_CHANNEL_URL, NUXT_PUBLIC_SUPPORT_URL),
 * and the Telegram notice. The landing is one screen and has none; language and theme are in the header.
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

.site-footer__nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 var(--space-6);
}

.site-footer__note {
  grid-column: 1 / -1;
}

/* Links: muted text that turns to ink. */
.site-footer__nav > * {
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
  .site-footer__nav > * {
    min-height: var(--control-md);
  }
}

@media (hover: hover) and (pointer: fine) {
  .site-footer__nav > :hover {
    color: var(--text);
  }
}

/* Phones: one column, left-aligned like the page — the pages, then the notice. */
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
