<script setup lang="ts">
import type { MessageKey } from '../composables/useI18n'
import { wave } from '../lib/wave'
definePageMeta({ middleware: ['guest'], fit: true })

const { t } = useI18n()

/** Three people as small posters, the way reports look; the pulses are a drawn example, not anyone's data. */
const wide = useMediaQuery('(min-width: 901px)')
const examples = [
  { key: 'ex1', hue: 'green', pulse: wave(1, 72) },
  { key: 'ex2', hue: 'violet', pulse: wave(2, 36) },
  { key: 'ex3', hue: 'orange', pulse: wave(3, 36) },
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
    <section class="landing__copy" aria-labelledby="hero-title">
      <h1 id="hero-title" class="landing__title">{{ t('landing.title') }} {{ t('landing.titleSoft') }}</h1>
      <p class="landing__lede">{{ t('landing.lede') }}</p>
      <div class="landing__actions landing__actions--wide">
        <UiButton variant="primary" to="/login">{{ t('landing.cta') }}</UiButton>
        <UiButton to="/example">{{ t('landing.nav.example') }}</UiButton>
      </div>
    </section>
    <ul class="landing__examples" :aria-label="t('landing.examplesLabel')">
      <li v-for="(example, index) in examples" :key="example.key" class="example" :data-hue="example.hue">
        <span class="example__title">{{ t(`landing.${example.key}.title` as MessageKey) }}</span>
        <span class="example__text">{{ t(`landing.${example.key}.text` as MessageKey) }}</span>
        <Pulse
          class="example__pulse"
          :data="example.pulse"
          :height="index === 0 && wide ? 34 : 16"
          :bars="index === 0 && wide ? 72 : 36"
        />
      </li>
    </ul>
    <div class="landing__actions landing__actions--narrow">
      <UiButton variant="primary" block to="/login">{{ t('landing.cta') }}</UiButton>
      <UiButton variant="secondary" block to="/example">{{ t('landing.exampleLink') }}</UiButton>
    </div>
  </div>
</template>

<style scoped>
/* Phones: the title, two example posters, the one action at the bottom. Desktop: copy left, posters right. */
.landing {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-6);
  width: 100%;
  max-width: calc(var(--page-max) + var(--page-gutter) * 2);
  margin: 0 auto;
  padding: var(--space-4) var(--page-gutter) var(--space-6);
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

.landing__examples {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--card-gap);
}

/* Phones show two examples, as on the mockup; the third waits for the wider screen. */
.example:nth-child(3) {
  display: none;
}

.example {
  --pulse-you: var(--on-poster);
  --pulse-them: var(--on-them);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
  padding: var(--card-padding);
  border-radius: var(--radius-lg);
  background: var(--poster);
  color: var(--on-poster);
}

.example__title {
  font: var(--text-h3);
  letter-spacing: var(--tracking-h3);
}

.example__text {
  color: var(--on-poster-muted);
  font: var(--text-small);
}

.example__pulse {
  margin-top: var(--space-4);
}

.landing__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.landing__actions--wide {
  display: none;
}

.landing__actions--narrow {
  margin-top: auto;
}

@media (min-width: 901px) {
  .landing {
    display: grid;
    grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
    align-items: center;
    gap: var(--space-16);
    padding-block: var(--space-6) var(--space-10);
  }

  .landing__copy {
    gap: var(--space-6);
  }

  .landing__actions--wide {
    display: flex;
    flex-direction: row;
    gap: var(--space-3);
  }

  .landing__actions--narrow {
    display: none;
  }

  .landing__examples {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .example:first-child {
    grid-column: 1 / -1;
    padding: var(--space-8);
    border-radius: var(--radius-xl);
  }

  .example:first-child .example__title {
    font: var(--text-h1);
    letter-spacing: var(--tracking-h1);
  }

  .example:first-child .example__text {
    font: var(--text-body);
  }

  .example:first-child .example__pulse {
    margin-top: var(--space-6);
  }

  .example:nth-child(3) {
    display: flex;
  }
}
</style>
