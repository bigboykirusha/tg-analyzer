<script setup lang="ts">
import type { MessageKey } from '../composables/useI18n'
import { wave } from '../lib/wave'
definePageMeta({ middleware: ['guest'], fit: true })

const { t } = useI18n()

/** Three people as the cards of home, the way reports look; the pulses are a drawn example, not anyone's data. */
const examples = [
  { key: 'ex1', chatId: '1011', pulse: wave(1, 36) },
  { key: 'ex2', chatId: '1002', pulse: wave(2, 36) },
  { key: 'ex3', chatId: '1003', pulse: wave(3, 36) },
]
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
  <div class="landing">
    <div class="landing__first">
      <section class="landing__copy" aria-labelledby="hero-title">
        <h1 id="hero-title" class="landing__title">{{ t('landing.title') }} {{ t('landing.titleSoft') }}</h1>
        <p class="landing__lede">{{ t('landing.lede') }}</p>
        <div class="landing__actions">
          <UiButton variant="primary" to="/login">{{ t('landing.cta') }}</UiButton>
          <UiButton to="/example">{{ t('landing.nav.example') }}</UiButton>
        </div>
        <p class="landing__trust t-small">
          {{ t('landing.trust') }}
          <NuxtLink class="link" to="/privacy">{{ t('landing.trustLink') }}</NuxtLink>
        </p>
      </section>
      <ul class="landing__examples" :aria-label="t('landing.examplesLabel')">
        <li v-for="example in examples" :key="example.key">
          <HomeCard
            :chat-id="example.chatId"
            :title="t(`landing.${example.key}.title` as MessageKey)"
            :avatar-title="t(`landing.${example.key}.title` as MessageKey).split(',')[0]"
            :meta="t(`landing.${example.key}.text` as MessageKey)"
            :has-avatar="false"
          >
            <Pulse :data="example.pulse" :height="12" :bars="28" />
          </HomeCard>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
/* One screen, phone or desktop: the title, the lead, two actions, the example tiles and a quiet line about privacy. */
.landing {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-6);
  width: 100%;
  min-height: 0;
  max-width: calc(var(--page-max) + var(--page-gutter) * 2);
  margin: 0 auto;
  padding: var(--space-4) var(--page-gutter) var(--space-4);
}

.landing__first {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--space-6);
  min-height: 0;
}

.landing__copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-4);
}

.landing__title {
  font: var(--text-display);
  letter-spacing: var(--tracking-display);
  text-wrap: balance;
}

.landing__lede {
  max-width: var(--measure);
  color: var(--text-muted);
  font: var(--text-body);
}

.landing__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.landing__trust {
  color: var(--text-muted);
}

.landing__examples {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--card-gap);
}

/* Cards in one row share its height. */
.landing__examples > li {
  display: grid;
}

/* Phones show two examples; the third waits for the wider screen. */
.landing__examples > li:nth-child(3) {
  display: none;
}

@media (min-width: 901px) {
  .landing {
    padding-block: var(--space-6);
  }

  .landing__first {
    display: grid;
    grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
    align-items: center;
    gap: var(--space-16);
  }

  .landing__copy {
    gap: var(--space-6);
  }

  .landing__examples {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .landing__examples > li:nth-child(3) {
    display: grid;
  }
}
</style>
