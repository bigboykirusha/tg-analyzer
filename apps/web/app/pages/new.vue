<script setup lang="ts">
/** Picking a chat to analyse: the whole Telegram list with search on its own page. */
definePageMeta({ layout: 'workspace', middleware: ['auth'] })

const { t } = useI18n()
useSeoMeta({ title: () => t('newAnalysis.seoTitle') })
</script>

<template>
  <UiPageContainer>
    <div class="new-analysis">
      <header class="new-analysis__head">
        <h1 class="new-analysis__title">{{ t('newAnalysis.title') }}</h1>
        <p class="new-analysis__lede">{{ t('newAnalysis.lede') }}</p>
      </header>
      <SessionBanner />
      <ChatPicker sticky />
    </div>
  </UiPageContainer>
</template>

<style scoped>
.new-analysis {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.new-analysis__head {
  display: grid;
  gap: var(--space-2);
}

.new-analysis__title {
  font: 600 clamp(28px, 4vw, 40px) / 1.1 var(--font-sans);
  letter-spacing: -0.04em;
}

.new-analysis__lede {
  max-width: 60ch;
  color: var(--text-muted);
  font: 400 15px/22px var(--font-sans);
}
</style>
