<script setup lang="ts">
import { ArrowRight, Send } from '../lib/icons'

definePageMeta({ middleware: ['guest'] })

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

/** The header gets its hairline once the page scrolls under it. */
const scrolled = ref(false)
function onScroll() {
  scrolled.value = window.scrollY > 4
}
onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <div class="landing">
    <header class="top" :class="{ 'is-scrolled': scrolled }">
      <div class="wrap top__in">
        <NuxtLink to="/" class="brand" aria-label="TG Analyzer"><BrandMark />TG Analyzer</NuxtLink>
        <div class="top__actions">
          <NuxtLink to="/faq" class="top__link">{{ t('landing.nav.faq') }}</NuxtLink>
          <UiButton variant="secondary" size="sm" to="/login">{{ t('landing.signIn') }}</UiButton>
        </div>
      </div>
    </header>

    <main class="wrap">
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
    </main>

    <footer class="foot">
      <div class="wrap foot__in">
        <span>{{ t('landing.unofficial') }}</span>
        <nav :aria-label="t('landing.footerNav')">
          <NuxtLink to="/login#privacy">{{ t('landing.nav.privacy') }}</NuxtLink>
          <NuxtLink to="/terms">{{ t('landing.nav.terms') }}</NuxtLink>
        </nav>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.landing {
  min-height: 100dvh;
  overflow-x: clip;
  background: var(--bg);
}

.wrap {
  max-width: 1200px;
  margin: 0 auto;
  padding-inline: max(20px, env(safe-area-inset-left, 0px));
}

/* ─── Header: sticky, flush with the page until it scrolls ─── */
.top {
  position: sticky;
  top: 0;
  z-index: var(--z-header);
  padding-top: env(safe-area-inset-top, 0px);
  background: var(--bg);
  transition: box-shadow var(--duration-slow) ease;
}

.top.is-scrolled {
  box-shadow: 0 1px 0 var(--border);
}

.top__in {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  height: var(--topbar-height);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font: 600 16px/1 var(--font-sans);
  letter-spacing: -0.02em;
  white-space: nowrap;
}

.top__actions {
  display: flex;
  align-items: center;
  gap: var(--space-5);
}

.top__link,
.foot a,
.hero__example {
  transition: color var(--transition-fast);
}

.top__link {
  color: var(--text-muted);
  font: var(--text-ui);
}

@media (hover: hover) {
  .top__link:hover,
  .foot a:hover,
  .hero__example:hover {
    color: var(--text);
  }
}

/* ─── Hero: a title, one action and the product ─── */
.hero {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  align-items: center;
  gap: var(--space-6);
  padding-top: var(--space-12);
}

.hero__copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.hero__title {
  font: 600 clamp(44px, 5.8vw, 80px) / 0.98 var(--font-sans);
  letter-spacing: -0.05em;
  text-wrap: balance;
}

.hero__title span {
  color: var(--text-faint);
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

/* ─── Footer: one quiet line ─── */
.foot__in {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2) var(--space-4);
  padding-block: 20px max(20px, env(safe-area-inset-bottom, 0px));
  color: var(--text-faint);
  font: var(--text-small);
}

.foot nav {
  display: flex;
  gap: 20px;
}

@media (max-width: 1100px) {
  .hero {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}

/* Desktop: the whole landing fits one screen; the window scales to the free height. */
@media (min-width: 901px) and (min-height: 620px) {
  .landing {
    display: flex;
    flex-direction: column;
    height: 100svh;
    min-height: 620px;
    overflow: clip;
  }

  .landing > main {
    display: flex;
    flex: 1;
    flex-direction: column;
    width: 100%;
    min-height: 0;
  }

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

  .foot__in {
    flex-wrap: nowrap;
    white-space: nowrap;
  }
}

@media (min-width: 1600px) {
  .wrap {
    max-width: 1400px;
  }
}

/* Tablets and phones: no tilted window, the phone shows the product instead. */
@media (max-width: 900px) {
  .hero {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-10);
    padding-top: var(--space-8);
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
  /* The cut-off phone must not stretch the page below the footer. */
  .landing {
    overflow: clip;
  }

  .top__actions {
    gap: var(--space-4);
  }

  .hero {
    gap: var(--space-8);
    padding-top: var(--space-6);
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

  .foot__in {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
}
</style>
