<script setup lang="ts">
const { t } = useI18n()
useSeoMeta({
  title: () => t('faq.seoTitle'),
  description: () => t('faq.seoDescription'),
  ogTitle: () => t('faq.seoTitle'),
  ogDescription: () => t('faq.seoDescription'),
})

/** What happens to the chat, in the order people worry about it. */
const facts = usePrivacyFacts()

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
  <div class="doc">
    <header class="doc__head">
      <h1 class="t-h1">{{ t('faq.title') }}</h1>
      <p class="doc__lede">{{ t('faq.lede') }}</p>
    </header>
    <div class="doc__grid">
      <UiGroup :header="t('faq.questions')">
        <UiListRow v-for="item in questions" :key="item.key" :title="item.question" :subtitle="item.answer" wrap />
      </UiGroup>
      <UiGroup :header="t('faq.dataTitle')">
        <UiListRow v-for="fact in facts.slice(0, 3)" :key="fact.key" :title="fact.title" :subtitle="fact.text" wrap>
          <template #leading><component :is="fact.icon" aria-hidden="true" /></template>
        </UiListRow>
        <UiListRow to="/privacy" :title="t('privacy.pageTitle')" chevron />
      </UiGroup>
    </div>
  </div>
</template>

<style scoped>
.doc {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  width: 100%;
  max-width: calc(var(--page-max) + var(--page-gutter) * 2);
  margin: 0 auto;
  padding: var(--space-4) var(--page-gutter) var(--page-bottom);
}

.doc__head {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.doc__lede {
  color: var(--text-muted);
  font: var(--text-body);
}

.doc__grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

/* Desktop: the questions on the left, the data in short beside them — no empty half. */
@media (min-width: 901px) {
  .doc {
    gap: var(--space-10);
    padding-top: var(--page-top);
  }

  .doc__grid {
    display: grid;
    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
    align-items: start;
    gap: var(--space-10);
  }
}
</style>
