<script setup lang="ts">
/**
 * «Как мы обращаемся с данными»: the promise as six rows, then the questions people ask next, then the
 * policy in full for whoever wants to read it.
 */
const { t } = useI18n()
useSeoMeta({ title: () => t('privacy.pageTitle'), description: () => t('faq.seoDescription') })
const facts = usePrivacyFacts()
const questions = computed(() => (['notice', 'store', 'phone'] as const).map((key) => t(`faq.q.${key}`)))

const policy = computed(() => [
  {
    key: 'receive',
    title: t('privacy.receive.title'),
    items: [t('privacy.receive.phone'), t('privacy.receive.profile'), t('privacy.receive.chats'), t('privacy.receive.messages')],
  },
  { key: 'store', title: t('privacy.store.title'), items: [t('privacy.store.reports'), t('privacy.store.session'), t('privacy.store.technical')] },
  { key: 'use', title: t('privacy.use.title'), paragraphs: [t('privacy.use.text')] },
  { key: 'share', title: t('privacy.share.title'), paragraphs: [t('privacy.share.text'), t('privacy.share.hosting')] },
  { key: 'keep', title: t('privacy.keep.title'), paragraphs: [t('privacy.keep.text')] },
  { key: 'delete', title: t('privacy.delete.title'), paragraphs: [t('privacy.delete.text'), t('privacy.delete.telegram')] },
])
</script>

<template>
  <div class="doc">
    <header class="doc__head">
      <h1 class="t-h1">{{ t('privacy.pageTitle') }}</h1>
      <p class="doc__lede">{{ t('privacy.pageLede') }}</p>
    </header>
    <div class="doc__grid">
      <UiGroup>
        <UiListRow v-for="fact in facts" :key="fact.key" :title="fact.title" :subtitle="fact.text" wrap>
          <template #leading><component :is="fact.icon" aria-hidden="true" /></template>
        </UiListRow>
      </UiGroup>
      <UiGroup :header="t('faq.questions')">
        <UiListRow v-for="question in questions" :key="question" to="/faq" :title="question" chevron />
      </UiGroup>
    </div>
    <section class="doc__policy" aria-labelledby="policy-title">
      <h2 id="policy-title" class="t-h2">{{ t('privacy.policyTitle') }}</h2>
      <div v-for="part in policy" :key="part.key" class="doc__part">
        <h3 class="t-h3">{{ part.title }}</h3>
        <ul v-if="part.items" class="doc__list">
          <li v-for="item in part.items" :key="item">{{ item }}</li>
        </ul>
        <p v-for="paragraph in part.paragraphs ?? []" :key="paragraph">{{ paragraph }}</p>
      </div>
    </section>
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

.doc__policy {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  max-width: var(--page-max-narrow);
}

.doc__part {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  color: var(--text-muted);
}

.doc__part h3 {
  color: var(--text);
}

.doc__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding-left: var(--space-4);
  list-style: disc;
}

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
