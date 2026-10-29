<script setup lang="ts">
import { ArrowRight, Send } from '../lib/icons'

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
        <h1 id="hero-title" class="hero__title">
          {{ t('landing.title') }} <span>{{ t('landing.titleSoft') }}</span>
        </h1>
        <p class="hero__lede">{{ t('landing.lede') }}</p>
        <UiButton class="hero__cta" variant="primary" size="lg" :icon="Send" to="/login">
          {{ t('landing.cta') }}
        </UiButton>
        <p class="hero__trust">
          {{ t('landing.trust') }}
          <NuxtLink to="/example" class="hero__example">
            {{ t('landing.nav.example') }}<ArrowRight aria-hidden="true" />
          </NuxtLink>
        </p>
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
  font: 600 clamp(44px, 5.8vw, 80px) / 0.98 var(--font-sans);
  letter-spacing: -0.05em;
  text-wrap: balance;
}

.hero__title span {
  color: var(--text-muted);
}

.hero__lede {
  max-width: 34ch;
  margin-top: var(--space-6);
  color: var(--text-muted);
  font: 400 18px/1.5 var(--font-sans);
}

.hero__cta {
  margin-top: var(--space-8);
}

.hero__trust {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px var(--space-4);
  margin-top: var(--space-5);
  color: var(--text-muted);
  font: var(--text-small);
}

.hero__example {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text);
  font-weight: 600;
}

.hero__example svg {
  width: 14px;
  height: 14px;
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
    gap: var(--space-8);
  }

  .hero__lede {
    margin-top: var(--space-4);
    font-size: 17px;
  }

  .hero__cta {
    align-self: stretch;
    margin-top: var(--space-6);
  }

  .hero__trust {
    justify-content: center;
    align-self: stretch;
  }

  /* The phone is cut off with a fade, so the landing stays short. */
  .hero__phone {
    position: relative;
    height: min(420px, 108vw);
    clip-path: inset(-80px -80px 2px -80px);
  }

  .hero__phone::after {
    content: '';
    position: absolute;
    right: -80px;
    bottom: 0;
    left: -80px;
    z-index: 1;
    height: 140px;
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
