<script setup lang="ts">
const { t } = useI18n()
const analysis = useAnalysis()
</script>

<template>
  <div class="first">
    <header class="first__head">
      <h1 class="t-h1">{{ t(analysis.isActive.value ? 'home.firstReadingTitle' : 'home.firstTitle') }}</h1>
      <p class="t-lede">{{ t(analysis.isActive.value ? 'home.firstReadingLede' : 'home.firstLede') }}</p>
    </header>
    <ChatPicker />
  </div>
</template>

<style scoped>
.first {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  max-width: var(--page-max-narrow);
}

.first__head {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
</style>
