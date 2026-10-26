<script setup lang="ts">
import { Ban, ChevronDown, Database, Eye, EyeOff, Power, Send, Trash2 } from '../lib/icons'

const { t } = useI18n()
useSeoMeta({
  title: () => t('faq.seoTitle'),
  description: () => t('faq.seoDescription'),
  ogTitle: () => t('faq.seoTitle'),
  ogDescription: () => t('faq.seoDescription'),
})

/** What happens to the chat, in the order people worry about it. */
const facts = computed(() =>
  [
    { key: 'read', icon: Eye, tone: 'ink' },
    { key: 'keep', icon: Database, tone: 'plain' },
    { key: 'notKeep', icon: EyeOff, tone: 'lime' },
    { key: 'never', icon: Ban, tone: 'plain' },
    { key: 'off', icon: Power, tone: 'plain' },
    { key: 'delete', icon: Trash2, tone: 'plain' },
  ].map((fact) => ({ ...fact, title: t(`faq.${fact.key}.title`), text: t(`faq.${fact.key}.text`) })),
)

const questions = computed(() =>
  (['safe', 'notice', 'store', 'price', 'groups', 'phone', 'official'] as const).map((key) => ({
    key,
    question: t(`faq.q.${key}`),
    answer: t(`faq.a.${key}`),
  })),
)

// The same answers as structured data, so search can show them as a FAQ.
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: () =>
        JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: questions.value.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: { '@type': 'Answer', text: item.answer },
          })),
        }),
    },
  ],
})
</script>

<template>
  <main class="faq">
    <UiPageContainer>
      <NuxtLink class="faq__brand" to="/"><BrandMark />TG Analyzer</NuxtLink>

      <header class="faq__head">
        <h1 class="faq__title">{{ t('faq.title') }}</h1>
        <p class="faq__lede">{{ t('faq.lede') }}</p>
        <NuxtLink class="faq__policy" to="/login#privacy">{{ t('faq.policy') }}</NuxtLink>
      </header>

      <ul class="bento faq__facts">
        <li
          v-for="fact in facts"
          :key="fact.key"
          class="tile span-4 fact"
          :class="{ 'tile--ink': fact.tone === 'ink', 'tile--lime': fact.tone === 'lime' }"
        >
          <component :is="fact.icon" class="fact__icon icon-lg" aria-hidden="true" />
          <h2 class="fact__title">{{ fact.title }}</h2>
          <p class="fact__text">{{ fact.text }}</p>
        </li>
      </ul>

      <section class="faq__questions" aria-labelledby="questions-title">
        <h2 id="questions-title" class="faq__section-title">{{ t('faq.questions') }}</h2>
        <div class="qa-list">
          <details v-for="item in questions" :key="item.key" class="qa">
            <summary class="qa__q">
              <span>{{ item.question }}</span>
              <ChevronDown class="qa__chevron" aria-hidden="true" />
            </summary>
            <p class="qa__a">{{ item.answer }}</p>
          </details>
        </div>
      </section>

      <div class="faq__ctas">
        <UiButton variant="primary" size="lg" :icon="Send" to="/login">{{ t('faq.cta') }}</UiButton>
        <UiButton variant="secondary" size="lg" to="/example">{{ t('faq.example') }}</UiButton>
      </div>
    </UiPageContainer>
  </main>
</template>

<style scoped>
.faq {
  min-height: 100dvh;
  padding-block: clamp(24px, 6vw, 80px);
}

.faq__brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: var(--space-10);
  font: 600 16px/1 var(--font-sans);
  letter-spacing: -0.02em;
}

.faq__head {
  display: grid;
  gap: var(--space-3);
  margin-bottom: var(--space-8);
}

.faq__title {
  font: 600 clamp(32px, 5vw, 56px) / 1.02 var(--font-sans);
  letter-spacing: -0.045em;
  text-wrap: balance;
}

.faq__lede {
  max-width: 52ch;
  color: var(--text-muted);
  font: 400 17px/1.5 var(--font-sans);
}

.faq__policy {
  justify-self: start;
  color: var(--text);
  font: var(--text-ui);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.faq__facts {
  margin: 0;
  padding: 0;
  list-style: none;
}

.fact {
  gap: var(--space-2);
  min-height: 200px;
}

.fact__icon {
  margin-bottom: auto;
  padding-bottom: var(--space-4);
  box-sizing: content-box;
}

.fact__title {
  font: 600 20px/26px var(--font-sans);
  letter-spacing: -0.02em;
}

.fact__text {
  font: 400 15px/22px var(--font-sans);
  opacity: 0.78;
}

.faq__questions {
  display: grid;
  gap: var(--space-4);
  margin-top: var(--space-12);
}

.faq__section-title {
  font: 600 24px/30px var(--font-sans);
  letter-spacing: -0.02em;
}

.qa-list {
  padding: var(--space-1) var(--space-6);
  border-radius: var(--radius-card);
  background: var(--surface);
}

.qa + .qa {
  border-top: 1px solid var(--border);
}

.qa__q {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  min-height: 56px;
  padding-block: var(--space-4);
  font: 600 17px/24px var(--font-sans);
  letter-spacing: -0.01em;
  cursor: pointer;
  list-style: none;
}

.qa__q::-webkit-details-marker {
  display: none;
}

.qa__q:focus-visible {
  border-radius: var(--radius-md);
  outline: none;
  box-shadow: var(--focus-ring);
}

.qa__chevron {
  flex: none;
  color: var(--text-muted);
  transition: transform var(--transition-fast);
}

.qa[open] .qa__chevron {
  transform: rotate(180deg);
}

.qa__a {
  max-width: 68ch;
  padding-bottom: var(--space-5);
  color: var(--text-muted);
  font: 400 15px/24px var(--font-sans);
}

.faq__ctas {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: var(--space-10);
}

@media (max-width: 640px) {
  .fact {
    min-height: 0;
  }

  .fact__icon {
    padding-bottom: var(--space-2);
  }

  .qa-list {
    padding: 0 var(--space-5);
  }

  .faq__ctas {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
