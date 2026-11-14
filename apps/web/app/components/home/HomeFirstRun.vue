<script setup lang="ts">
/**
 * The first visit: «С кого начнём?» and straight under it every Telegram chat — the search, «Все / Личные / Группы»
 * and the list in Telegram's order, each row with «Разобрать». The list is what a newcomer came for; it is always
 * there, whereas the month's busiest chats are counted slowly and may not come at all (13.11: a page with only an
 * «Все чаты» row was empty).
 */
const { t } = useI18n()
</script>

<template>
  <div class="first">
    <header class="first__head">
      <h1 class="t-h1">{{ t('home.firstTitle') }}</h1>
      <p class="t-lede">{{ t('home.firstLede') }}</p>
    </header>
    <ChatPicker />
  </div>
</template>

<style scoped>
.first {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.first__head {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
</style>
