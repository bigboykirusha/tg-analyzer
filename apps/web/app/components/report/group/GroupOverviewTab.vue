<script setup lang="ts">
import type { GroupReportDto } from '@tg-analyzer/shared'

/** The top of «Люди»: the awards. What stands out about the pairs has a card of its own. */
defineProps<{ group: GroupReportDto }>()
</script>

<template>
  <GroupAwards :group="group" />
</template>
