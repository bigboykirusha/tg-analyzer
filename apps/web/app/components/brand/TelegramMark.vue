<script setup lang="ts">
/**
 * Telegram's mark — a circle with the paper plane — where a row is about Telegram itself (the bot, 14.11): it tells at a
 * glance where the messages will arrive. In ink, never Telegram's blue: the interface stays monochrome and colour
 * belongs to people; and it marks Telegram, never our own product (Telegram API terms 2.4).
 */
</script>

<template>
  <svg class="tg-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="12" />
    <path
      class="tg-mark__plane"
      d="M5.49 11.74 17.06 7.28c.54-.2 1.01.13.83.95l-1.97 9.28c-.15.66-.54.82-1.09.51l-3.01-2.22-1.45 1.4c-.16.16-.3.3-.61.3l.21-3.06 5.57-5.03c.24-.21-.05-.33-.38-.12l-6.88 4.33-2.96-.93c-.64-.2-.66-.64.14-.95z"
    />
  </svg>
</template>

<style scoped>
.tg-mark {
  display: block;
  width: var(--avatar-md);
  height: var(--avatar-md);
  fill: var(--text);
}

.tg-mark__plane {
  fill: var(--bg);
}
</style>
