<script setup lang="ts">
import { Lock, Send, Share2, Users } from '../lib/icons'

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

const features = computed(() => [
  { icon: Lock, title: t('landing.feature.privacy.title'), text: t('landing.feature.privacy.text') },
  { icon: Share2, title: t('landing.feature.story.title'), text: t('landing.feature.story.text') },
  { icon: Users, title: t('landing.feature.groups.title'), text: t('landing.feature.groups.text') },
])

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
        <nav class="top__links" :aria-label="t('nav.main')">
          <NuxtLink to="/example">{{ t('landing.nav.example') }}</NuxtLink>
          <NuxtLink to="/faq">{{ t('landing.nav.faq') }}</NuxtLink>
          <NuxtLink to="/login#privacy">{{ t('landing.nav.privacy') }}</NuxtLink>
        </nav>
        <div class="top__actions">
          <UiButton class="top__signin" variant="secondary" size="sm" to="/login">{{ t('landing.signIn') }}</UiButton>
          <UiButton variant="primary" size="sm" to="/login">{{ t('landing.start') }}</UiButton>
        </div>
      </div>
    </header>

    <main class="wrap">
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero__copy">
          <span class="eyebrow"><b aria-hidden="true" />{{ t('landing.eyebrow') }}</span>
          <h1 id="hero-title" class="hero__title">
            {{ t('landing.title') }} <span>{{ t('landing.titleSoft') }}</span>
          </h1>
          <p class="hero__lede">{{ t('landing.lede') }}</p>
          <div class="hero__ctas">
            <UiButton variant="primary" size="lg" :icon="Send" to="/login">{{ t('landing.cta') }}</UiButton>
            <UiButton class="hero__example" variant="secondary" size="lg" to="/example">
              {{ t('landing.example') }}
            </UiButton>
          </div>
          <p class="hero__free">{{ t('landing.free') }}</p>
        </div>
        <div class="hero__visual">
          <ProductWindow class="hero__window" />
          <div class="hero__phone"><PhoneMockup /></div>
        </div>
      </section>

      <section class="features" :aria-label="t('landing.featuresLabel')">
        <article v-for="feature in features" :key="feature.title" class="feature">
          <component :is="feature.icon" class="feature__icon icon-lg" aria-hidden="true" />
          <h2>{{ feature.title }}</h2>
          <p>{{ feature.text }}</p>
        </article>
      </section>
    </main>

    <footer class="foot">
      <div class="wrap foot__in">
        <NuxtLink to="/" class="brand brand--muted" aria-label="TG Analyzer"><BrandMark />TG Analyzer</NuxtLink>
        <nav :aria-label="t('landing.footerNav')">
          <NuxtLink to="/login#privacy">{{ t('landing.dataLink') }}</NuxtLink>
          <NuxtLink to="/faq">{{ t('landing.nav.faq') }}</NuxtLink>
          <NuxtLink to="/terms">{{ t('landing.nav.terms') }}</NuxtLink>
        </nav>
        <span>© {{ new Date().getFullYear() }} TG Analyzer</span>
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

.top__links {
  display: flex;
  gap: 28px;
  color: var(--text-muted);
  font: var(--text-ui);
}

.top__links a,
.foot a {
  transition: color var(--transition-fast);
}

@media (hover: hover) {
  .top__links a:hover,
  .foot a:hover {
    color: var(--text);
  }
}

.top__actions {
  display: flex;
  gap: var(--space-2);
}

/* ─── Hero ─── */
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
  gap: var(--space-5);
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-muted);
  font: var(--text-ui);
}

.eyebrow b {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--them);
}

.hero__title {
  font: 600 clamp(40px, 5.4vw, 72px) / 1 var(--font-sans);
  letter-spacing: -0.045em;
  text-wrap: balance;
}

.hero__title span {
  color: var(--text-faint);
}

.hero__lede {
  max-width: 42ch;
  color: var(--text-muted);
  font: 400 17px/1.55 var(--font-sans);
}

.hero__ctas {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.hero__free {
  margin-top: calc(var(--space-2) * -1);
  color: var(--text-muted);
  font: var(--text-small);
}

.hero__phone {
  display: none;
}

/* ─── Features ─── */
.features {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-10);
  margin-top: 80px;
  padding-block: 72px 120px;
  border-top: 1px solid var(--border);
}

.feature h2 {
  margin: 14px 0 6px;
  font: var(--text-title);
  letter-spacing: -0.01em;
}

.feature p {
  color: var(--text-muted);
  font: 400 14px/1.55 var(--font-sans);
}

/* ─── Footer ─── */
.foot {
  border-top: 1px solid var(--border);
}

.foot__in {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding-block: 28px max(64px, env(safe-area-inset-bottom, 0px));
  color: var(--text-muted);
  font: var(--text-small);
}

.foot nav {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.brand--muted {
  color: var(--text-muted);
}

@media (max-width: 1100px) {
  .hero {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}

/*
 * Desktop: the whole landing fits one screen. The hero takes the free height,
 * the window scales to it, features and footer shrink to single rows.
 */
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
    padding-block: clamp(16px, 4vh, 48px) var(--space-4);
  }

  .hero__title {
    font-size: clamp(40px, min(5.4vw, 8.4vh), 72px);
  }

  .hero__visual {
    align-self: stretch;
    min-height: 0;
  }

  .hero__window {
    height: 100%;
  }

  .features {
    gap: var(--space-8);
    margin-top: 0;
    padding-block: 18px;
  }

  .feature {
    display: grid;
    grid-template-columns: 20px minmax(0, 1fr);
    column-gap: var(--space-3);
    row-gap: 2px;
  }

  .feature__icon {
    grid-row: span 2;
    width: 20px;
    height: 20px;
    margin-top: 1px;
  }

  .feature h2 {
    margin: 0;
    font: 600 15px/20px var(--font-sans);
  }

  .feature p {
    font: 400 13px/18px var(--font-sans);
  }

  .foot__in {
    flex-wrap: nowrap;
    padding-block: 14px max(14px, env(safe-area-inset-bottom, 0px));
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
  .top__links,
  .top__signin {
    display: none;
  }

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

  .features {
    gap: 28px;
    margin-top: 56px;
    padding-block: 56px 72px;
  }
}

@media (max-width: 640px) {
  .hero {
    gap: 28px;
    padding-top: var(--space-5);
  }

  .hero__copy {
    gap: var(--space-4);
  }

  .hero__lede {
    font-size: 16px;
  }

  .hero__ctas {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    gap: var(--space-1);
  }

  /* The second action is a quiet text button under the main one. */
  .hero__example {
    border-color: transparent;
    color: var(--text-muted);
  }

  /* The phone is cut off with a fade, so the landing stays short. */
  .hero__phone {
    position: relative;
    height: min(400px, 104vw);
    margin-bottom: calc(var(--space-6) * -1);
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

  /* Features scroll sideways as cards, over the bottom of the faded phone. */
  .features {
    position: relative;
    z-index: 2;
    display: flex;
    gap: 10px;
    margin: 0 calc(max(20px, env(safe-area-inset-left, 0px)) * -1);
    padding: var(--space-2) max(20px, env(safe-area-inset-left, 0px)) var(--space-10);
    overflow-x: auto;
    border-top: 0;
    scroll-padding-inline: max(20px, env(safe-area-inset-left, 0px));
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
  }

  .features::-webkit-scrollbar {
    display: none;
  }

  .feature {
    flex: 0 0 78%;
    padding: 18px;
    border-radius: var(--radius-card);
    background: var(--surface);
    scroll-snap-align: start;
  }

  .foot__in {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
