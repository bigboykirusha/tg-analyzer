<script setup lang="ts">
/**
 * The desktop hero: the top of the example report as one object — the person's poster over their
 * first cards — lying flat, with one soft shadow. No browser chrome, no tilt: the product is the
 * picture. When the stage has a set height (the one-screen landing), it scales down to fit.
 */
const { t } = useI18n()
const stageRef = ref<HTMLElement | null>(null)
const windowRef = ref<HTMLElement | null>(null)
const scale = ref(0.9)

/** Room left for the shadow. */
const FIT = 0.94

function fit() {
  const stage = stageRef.value
  const win = windowRef.value
  if (!stage || !win || !win.offsetHeight || !win.offsetWidth) return
  scale.value = Math.min(
    0.9,
    (stage.clientWidth * FIT) / win.offsetWidth,
    (stage.clientHeight * FIT) / win.offsetHeight,
  )
}

let observer: ResizeObserver | null = null
onMounted(() => {
  observer = new ResizeObserver(fit)
  if (stageRef.value) observer.observe(stageRef.value)
  if (windowRef.value) observer.observe(windowRef.value)
  fit()
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div ref="stageRef" class="stage" :style="{ '--ws': scale }">
    <div ref="windowRef" class="window" role="img" :aria-label="t('landing.windowLabel')">
      <ClientOnly><MiniReport /></ClientOnly>
    </div>
  </div>
</template>

<style scoped>
.stage {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.window {
  flex: none;
  width: 720px;
  overflow: hidden;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-window);
  transform: scale(var(--ws, 0.9));
  transform-origin: 50% 50%;
  animation: window-in var(--duration-intro) 80ms var(--ease-standard) backwards;
}

/* One authored arrival: the report rises into place once. */
@keyframes window-in {
  from {
    opacity: 0;
    translate: 0 24px;
  }
}

@media (max-width: 1100px) {
  .window {
    width: 640px;
  }
}

@media (min-width: 1600px) {
  .window {
    width: 880px;
  }
}
</style>
