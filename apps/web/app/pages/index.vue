<script setup lang="ts">
import { Send } from '../lib/icons'

definePageMeta({ middleware: ['guest'], fit: true })

const { t } = useI18n()
const runtimeConfig = useRuntimeConfig()
useSeoMeta({ title: () => t('landing.seoTitle'), description: () => t('seo.description') })
// Lets search engines show the app as free software rather than a plain page.
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: () =>
        JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'TG Analyzer',
          url: String(runtimeConfig.public.siteUrl ?? ''),
          description: t('seo.description'),
          applicationCategory: 'UtilitiesApplication',
          operatingSystem: 'Web',
          inLanguage: ['ru', 'en'],
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'RUB' },
        }),
    },
  ],
})
</script>

<template>
  <UiPageContainer class="landing">
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero__copy">
        <!-- «Ваши / переписки. / В цифрах.»: the soft part always takes its own line. -->
        <h1 id="hero-title" class="hero__title">
          {{ t('landing.title') }} <span>{{ t('landing.titleSoft') }}</span>
        </h1>
        <p class="hero__lede">{{ t('landing.lede') }}</p>
        <div class="hero__actions">
          <UiButton variant="primary" size="lg" :icon="Send" to="/login">{{ t('landing.cta') }}</UiButton>
          <!-- The example is a quiet link beside the one action (under it on phones), not a second button. -->
          <NuxtLink to="/example" class="hero__example">{{ t('landing.nav.example') }}</NuxtLink>
        </div>
      </div>
      <div class="hero__visual">
        <ProductWindow class="hero__window" />
        <div class="hero__phone"><PhoneMockup /></div>
      </div>
    </section>
  </UiPageContainer>
</template>

<style scoped>
/* ─── Hero: a title, one action and the product ─── */
.landing {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  align-items: center;
  gap: var(--space-6);
}

.hero__copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

/* The one display size on the site: only the landing gets it. */
.hero__title {
  font: var(--text-display);
  letter-spacing: var(--tracking-display);
}

.hero__title span {
  display: block;
  color: var(--text-muted);
}

.hero__lede {
  max-width: 34ch;
  margin-top: var(--space-6);
  color: var(--text-muted);
  font: var(--text-body);
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3) var(--space-6);
  margin-top: var(--space-8);
}

.hero__example {
  display: inline-flex;
  align-items: center;
  color: var(--text);
  font: var(--text-ui);
  transition: color var(--transition-fast);
}

@media (hover: hover) and (pointer: fine) {
  .hero__example:hover {
    color: var(--text-muted);
  }
}

@media (pointer: coarse) {
  .hero__example {
    min-height: var(--control-md);
  }
}

.hero__phone {
  display: none;
}

@media (max-width: 1100px) {
  .hero {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}

/* Desktop: the whole landing fits one screen; the window scales to the free height. */
@media (min-width: 901px) and (min-height: 620px) {
  .hero {
    flex: 1;
    grid-template-rows: minmax(0, 1fr);
    min-height: 0;
    padding-block: clamp(16px, 4vh, 48px);
  }

  .hero__title {
    font-size: clamp(44px, min(5.8vw, 9vh), 80px);
  }

  .hero__visual {
    align-self: stretch;
    min-height: 0;
  }

  .hero__window {
    height: 100%;
  }
}

/* Tablets and phones: no tilted window, the phone shows the product instead. */
@media (max-width: 900px) {
  .hero {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-10);
  }

  .hero__copy {
    max-width: 560px;
  }

  .hero__window {
    display: none;
  }

  .hero__phone {
    display: block;
  }
}

@media (max-width: 640px) {
  .hero {
    gap: var(--space-6);
  }

  .hero__lede {
    margin-top: var(--space-4);
  }

  .hero__actions {
    align-self: stretch;
    margin-top: var(--space-6);
  }

  /* The button takes the width, the example link sits centred under it. */
  .hero__actions {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-1);
  }

  .hero__example {
    justify-content: center;
  }
}

/* One screen, no scroll: the phone takes what the text leaves, and fades out at the bottom. */
@media (max-width: 900px) and (min-height: 560px) {
  .hero {
    flex: 1;
    grid-template-rows: auto minmax(0, 1fr);
    align-items: start;
    gap: var(--space-4);
    min-height: 0;
  }

  .hero__visual {
    position: relative;
    align-self: stretch;
    min-height: 0;
  }

  /* The phone fills whatever height the text leaves. */
  .hero__phone {
    position: absolute;
    inset: 0;
    min-height: 0;
    /* Cut at the bottom only, so the phone's shadow is not boxed in on the sides. */
    overflow-x: visible;
    overflow-y: clip;
  }

  .hero__phone::after {
    content: '';
    position: absolute;
    right: -80px;
    bottom: 0;
    left: -80px;
    z-index: 1;
    height: 96px;
    background: linear-gradient(transparent, var(--bg) 85%);
    pointer-events: none;
  }

  /* Keep everything inside the phone under the fade. */
  .hero__phone > :deep(*) {
    position: relative;
    z-index: 0;
  }

  .hero__phone :deep(.iphone) {
    width: min(290px, 76vw);
  }
}
</style>
