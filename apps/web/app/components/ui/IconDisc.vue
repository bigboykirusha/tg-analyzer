<script setup lang="ts">
/**
 * An icon as a row's leading mark: ink on a grey circle (`--fill-raised`) of the avatar's size (`--avatar-md`), so
 * a row without a person lines its text up with the rows that have one (avatars, the Telegram mark).
 */
</script>

<template>
  <span class="icon-disc" aria-hidden="true"><slot /></span>
</template>

<style scoped>
.icon-disc {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: var(--avatar-md);
  height: var(--avatar-md);
  border-radius: var(--radius-pill);
  background: var(--fill-raised);
  color: var(--text);
  --icon-size: var(--icon-md);
}
</style>
