<script setup lang="ts">
/**
 * One part of the long report page, a target for `ReportNav`. With `columns`
 * its cards fall into two independent columns, so a short card never stretches
 * to match a tall neighbour; the tabs inside then render their cards without a
 * wrapper of their own.
 *
 * On a phone the part shows its main cards; the `extra` ones open with the
 * button under them, so the page stays a readable length.
 */
defineProps<{ id: string; title: string; columns?: boolean }>()
const { tc, t } = useI18n()

const root = ref<HTMLElement | null>(null)
const extras = ref(0)
const open = ref(false)

function countExtras() {
  extras.value = root.value?.querySelectorAll('.report-section--extra').length ?? 0
}
onMounted(countExtras)
onUpdated(countExtras)
</script>

<template>
  <section
    :id="`part-${id}`"
    ref="root"
    class="report-part"
    :class="{ 'report-part--open': open }"
    :aria-labelledby="`part-${id}-title`"
  >
    <h2 :id="`part-${id}-title`" class="t-h3">{{ title }}</h2>
    <div v-if="columns" class="report-columns"><slot /></div>
    <slot v-else />
    <UiButton v-if="extras" class="report-part__more no-print" variant="secondary" @click="open = !open">
      {{ open ? t('report.more.collapse') : tc('report.more.show', extras) }}
    </UiButton>
  </section>
</template>

<style scoped>
.report-part {
  display: grid;
  gap: var(--space-4);
  scroll-margin-top: calc(var(--topbar-height) + 56px);
}

/* Wider screens show every card: the button is for phones only. */
.report-part__more {
  display: none;
}

@media (max-width: 640px) {
  .report-part__more {
    display: inline-flex;
    width: 100%;
  }

  .report-part:not(.report-part--open) :deep(.report-section--extra) {
    display: none;
  }
}
</style>
