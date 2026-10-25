<script setup lang="ts">
const { t } = useI18n()
useSeoMeta({
  title: () => t('terms.title'),
  description: () => t('terms.description'),
})

/** Each section: a title and paragraphs, all from the copy files. */
const sections = computed(() =>
  (['service', 'telegram', 'account', 'data', 'reports', 'limits', 'changes', 'contact'] as const).map((key) => ({
    key,
    title: t(`terms.${key}.title`),
    text: t(`terms.${key}.text`),
  })),
)
</script>

<template>
  <main class="legal">
    <UiPageContainer size="narrow">
      <NuxtLink class="legal__back" to="/login">← {{ t('terms.back') }}</NuxtLink>
      <p class="t-label legal__kicker">{{ t('terms.kicker') }}</p>
      <h1 class="t-h1">{{ t('terms.title') }}</h1>
      <p class="legal__updated">{{ t('terms.updated') }}</p>
      <p class="legal__draft" role="note">{{ t('terms.draft') }}</p>

      <section v-for="(section, index) in sections" :key="section.key" class="legal__section">
        <h2 class="legal__title">
          <span class="legal__index t-num">{{ String(index + 1).padStart(2, '0') }}</span>
          {{ section.title }}
        </h2>
        <p>{{ section.text }}</p>
      </section>
    </UiPageContainer>
  </main>
</template>

<style scoped>
.legal {
  min-height: 100dvh;
  padding-block: clamp(24px, 6vw, 80px);
}

.legal__back {
  display: inline-block;
  margin-bottom: var(--space-8);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font: var(--text-ui);
}

.legal__kicker {
  margin-bottom: var(--space-2);
}

.legal__updated {
  margin-top: var(--space-2);
  color: var(--text-muted);
  font: var(--text-small);
}

.legal__draft {
  margin-block: var(--space-6) var(--space-4);
  padding: var(--space-3) 0;
  border-block: 1px solid var(--border);
  color: var(--text-muted);
  font: var(--text-small);
}

.legal__section {
  display: grid;
  gap: var(--space-2);
  padding-block: var(--space-5);
  border-top: 1px solid var(--border);
}

.legal__title {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  font: var(--text-h2);
  font-size: 20px;
  line-height: 28px;
}

.legal__index {
  color: var(--text-muted);
  font: var(--text-label);
}

.legal__section p {
  max-width: 68ch;
  font: var(--text-body);
}
</style>
