<script setup lang="ts">
import { Send } from '../../lib/icons'

/** No clipboard: the address as selectable text, and the system «Поделиться» where the browser has it. */
defineProps<{ url: string; canShare: boolean }>()
defineEmits<{ share: [] }>()
const { t } = useI18n()
</script>

<template>
  <div class="fallback" role="status">
    <p class="fallback__note">{{ t('share.link.manual') }}</p>
    <p class="fallback__url" tabindex="0">{{ url }}</p>
    <UiGroup v-if="canShare">
      <UiListRow as="button" :title="t('share.link.system')" @click="$emit('share')">
        <template #leading><Send aria-hidden="true" /></template>
      </UiListRow>
    </UiGroup>
  </div>
</template>

<style scoped>
.fallback {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}

.fallback__note {
  color: var(--text-muted);
  font: var(--text-label);
}

.fallback__url {
  padding: var(--space-3);
  border-radius: var(--radius-well);
  background: var(--fill-raised);
  font: var(--text-label);
  overflow-wrap: anywhere;
  user-select: all;
}
</style>
