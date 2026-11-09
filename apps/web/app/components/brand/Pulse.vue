<script setup lang="ts">
/**
 * The mirrored pulse — the product's signature: one pill per period, your messages above the line in
 * ink, theirs below in the person's deep tone. Heights use a square-root scale so a quiet week still
 * shows and a record week does not flatten the rest. The data is folded into `bars` columns, so a
 * card, the poster and a story draw the same texture whatever they pass.
 */
const props = withDefaults(
  defineProps<{
    data: readonly { sent: number; received: number }[]
    /** Height of each half in px. */
    height?: number
    bars?: number
    label?: string
  }>(),
  { height: 32, bars: 40, label: '' },
)

const columns = computed(() => {
  const source = props.data.length ? props.data : [{ sent: 0, received: 0 }]
  // Always `bars` columns: a long history is folded, a short one is stretched, so every pulse has one texture.
  const count = props.bars
  const out = Array.from({ length: count }, () => ({ sent: 0, received: 0 }))
  if (source.length >= count)
    source.forEach((item, index) => {
      const slot = out[Math.min(count - 1, Math.floor((index * count) / source.length))]!
      slot.sent += item.sent
      slot.received += item.received
    })
  else
    // A short history is drawn smoothly between its points, not as steps of equal bars.
    out.forEach((slot, index) => {
      const at = (index * (source.length - 1)) / Math.max(1, count - 1)
      const low = source[Math.floor(at)]!
      const high = source[Math.ceil(at)]!
      const mix = at - Math.floor(at)
      slot.sent = low.sent + (high.sent - low.sent) * mix
      slot.received = low.received + (high.received - low.received) * mix
    })
  const peak = Math.max(1, ...out.map((item) => Math.max(item.sent, item.received)))
  // At least a dot, so an empty week reads as a quiet one rather than a gap.
  const scale = (value: number) => `${Math.max(8, Math.round(Math.sqrt(value / peak) * 100))}%`
  return out.map((item) => ({ up: scale(item.sent), down: scale(item.received) }))
})
</script>

<template>
  <div class="pulse" :role="label ? 'img' : undefined" :aria-label="label || undefined" :aria-hidden="label ? undefined : 'true'" :style="{ '--pulse-half': `${height}px` }">
    <div class="pulse__half pulse__half--up">
      <i v-for="(column, index) in columns" :key="index" :style="{ height: column.up }" />
    </div>
    <div class="pulse__half pulse__half--down">
      <i v-for="(column, index) in columns" :key="index" :style="{ height: column.down }" />
    </div>
  </div>
</template>

<style scoped>
.pulse {
  display: flex;
  flex-direction: column;
  gap: var(--space-0-5);
  width: 100%;
}

.pulse__half {
  display: flex;
  gap: var(--space-0-5);
  height: var(--pulse-half);
}

.pulse__half--up {
  align-items: flex-end;
}

.pulse__half--down {
  align-items: flex-start;
}

.pulse i {
  flex: 1;
  min-width: 1px;
  border-radius: var(--radius-full);
}

.pulse__half--up i {
  background: var(--pulse-you, var(--you));
}

.pulse__half--down i {
  background: var(--pulse-them, var(--them));
}
</style>
