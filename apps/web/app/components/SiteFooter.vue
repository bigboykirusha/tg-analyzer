<script setup lang="ts">
/**
 * The landing's last line on a computer, quiet text only: «Приватность», the channel and «Поддержать» when the
 * site has them (NUXT_PUBLIC_CHANNEL_URL, NUXT_PUBLIC_SUPPORT_URL), and the Telegram notice. A phone has none:
 * there privacy is a phrase of the landing's lead. Other pages have no footer.
 */
const { t } = useI18n()
const { channelUrl, supportUrl } = useRuntimeConfig().public
</script>

<template>
  <footer class="site-footer">
    <div class="site-footer__in">
      <nav class="site-footer__nav" :aria-label="t('site.footerNav')">
        <NuxtLink to="/privacy">{{ t('site.privacy') }}</NuxtLink>
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
  font: var(--text-label);
}

.site-footer__nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 var(--space-6);
}

/* One line on a computer: the links on the left, the notice on the right. */
.site-footer__note {
  text-align: end;
}

/* Links: muted text that turns to ink. */
.site-footer__nav > * {
  display: inline-flex;
  align-items: center;
  min-height: var(--control-sm);
  color: var(--text-muted);
  transition: color var(--transition-fast);
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
</style>
