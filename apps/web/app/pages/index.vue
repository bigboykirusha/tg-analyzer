<script setup lang="ts">
import type { MessageKey } from '../composables/useI18n'
import { wave } from '../lib/wave'
definePageMeta({ middleware: ['guest'] })

const { t } = useI18n()

/** Three people as the cards of home, the way reports look; the pulses are a drawn example, not anyone's data. */
const examples = [
  { key: 'ex1', chatId: '1011', pulse: wave(1, 36) },
  { key: 'ex2', chatId: '1002', pulse: wave(2, 36) },
  { key: 'ex3', chatId: '1003', pulse: wave(3, 36) },
]
const steps = ['step1', 'step2', 'step3'] as const
const facts = usePrivacyFacts()
const promise = computed(() => facts.value.slice(0, 3))
const recapPulse = wave(5, 36)
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
      </section>
      <ul class="landing__examples" :aria-label="t('landing.examplesLabel')">
        <li v-for="example in examples" :key="example.key">
          <HomeCard
            :chat-id="example.chatId"
            :title="t(`landing.${example.key}.title` as MessageKey)"
            :meta="t(`landing.${example.key}.text` as MessageKey)"
            :has-avatar="false"
          >
            <Pulse :data="example.pulse" :height="12" :bars="28" />
          </HomeCard>
        </li>
      </ul>
    </div>

    <section class="landing__section" aria-labelledby="how-title">
      <h2 id="how-title" class="t-h2">{{ t('landing.howTitle') }}</h2>
      <ol class="steps">
        <li v-for="(step, index) in steps" :key="step" class="step">
          <span class="step__num t-label" aria-hidden="true">{{ index + 1 }}</span>
          <h3 class="t-label">{{ t(`landing.${step}.title` as MessageKey) }}</h3>
          <p class="step__text t-label">{{ t(`landing.${step}.text` as MessageKey) }}</p>
        </li>
      </ol>
    </section>

    <section class="landing__section landing__split" aria-labelledby="privacy-title">
      <div class="landing__side">
        <h2 id="privacy-title" class="t-h2">{{ t('landing.privacyTitle') }}</h2>
        <p class="landing__lede">{{ t('landing.privacyLede') }}</p>
        <UiButton to="/privacy">{{ t('landing.privacyMore') }}</UiButton>
      </div>
      <UiGroup>
        <UiListRow v-for="fact in promise" :key="fact.key" :title="fact.title" :subtitle="fact.text" wrap>
          <template #leading><component :is="fact.icon" aria-hidden="true" /></template>
        </UiListRow>
      </UiGroup>
    </section>

    <section class="landing__section landing__split" aria-labelledby="recap-title">
      <div class="landing__side">
        <h2 id="recap-title" class="t-h2">{{ t('landing.recapTitle') }}</h2>
        <p class="landing__lede">{{ t('landing.recapLede') }}</p>
        <UiButton to="/example">{{ t('landing.exampleLink') }}</UiButton>
      </div>
      <div class="recap" data-hue="green" aria-hidden="true">
        <p class="recap__who t-label">{{ t('landing.ex1.title') }}</p>
        <p class="recap__title t-h1">{{ t('landing.recapCard') }}</p>
        <Pulse :data="recapPulse" :height="20" :bars="36" />
      </div>
    </section>

    <div class="landing__end">
      <UiButton variant="primary" to="/login">{{ t('landing.cta') }}</UiButton>
    </div>
  </div>
</template>

<style scoped>
.landing {
  display: flex;
  flex-direction: column;
  gap: var(--space-10);
  width: 100%;
  max-width: calc(var(--page-max) + var(--page-gutter) * 2);
  margin: 0 auto;
  padding: var(--space-4) var(--page-gutter) var(--space-6);
}

.landing__first {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
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

.landing__examples {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--card-gap);
}

/* Phones show two examples; the third waits for the wider screen. */
.landing__examples > li:nth-child(3) {
  display: none;
}

.landing__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.landing__side {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-3);
}

.steps {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--card-gap);
}

.step {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--card-padding);
  border-radius: var(--radius-card);
  background: var(--surface);
}

.step__num,
.step__text {
  color: var(--text-muted);
}

/* The sample of «Итоги»: a story frame in miniature, on a person's poster colour. */
.recap {
  --pulse-you: var(--on-poster);
  --pulse-them: var(--on-them);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--space-8);
  padding: var(--space-6);
  border-radius: var(--radius-xl);
  background: var(--poster);
  color: var(--on-poster);
}

.recap__who {
  color: var(--on-poster-muted);
}

.landing__end {
  display: flex;
}

@media (min-width: 901px) {
  .landing {
    gap: var(--space-16);
    padding-block: var(--space-6) var(--space-10);
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
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .landing__examples > li:nth-child(3) {
    display: block;
  }

  .steps {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .landing__split {
    display: grid;
    grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
    align-items: center;
    gap: var(--space-16);
  }

  .landing__end {
    display: none;
  }
}
</style>
