<script setup lang="ts">
import { ChevronDown } from '../lib/icons'

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
    [{ key: 'read' }, { key: 'keep' }, { key: 'notKeep' }, { key: 'never' }, { key: 'off' }, { key: 'delete' }] as const
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

      <!-- Six promises as one sheet of facts: the claim on the left, what it means beside it. -->
      <dl class="tile faq__facts">
        <div v-for="fact in facts" :key="fact.key" class="fact">
          <dt class="fact__title">{{ fact.title }}</dt>
          <dd class="fact__text">{{ fact.text }}</dd>
        </div>
      </dl>

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
    </div>
  </UiPageContainer>
</template>

<style scoped>
.faq__facts {
  gap: 0;
  margin: 0;
  padding-block: var(--space-2);
}

.fact {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: var(--space-2) var(--space-8);
  padding-block: var(--space-4);
}

.fact + .fact {
  box-shadow: var(--divider-top);
}

.fact__title {
  font: var(--text-title);
}

.fact__text {
  margin: 0;
  color: var(--text-muted);
  font: var(--text-body);
}

@media (max-width: 640px) {
  .fact {
    grid-template-columns: minmax(0, 1fr);
  }
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
  min-height: calc(var(--control-md) + var(--space-3));
  padding-block: var(--space-4);
  font: var(--text-title);
  cursor: pointer;
  list-style: none;
}

.qa__q::-webkit-details-marker {
  display: none;
}

.qa__q:focus-visible {
  border-radius: var(--radius-sm);
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
  padding-bottom: var(--space-6);
  color: var(--text-muted);
  font: var(--text-body);
}

@media (max-width: 640px) {
  /* Phones: the icon beside the text, as a list. */
  .fact {
    flex-direction: row;
    align-items: flex-start;
    gap: var(--space-3);
    padding: var(--space-4);
  }
}
</style>
