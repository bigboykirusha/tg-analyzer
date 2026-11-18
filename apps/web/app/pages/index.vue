<script setup lang="ts">
import { wave } from '../lib/wave'
definePageMeta({
  middleware: ['guest'],
  fit: true,
  // Landing ↔ login is one path (middleware/page-step.global.ts keeps the step to these two pages).
  pageTransition: { name: 'page-step', mode: 'out-in' },
})

const { t } = useI18n()

/** The first card opens out into `/example`. The pulses in the deck are drawn illustrations. */
const examples = [
  // Keys spelled out, not built from a template: a deleted text is then a type error, not a raw key on the landing.
  {
    key: 'ex1',
    chatId: 'example',
    title: 'landing.ex1.title',
    text: 'landing.ex1.text',
    pulse: wave(1, 36),
    to: '/example',
  },
  { key: 'ex2', chatId: '1002', title: 'landing.ex2.title', text: 'landing.ex2.text', pulse: wave(2, 36) },
  { key: 'ex3', chatId: '1003', title: 'landing.ex3.title', text: 'landing.ex3.text', pulse: wave(3, 36) },
] as const
/** The landing deck: the three examples as report posters, in the order they are dealt. */
const deck = computed(() =>
  examples.map((example) => {
    const title = t(example.title, { name: t('example.partner') })
    return {
      key: example.key,
      chatId: example.chatId,
      title,
      avatarTitle: title.split(',')[0]!,
      meta: t(example.text),
      pulse: example.pulse,
      to: 'to' in example ? example.to : undefined,
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
          name: 'TGDuet',
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
      One sequence for both layouts, in the phone's reading order: the promise (privacy is a phrase of it), the
      deck, the call to action, «Пример отчёта». A computer lays the same items out as two columns.
    -->
    <section class="landing__first" aria-labelledby="hero-title">
      <h1 id="hero-title" class="landing__title">{{ t('landing.title') }} {{ t('landing.titleSoft') }}</h1>
      <!-- A phone has no footer, so the promise links to privacy itself; a computer has «Приватность» below. -->
      <p class="landing__lede">
        {{ t('landing.lede') }}
        <NuxtLink class="link landing__privacy" to="/privacy">{{ t('landing.ledePrivacy') }}</NuxtLink
        ><span class="landing__privacy-text">{{ t('landing.ledePrivacy') }}</span
        >.
      </p>
      <LandingDeck class="landing__deck" :cards="deck" :label="t('landing.examplesLabel')" />
      <UiButton class="landing__cta" variant="primary" size="lg" to="/login">{{ t('landing.cta') }}</UiButton>
      <!-- The second way is a word, not a second slab: one call to action on the screen. -->
      <NuxtLink class="landing__more" to="/example">{{ t('landing.nav.example') }}</NuxtLink>
    </section>
  </div>
</template>

<style scoped>
/*
 * One screen, phone or desktop. A phone reads top to bottom in two groups: the story (the title and the lead,
 * whose last phrase is the privacy link) on top, the action («Разобрать чат», «Пример отчёта» under it)
 * under the thumb, and the deck in the middle. It grows into the available space on taller screens. The
 * shortest screens can scroll so the examples keep their readable size.
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

/* On a computer the phrase is plain text: «Приватность» is in the footer. */
.landing__privacy-text {
  display: none;
}

/* The deck takes the height left between the groups and sits in its middle. */
.landing__deck {
  flex: 1 1 0;
  align-self: stretch;
  margin-block: var(--space-3);
}

/* A phone: the one call to action is the width of the column, under the thumb. */
.landing__cta {
  align-self: stretch;
}

/* «Пример отчёта»: ink text at a tap's height, centred under the button. */
.landing__more {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: stretch;
  min-height: var(--control-md);
  margin-top: var(--space-1);
  color: var(--text);
  font: var(--text-label);
  /* The second way in is a word, underlined like a link in print — never a second plate beside the main button. */
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.3em;
  transition: color var(--transition-fast);
}

@media (hover: hover) and (pointer: fine) {
  .landing__more:hover {
    color: var(--text-muted);
  }
}

@media (max-width: 900px) {
  .landing {
    overflow-y: auto;
  }

  .landing__title {
    font-size: var(--display-fit);
    line-height: 1;
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
    grid-template-rows: 1fr repeat(3, auto) 1fr;
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

  .landing__privacy {
    display: none;
  }

  .landing__privacy-text {
    display: inline;
  }

  .landing__cta {
    grid-area: 4 / 1 / 5 / 2;
    justify-self: start;
    margin-top: var(--space-8);
  }

  .landing__more {
    grid-area: 4 / 2 / 5 / 3;
    justify-self: start;
    margin-top: var(--space-8);
  }

  .landing__deck {
    grid-area: 1 / 3 / -1 / 4;
    margin: 0 0 0 var(--space-10);
  }
}
</style>
