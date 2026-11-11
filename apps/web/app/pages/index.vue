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
/** While the hero's buttons are on screen the header keeps its own «Войти» out of the way (SiteHeader). */
const heroInView = useState('hero-cta-in-view', () => true)
const actions = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | undefined
onMounted(() => {
  if (!actions.value || !('IntersectionObserver' in window)) return (heroInView.value = false)
  // A button gone under the sticky header counts as gone.
  const header = document.querySelector<HTMLElement>('.site-header')?.offsetHeight ?? 0
  observer = new IntersectionObserver(([entry]) => (heroInView.value = Boolean(entry?.isIntersecting)), {
    rootMargin: `-${header}px 0px 0px 0px`,
  })
  observer.observe(actions.value)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  heroInView.value = true
})

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
        <div ref="actions" class="landing__actions">
          <UiButton variant="primary" size="lg" to="/login">{{ t('landing.cta') }}</UiButton>
          <!-- The second way is a word, not a second slab: one call to action on the first screen. -->
          <NuxtLink class="landing__more" to="/example">
            {{ t('landing.nav.example') }}<ArrowRight aria-hidden="true" />
          </NuxtLink>
        </div>
        <p class="landing__trust t-small">
          {{ t('landing.trust') }}
          <NuxtLink class="link" to="/privacy">{{ t('landing.trustLink') }}</NuxtLink>
        </p>
      </section>
      <LandingDeck class="landing__deck" :cards="deck" :label="t('landing.examplesLabel')" />
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
  align-items: center;
  gap: var(--space-2) var(--space-6);
}

/* «Пример отчёта →»: ink text at the button's height, the arrow nudging forward under the pointer. */
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

.landing__trust {
  color: var(--text-muted);
}

/* The one entrance of the page: the promise rises in, line by line, as the deck is dealt beside it. */
.landing__copy > * {
  animation: hero-in var(--duration-sheet) var(--ease-standard) both;
}

.landing__copy > :nth-child(2) {
  animation-delay: var(--stagger-card);
}

.landing__copy > :nth-child(3) {
  animation-delay: calc(var(--stagger-card) * 2);
}

.landing__copy > :nth-child(4) {
  animation-delay: calc(var(--stagger-card) * 3);
}

@keyframes hero-in {
  from {
    opacity: 0;
    translate: 0 var(--space-3);
  }
}

@media (prefers-reduced-motion: reduce) {
  .landing__copy > * {
    animation: none;
  }
}

/* Desktop: the promise on the left, the deck of reports on the right, both on the screen's optical centre. */
@media (min-width: 901px) {
  .landing {
    padding-block: var(--space-6);
  }

  .landing__first {
    display: grid;
    grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
    align-items: center;
    gap: var(--space-16);
  }

  .landing__copy {
    gap: var(--space-6);
  }
}
</style>
