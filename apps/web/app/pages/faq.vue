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
  (
    [
      { key: 'read', icon: Eye, tone: 'ink' },
      { key: 'keep', icon: Database, tone: 'plain' },
      { key: 'notKeep', icon: EyeOff, tone: 'lime' },
      { key: 'never', icon: Ban, tone: 'plain' },
      { key: 'off', icon: Power, tone: 'plain' },
      { key: 'delete', icon: Trash2, tone: 'plain' },
    ] as const
  ).map((fact) => ({ ...fact, title: t(`faq.${fact.key}.title`), text: t(`faq.${fact.key}.text`) })),
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
  <UiPageContainer>
    <div class="page">
      <UiPageHeader :title="t('faq.title')">
        <template #lede>
          {{ t('faq.lede') }} <NuxtLink class="link" to="/login#privacy">{{ t('faq.policy') }}</NuxtLink>
        </template>
      </UiPageHeader>

      <ul class="bento faq__facts">
        <li
          v-for="fact in facts"
          :key="fact.key"
          class="tile span-4 fact"
          :class="{ 'tile--ink': fact.tone === 'ink', 'tile--lime': fact.tone === 'lime' }"
        >
          <component :is="fact.icon" class="fact__icon icon-lg" aria-hidden="true" />
          <h2 class="t-title">{{ fact.title }}</h2>
          <p class="fact__text">{{ fact.text }}</p>
        </li>
      </ul>

      <UiPageSection :title="t('faq.questions')">
        <div class="tile qa-list">
          <details v-for="item in questions" :key="item.key" class="qa">
            <summary class="qa__q">
              <span>{{ item.question }}</span>
              <ChevronDown class="qa__chevron" aria-hidden="true" />
            </summary>
            <p class="qa__a">{{ item.answer }}</p>
          </details>
        </div>
      </UiPageSection>

      <div class="faq__ctas">
        <UiButton variant="primary" size="lg" :icon="Send" to="/login">{{ t('faq.cta') }}</UiButton>
        <UiButton variant="secondary" size="lg" to="/example">{{ t('faq.example') }}</UiButton>
      </div>
    </div>
  </UiPageContainer>
</template>

<style scoped>
.faq__facts {
  margin: 0;
  padding: 0;
  list-style: none;
}

.fact {
  gap: var(--space-2);
  min-height: 180px;
}

.fact__icon {
  margin-bottom: auto;
  padding-bottom: var(--space-4);
  box-sizing: content-box;
}

.fact__text {
  color: var(--text-muted);
  font: var(--text-small);
  font-size: 14px;
  line-height: 20px;
}

.qa-list {
  gap: 0;
  padding-block: var(--space-1);
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
  font: var(--text-title);
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
  font: var(--text-body);
  font-size: 15px;
  line-height: 24px;
}

.faq__ctas {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

@media (max-width: 640px) {
  .fact {
    min-height: 0;
  }

  .fact__icon {
    padding-bottom: var(--space-2);
  }

  .faq__ctas {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
