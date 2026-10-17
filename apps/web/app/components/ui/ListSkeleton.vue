<script setup lang="ts">
import Skeleton from './Skeleton.vue'

withDefaults(defineProps<{ rows?: number; avatar?: boolean }>(), { rows: 5, avatar: true })
</script>

<template>
  <div class="loading-list" aria-hidden="true">
    <div v-for="row in rows" :key="row" class="loading-row">
      <Skeleton v-if="avatar" width="40px" height="40px" radius="50%" />
      <div class="loading-copy">
        <Skeleton width="65%" height="16px" />
        <Skeleton width="42%" height="12px" />
      </div>
      <Skeleton class="loading-action" width="96px" height="40px" radius="var(--radius-full)" />
    </div>
  </div>
</template>

<style scoped>
.loading-list {
  min-width: 0;
  border-top: 1px solid var(--border);
}
.loading-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 16px 12px;
  border-bottom: 1px solid var(--border);
}
.loading-row:last-child {
  border-bottom: 0;
}
.loading-copy {
  display: grid;
  flex: 1;
  min-width: 0;
  gap: 10px;
}
@media (max-width: 380px) {
  .loading-action {
    width: 64px !important;
  }
  .loading-row {
    padding-inline: 0;
    gap: 8px;
  }
}
</style>
