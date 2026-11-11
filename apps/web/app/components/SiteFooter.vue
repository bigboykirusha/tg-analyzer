<script setup lang="ts">
/** One quiet line under every public page: the Telegram notice, the documents, language and theme. */
const { t } = useI18n()
</script>

<template>
  <footer class="site-footer">
    <div class="site-footer__in">
      <span class="site-footer__note">{{ t('site.unofficial') }}</span>
      <div class="site-footer__end">
        <nav class="site-footer__nav" :aria-label="t('site.footerNav')">
          <NuxtLink to="/privacy">{{ t('site.privacy') }}</NuxtLink>
        </nav>
        <div class="site-footer__prefs">
          <UiLocaleSwitch />
          <UiThemeToggle />
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.site-footer__in {
  width: 100%;
  max-width: calc(var(--page-max) + var(--page-gutter) * 2);
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2) var(--space-4);
  padding: var(--space-6) var(--page-gutter) max(var(--space-6), env(safe-area-inset-bottom, 0px));
  color: var(--text-muted);
  font: var(--text-small);
}

/* Two even lines on a phone, never «API» alone on the second. */
.site-footer__note {
  text-wrap: balance;
}

.site-footer__end,
.site-footer__nav,
.site-footer__prefs {
  display: flex;
  align-items: center;
}

.site-footer__end {
  gap: var(--space-4);
}

.site-footer__nav {
  gap: var(--space-6);
}

.site-footer__prefs {
  gap: var(--space-1);
}

.site-footer a {
  transition: color var(--transition-fast);
}

/* Text links get a full-size touch target without changing how the line looks. */
@media (pointer: coarse) {
  .site-footer__nav a {
    display: inline-flex;
    align-items: center;
    min-height: var(--control-md);
  }
}

@media (hover: hover) and (pointer: fine) {
  .site-footer a:hover {
    color: var(--text);
  }
}

@media (max-width: 640px) {
  .site-footer__in {
    flex-direction: column-reverse;
    align-items: center;
    text-align: center;
  }

  .site-footer__end {
    gap: var(--space-3);
  }
}
</style>
