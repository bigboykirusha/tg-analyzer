<script setup lang="ts">
import { ArrowLeft } from '../lib/icons'

const { t } = useI18n()
const auth = useAuthStore()

useSeoMeta({
  title: () => t('privacy.title'),
  description: () => t('privacy.summaryLead'),
})

/** Each section: a title and paragraphs or a list, all from the copy files. */
const sections = computed(() => [
  {
    key: 'receive',
    title: t('privacy.receive.title'),
    items: [
      t('privacy.receive.phone'),
      t('privacy.receive.profile'),
      t('privacy.receive.chats'),
      t('privacy.receive.messages'),
    ],
  },
  {
    key: 'store',
    title: t('privacy.store.title'),
    items: [
      t('privacy.store.reports'),
      t('privacy.store.people'),
      t('privacy.store.session'),
      t('privacy.store.technical'),
    ],
  },
  { key: 'use', title: t('privacy.use.title'), paragraphs: [t('privacy.use.text')] },
  { key: 'share', title: t('privacy.share.title'), paragraphs: [t('privacy.share.text'), t('privacy.share.hosting')] },
  { key: 'keep', title: t('privacy.keep.title'), paragraphs: [t('privacy.keep.text')] },
  {
    key: 'delete',
    title: t('privacy.delete.title'),
    paragraphs: [t('privacy.delete.text'), t('privacy.delete.telegram')],
  },
])

const summary = computed(() => [
  t('privacy.summary.read'),
  t('privacy.summary.texts'),
  t('privacy.summary.session'),
  t('privacy.summary.delete'),
])
</script>

<template>
  <main class="legal-page">
    <UiPageContainer size="narrow">
      <article class="legal">
        <NuxtLink class="legal__back" :to="auth.isAuthenticated ? '/people' : '/login'">
          <ArrowLeft aria-hidden="true" />
          {{ t('common.back') }}
        </NuxtLink>

        <header class="legal__head">
          <h1 class="t-h1">{{ t('privacy.title') }}</h1>
          <p class="legal__updated">{{ t('privacy.updated') }}</p>
        </header>

        <section class="legal__summary panel" :aria-label="t('privacy.summaryTitle')">
          <h2 class="t-title">{{ t('privacy.summaryTitle') }}</h2>
          <p class="legal__text">{{ t('privacy.summaryLead') }}</p>
          <ul class="legal__list">
            <li v-for="item in summary" :key="item">{{ item }}</li>
          </ul>
        </section>

        <section v-for="section in sections" :key="section.key" class="legal__section">
          <h2 class="t-title">{{ section.title }}</h2>
          <p v-for="paragraph in section.paragraphs ?? []" :key="paragraph" class="legal__text">{{ paragraph }}</p>
          <ul v-if="section.items" class="legal__list">
            <li v-for="item in section.items" :key="item">{{ item }}</li>
          </ul>
        </section>
      </article>
    </UiPageContainer>
  </main>
</template>

<style scoped>
.legal-page {
  min-height: 100dvh;
  padding: var(--space-12) 0 var(--space-16);
  background: var(--bg);
  color: var(--text);
}

.legal {
  display: grid;
  gap: var(--space-8);
}

.legal__back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  justify-self: start;
  min-height: var(--control-sm);
  padding: 0 var(--space-3) 0 var(--space-2);
  border-radius: var(--radius-full);
  color: var(--text-muted);
  font: var(--text-control);
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

@media (hover: hover) {
  .legal__back:hover {
    background: var(--hover);
    color: var(--text);
  }
}

.legal__head {
  display: grid;
  gap: var(--space-2);
}

.legal__updated {
  color: var(--text-muted);
  font: var(--text-small);
}

.legal__summary {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-6);
}

.legal__section {
  display: grid;
  gap: var(--space-3);
}

.legal__text {
  color: var(--text);
  font: var(--text-body);
}

.legal__list {
  display: grid;
  gap: var(--space-2);
  padding-left: var(--space-5);
  color: var(--text);
  font: var(--text-body);
}

.legal__list li::marker {
  color: var(--text-muted);
}

@media (max-width: 640px) {
  .legal-page {
    padding-top: var(--space-6);
  }

  .legal {
    gap: var(--space-6);
  }

  .legal__summary {
    padding: var(--space-5);
  }
}
</style>
