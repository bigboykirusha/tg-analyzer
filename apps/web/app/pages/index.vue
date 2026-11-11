<script setup lang="ts">
import type { MessageKey } from '../composables/useI18n'
import { ArrowRight } from '../lib/icons'
import { wave } from '../lib/wave'
definePageMeta({ middleware: ['guest'], fit: true })

const { t } = useI18n()

/** Three people as the cards of home, the way reports look; the pulses are a drawn example, not anyone's data. */
const examples = [
  { key: 'ex1', chatId: '1011', pulse: wave(1, 36) },
  { key: 'ex2', chatId: '1002', pulse: wave(2, 36) },
  { key: 'ex3', chatId: '1003', pulse: wave(3, 36) },
]
/** The landing deck: the three examples as report posters, in the order they are dealt. */
const deck = computed(() =>
  examples.map((example) => {
    const title = t(`landing.${example.key}.title` as MessageKey)
    return {
      key: example.key,
      chatId: example.chatId,
      title,
      avatarTitle: title.split(',')[0]!,
      meta: t(`landing.${example.key}.text` as MessageKey),
      pulse: example.pulse,
    }
  }),
)
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
    <!--
      One sequence for both layouts, in the phone's reading order: the promise, «Пример отчёта», the deck, the
      call to action, the privacy line. A computer lays the same items out as two columns.
    -->
    <section class="landing__first" aria-labelledby="hero-title">
      <h1 id="hero-title" class="landing__title">{{ t('landing.title') }} {{ t('landing.titleSoft') }}</h1>
      <p class="landing__lede">{{ t('landing.lede') }}</p>
      <!-- The second way is a word with an arrow, not a second slab: one call to action on the screen. -->
      <NuxtLink class="landing__more" to="/example">
        {{ t('landing.nav.example') }}<ArrowRight aria-hidden="true" />
      </NuxtLink>
      <LandingDeck class="landing__deck" :cards="deck" :label="t('landing.examplesLabel')" />
      <UiButton class="landing__cta" variant="primary" size="lg" to="/login">{{ t('landing.cta') }}</UiButton>
      <p class="landing__trust t-small">
        {{ t('landing.trust') }}
        <NuxtLink class="link" to="/privacy">{{ t('landing.trustLink') }}</NuxtLink>
      </p>
    </section>
  </div>
</template>

<style scoped>
/*
 * One screen, phone or desktop. A phone reads top to bottom in two groups: the story (title, lead, «Пример
 * отчёта») on top, the action (the button, the privacy line) under the thumb, and the deck takes the height
 * between them, scaling itself into it. Inside a group the step is --space-3; the deck keeps at least
 * --space-6 from both groups.
 */
.landing {
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  min-height: 0;
  max-width: calc(var(--page-max) + var(--page-gutter) * 2);
  margin: 0 auto;
  padding: var(--space-4) var(--page-gutter) calc(var(--space-2) + env(safe-area-inset-bottom, 0px));
}

.landing__first {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  min-height: 0;
}

.landing__title {
  font: var(--text-display);
  letter-spacing: var(--tracking-display);
  text-wrap: balance;
}

.landing__lede {
  max-width: var(--measure);
  margin-top: var(--space-3);
  color: var(--text-muted);
  font: var(--text-body);
}

/*
 * «Пример отчёта →»: ink text at a tap's height; the arrow says «another page», as a standalone link does
 * (privacy, inside a sentence, is underlined instead). Its box is taller than its line, so it sits flush under
 * the lead and its text still lands one --space-3 below it.
 */
.landing__more {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-height: var(--control-md);
  color: var(--text);
  font: var(--text-ui);
}

.landing__more svg {
  width: var(--icon-sm);
  height: var(--icon-sm);
  transition: translate var(--duration-fast) var(--ease-standard);
}

@media (hover: hover) and (pointer: fine) {
  .landing__more:hover svg {
    translate: var(--space-1) 0;
  }
}

/* The deck takes the height left between the groups. */
.landing__deck {
  flex: 1 1 0;
  align-self: stretch;
  min-height: 0;
  margin-block: var(--space-4) var(--space-6);
}

/* A phone: the one call to action is the width of the column, under the thumb; the privacy line centred under it. */
.landing__cta {
  align-self: stretch;
}

.landing__trust {
  align-self: stretch;
  margin-top: var(--space-3);
  color: var(--text-muted);
  text-align: center;
}

/* A phone: two lines, not three. */
@media (max-width: 900px) {
  .landing__title {
    font-size: var(--display-fit);
    line-height: 1;
  }
}

/* The one entrance of the page: the copy rises in, line by line, as the deck is dealt. */
.landing__first > :not(.landing__deck) {
  animation: hero-in var(--duration-sheet) var(--ease-standard) both;
}

.landing__lede {
  animation-delay: var(--stagger-card);
}

.landing__more {
  animation-delay: calc(var(--stagger-card) * 2);
}

.landing__cta,
.landing__trust {
  animation-delay: calc(var(--stagger-card) * 3);
}

@keyframes hero-in {
  from {
    opacity: 0;
    translate: 0 var(--space-3);
  }
}

@media (prefers-reduced-motion: reduce) {
  .landing__first > * {
    animation: none;
  }
}

/*
 * Desktop: the promise on the left, the deck on the right, both on the screen's optical centre. The left column
 * is two tracks (the button, then «Пример отчёта» beside it); the empty rows above and below centre the copy.
 */
@media (min-width: 901px) {
  .landing {
    padding-block: var(--space-6);
  }

  .landing__first {
    display: grid;
    grid-template-columns: max-content minmax(0, 2fr) minmax(0, 3fr);
    grid-template-rows: 1fr repeat(4, auto) 1fr;
    align-items: center;
    column-gap: var(--space-6);
  }

  .landing__title {
    grid-area: 2 / 1 / 3 / 3;
  }

  .landing__lede {
    grid-area: 3 / 1 / 4 / 3;
    margin-top: var(--space-6);
  }

  .landing__cta {
    grid-area: 4 / 1 / 5 / 2;
    justify-self: start;
    margin-top: var(--space-6);
  }

  .landing__more {
    grid-area: 4 / 2 / 5 / 3;
    justify-self: start;
    margin-top: var(--space-6);
  }

  .landing__trust {
    grid-area: 5 / 1 / 6 / 3;
    margin-top: var(--space-6);
    text-align: start;
  }

  .landing__deck {
    grid-area: 1 / 3 / -1 / 4;
    margin: 0 0 0 var(--space-10);
  }
}
</style>
