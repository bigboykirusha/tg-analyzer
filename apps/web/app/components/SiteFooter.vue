<script setup lang="ts">
/** One quiet line under every public page: the Telegram notice, the documents, language and theme. */
const { t } = useI18n()
</script>

<template>
  <footer class="site-footer">
    <UiPageContainer class="site-footer__in">
      <span>{{ t('site.unofficial') }}</span>
      <div class="site-footer__end">
        <nav class="site-footer__nav" :aria-label="t('site.footerNav')">
          <NuxtLink to="/login#privacy">{{ t('site.privacy') }}</NuxtLink>
          <NuxtLink to="/terms">{{ t('site.terms') }}</NuxtLink>
        </nav>
        <div class="site-footer__prefs">
          <UiLocaleSwitch />
          <UiThemeToggle />
        </div>
      </div>
    </UiPageContainer>
  </footer>
</template>

<style scoped>
.site-footer__in {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2) var(--space-4);
  padding-block: var(--space-3) max(var(--space-3), env(safe-area-inset-bottom, 0px));
  color: var(--text-muted);
  font: var(--text-small);
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
  gap: var(--space-5);
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

@media (hover: hover) {
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
