<script setup lang="ts">
/**
 * The one comparison of two sides in the report — plaque «Б»: one bar in two parts, the labels inside
 * them. You on the left in ink, the other side on the right in their colour. The labels default to
 * the two shares in percent; `leftName` / `rightName` put a name before them («Вы 51%», «Мила 49%»).
 * A side with nothing has no part, and the other one fills the bar. `size="lg"` (32 px) carries a
 * card's main share; rows use the default (24 px).
 */
const props = withDefaults(
  defineProps<{
    mine: number
    theirs: number
    left?: string
    right?: string
    leftName?: string
    rightName?: string
    label?: string
    size?: 'sm' | 'lg'
  }>(),
  { left: undefined, right: undefined, leftName: undefined, rightName: undefined, label: undefined, size: 'sm' },
)
const { t, formatPercent } = useI18n()

const total = computed(() => props.mine + props.theirs)
const share = (value: number) => (total.value ? (value / total.value) * 100 : 50)
const join = (name: string | undefined, value: string) => (name ? `${name} ${value}` : value)
const leftText = computed(() => join(props.leftName, props.left ?? formatPercent(share(props.mine))))
const rightText = computed(() => join(props.rightName, props.right ?? formatPercent(share(props.theirs))))
/** Read aloud with both sides named, whatever is drawn. */
const spoken = computed(
  () =>
    props.label ??
    `${props.leftName ?? t('report.you')}: ${props.left ?? formatPercent(share(props.mine))}; ${
      props.rightName ?? t('chart.them')
    }: ${props.right ?? formatPercent(share(props.theirs))}`,
)
</script>

<template>
  <div class="plaque t-num" :class="`plaque--${size}`" role="img" :aria-label="spoken">
    <span v-if="mine || !total" class="plaque__part plaque__part--mine" :style="{ flexGrow: share(mine) }">{{
      leftText
    }}</span>
    <span v-if="theirs || !total" class="plaque__part plaque__part--theirs" :style="{ flexGrow: share(theirs) }">{{
      rightText
    }}</span>
  </div>
</template>

<style scoped>
.plaque {
  display: flex;
  gap: var(--space-0-5);
  height: var(--space-6);
  font: var(--text-caption);
  font-weight: 600;
}

.plaque--lg {
  height: var(--space-8);
  font: var(--text-small);
  font-weight: 600;
}

/* Each part is at least as wide as its label; the rest is shared by the two counts. */
.plaque__part {
  display: flex;
  flex-basis: 0;
  align-items: center;
  min-width: max-content;
  padding: 0 var(--space-3);
  border-radius: var(--radius-full);
  background: var(--you);
  color: var(--on-you);
  white-space: nowrap;
}

.plaque__part--theirs {
  justify-content: flex-end;
  background: var(--them);
  color: var(--on-them);
}
</style>
