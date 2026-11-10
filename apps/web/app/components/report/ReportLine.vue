<script setup lang="ts">
/**
 * The one comparison of two sides in the report: you first and on the left in ink, the other side on the
 * right in their colour; one bar under the numbers, never text inside it.
 *   lg — a card's comparison: the two names, the two numbers, the bar (a part's first finding draws the
 *        numbers in the figure size and a thicker bar)
 *   sm — a row: value, bar, value on one line
 * A side with nothing has no part, and the other fills the bar.
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
    /** No bar where a longer one would read as better (reply time): the two values only. */
    bar?: boolean
  }>(),
  {
    left: undefined,
    right: undefined,
    leftName: undefined,
    rightName: undefined,
    label: undefined,
    size: 'sm',
    bar: true,
  },
)
const { t, formatPercent } = useI18n()
const you = useYouLabel()

const total = computed(() => props.mine + props.theirs)
const share = (value: number) => (total.value ? (value / total.value) * 100 : 50)
const join = (name: string | undefined, value: string) => (name ? `${name} ${value}` : value)
const leftText = computed(() => join(props.leftName, props.left ?? formatPercent(share(props.mine))))
const rightText = computed(() => join(props.rightName, props.right ?? formatPercent(share(props.theirs))))
/** Read aloud with both sides named, whatever is drawn. */
const spoken = computed(
  () =>
    props.label ??
    `${props.leftName ?? you.value}: ${props.left ?? formatPercent(share(props.mine))}; ${
      props.rightName ?? t('chart.them')
    }: ${props.right ?? formatPercent(share(props.theirs))}`,
)
</script>

<template>
  <div class="cmp" :class="`cmp--${size}`" role="img" :aria-label="spoken">
    <template v-if="size === 'lg'">
      <span class="cmp__name" aria-hidden="true">{{ leftName ?? you }}</span>
      <span class="cmp__name cmp__name--them" aria-hidden="true">{{ rightName ?? t('chart.them') }}</span>
      <span class="cmp__num" aria-hidden="true">{{ left ?? formatPercent(share(mine)) }}</span>
      <span class="cmp__num cmp__num--them" aria-hidden="true">{{ right ?? formatPercent(share(theirs)) }}</span>
    </template>
    <span v-else class="cmp__value" aria-hidden="true">{{ leftText }}</span>
    <span v-if="bar" class="cmp__bar" aria-hidden="true">
      <i v-if="mine || !total" class="cmp__mine" :style="{ flexGrow: share(mine) }" />
      <i v-if="theirs || !total" class="cmp__theirs" :style="{ flexGrow: share(theirs) }" />
    </span>
    <span v-if="size !== 'lg'" class="cmp__value cmp__value--them" aria-hidden="true">{{ rightText }}</span>
  </div>
</template>

<style scoped>
.cmp--lg {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-1) var(--space-2);
}

.cmp--sm {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.cmp__name {
  color: var(--text-muted);
  font: var(--text-small);
}

.cmp__name--them,
.cmp__num--them {
  text-align: right;
}

.cmp__name--them {
  color: var(--them-ink);
}

.cmp__num {
  font: var(--text-num);
  letter-spacing: var(--tracking-num);
  white-space: nowrap;
}

/* A part's first finding: the numbers in the figure size, a thicker bar. */
:global(.report-section--hero .cmp__num) {
  font: var(--text-figure);
  letter-spacing: var(--tracking-figure);
}

.cmp__value {
  flex: none;
  min-width: var(--space-8);
  font: var(--text-small-strong);
  white-space: nowrap;
}

.cmp__value--them {
  color: var(--them-ink);
  text-align: right;
}

.cmp__bar {
  display: flex;
  gap: var(--space-0-5);
  height: var(--bar-height);
  overflow: hidden;
  border-radius: var(--radius-full);
}

.cmp--lg .cmp__bar {
  grid-column: 1 / -1;
  margin-top: var(--space-2);
}

.cmp--sm .cmp__bar {
  flex: 1;
}

:global(.report-section--hero .cmp__bar) {
  height: var(--bar-height-lg);
}

.cmp__bar i {
  flex-basis: 0;
  min-width: var(--space-1);
  border-radius: var(--radius-full);
}

.cmp__mine {
  background: var(--you);
}

.cmp__theirs {
  background: var(--them);
}
</style>
