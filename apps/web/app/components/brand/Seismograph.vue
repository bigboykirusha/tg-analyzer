<script setup lang="ts">
/**
 * The signature chart: one tick per day, your messages above the line and
 * theirs below. Heights use a square-root scale so a quiet day still shows
 * and a record day does not flatten everything else.
 */
const props = withDefaults(
  defineProps<{
    days: readonly { sent: number; received: number }[]
    /** Pixel height of the whole strip. */
    height?: number
    /** Draw ticks one after another on mount. */
    animate?: boolean
    label?: string
  }>(),
  { height: 96, animate: false, label: '' },
)

const peak = computed(() => Math.max(1, ...props.days.map((day) => Math.max(day.sent, day.received))))
const ticks = computed(() =>
  props.days.map((day, index) => ({
    x: index + 0.5,
    up: Math.sqrt(day.sent / peak.value) * 48,
    down: Math.sqrt(day.received / peak.value) * 48,
  })),
)
const width = computed(() => Math.max(1, props.days.length))
</script>

<template>
  <svg
    class="seismograph"
    :class="{ 'seismograph--animate': animate }"
    :viewBox="`0 0 ${width} 100`"
    preserveAspectRatio="none"
    :style="{ height: `${height}px` }"
    :role="label ? 'img' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : 'true'"
    focusable="false"
  >
    <line x1="0" :x2="width" y1="50" y2="50" class="seismograph__axis" />
    <g class="seismograph__you">
      <line
        v-for="(tick, index) in ticks"
        v-show="tick.up > 0"
        :key="`u${index}`"
        :x1="tick.x"
        :x2="tick.x"
        y1="49"
        :y2="49 - tick.up"
        :style="animate ? { '--i': index } : undefined"
      />
    </g>
    <g class="seismograph__them">
      <line
        v-for="(tick, index) in ticks"
        v-show="tick.down > 0"
        :key="`t${index}`"
        :x1="tick.x"
        :x2="tick.x"
        y1="51"
        :y2="51 + tick.down"
        :style="animate ? { '--i': index } : undefined"
      />
    </g>
  </svg>
</template>

<style scoped>
.seismograph {
  display: block;
  width: 100%;
  overflow: visible;
}

.seismograph line {
  vector-effect: non-scaling-stroke;
  stroke-width: 2px;
  stroke-linecap: butt;
}

.seismograph__axis {
  stroke: var(--border-strong);
  stroke-width: 1px !important;
}

.seismograph__you line {
  stroke: var(--you);
}

.seismograph__them line {
  stroke: var(--them);
}

.seismograph--animate .seismograph__you line,
.seismograph--animate .seismograph__them line {
  animation: seismograph-in var(--duration-slow) var(--ease-out-expo) both;
  animation-delay: calc(var(--i, 0) * 6ms);
  transform-box: fill-box;
}

.seismograph--animate .seismograph__you line {
  transform-origin: bottom;
}

.seismograph--animate .seismograph__them line {
  transform-origin: top;
}

@keyframes seismograph-in {
  from {
    transform: scaleY(0);
  }
}
</style>
