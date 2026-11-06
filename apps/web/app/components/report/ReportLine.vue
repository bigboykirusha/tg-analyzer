<script setup lang="ts">
/**
 * The one comparison line of the report: «value ━━━━ ━━ value», you in ink on the left, the
 * other side in lime on the right. The values default to the two shares in percent. A side with
 * nothing has no stub (a 6 px dot reads as «a little») and «—» at its end.
 */
const props = defineProps<{ mine: number; theirs: number; left?: string; right?: string; label?: string }>()
const { formatPercent } = useI18n()

const total = computed(() => props.mine + props.theirs)
const share = (value: number) => (total.value ? (value / total.value) * 100 : 50)
const NONE = '—'
const leftText = computed(() =>
  props.mine === 0 && total.value ? NONE : (props.left ?? formatPercent(share(props.mine))),
)
const rightText = computed(() =>
  props.theirs === 0 && total.value ? NONE : (props.right ?? formatPercent(share(props.theirs))),
)
</script>

<template>
  <div class="report-line t-num" role="img" :aria-label="label ?? `${left ?? ''} / ${right ?? ''}`">
    <span>{{ leftText }}</span>
    <i class="report-line__bar" aria-hidden="true">
      <b v-if="mine || !total" :style="{ flexGrow: share(mine) }" />
      <b v-if="theirs || !total" class="report-line__them" :style="{ flexGrow: share(theirs) }" />
    </i>
    <span>{{ rightText }}</span>
  </div>
</template>

<style scoped>
.report-line {
  display: grid;
  grid-template-columns: minmax(4ch, auto) minmax(0, 1fr) minmax(4ch, auto);
  align-items: center;
  gap: var(--space-2);
  color: var(--text-muted);
  font: var(--text-small);
}

.report-line > span:last-child {
  text-align: right;
}

.report-line__bar {
  display: flex;
  gap: var(--space-1);
  height: var(--bar-height);
}

.report-line__bar b {
  min-width: var(--bar-height);
  border-radius: var(--radius-full);
  background: var(--you);
}

.report-line__bar .report-line__them {
  background: var(--them);
}
</style>
