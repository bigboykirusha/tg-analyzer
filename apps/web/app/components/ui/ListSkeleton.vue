<script setup lang="ts">
import Skeleton from './Skeleton.vue'

withDefaults(defineProps<{ rows?: number; avatar?: boolean }>(), { rows: 5, avatar: true })

// Shown only after 300 ms of loading so fast responses never flash.
const SHOW_DELAY_MS = 300
const visible = ref(false)
let timer: number | undefined
onMounted(() => {
  timer = window.setTimeout(() => (visible.value = true), SHOW_DELAY_MS)
})
onBeforeUnmount(() => window.clearTimeout(timer))
</script>

<template>
  <div class="loading-list" aria-hidden="true">
    <template v-if="visible">
      <div v-for="row in rows" :key="row" class="loading-row">
        <Skeleton v-if="avatar" width="var(--avatar-md)" height="var(--avatar-md)" radius="var(--radius-full)" />
        <div class="loading-copy">
          <Skeleton width="65%" height="var(--space-4)" />
          <Skeleton width="42%" height="var(--space-3)" />
        </div>
        <Skeleton width="calc(var(--control-lg) * 2)" height="var(--control-sm)" radius="var(--radius-full)" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.loading-list {
  min-width: 0;
}

/* The same white card as the chat list it stands in for. */
.loading-list:has(.loading-row) {
  padding: var(--space-1) 0;
  border-radius: var(--radius-lg);
  background: var(--surface);
}

.loading-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
  /* The height of a chat row (UiListRow lg). */
  min-height: calc(var(--control-md) + var(--space-6));
  padding: var(--space-3) var(--space-4);
}

.loading-row + .loading-row {
  box-shadow: var(--divider-top);
}

.loading-copy {
  display: grid;
  flex: 1;
  min-width: 0;
  gap: var(--space-2);
}
</style>
