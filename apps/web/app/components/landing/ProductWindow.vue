<script setup lang="ts">
/**
 * The desktop hero: the example report in a browser window, turned in 3D; it
 * straightens on hover. When the stage has a set height (the one-screen
 * landing), the window scales down to fit it.
 */
const { t } = useI18n()
const stageRef = ref<HTMLElement | null>(null)
const windowRef = ref<HTMLElement | null>(null)
const scale = ref(0.9)

/** Room left for the tilt and the shadow. */
const FIT = 0.94

function fit() {
  const stage = stageRef.value
  const win = windowRef.value
  if (!stage || !win || !win.offsetHeight) return
  scale.value = Math.min(0.9, (stage.clientHeight * FIT) / win.offsetHeight)
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
      <div class="window__chrome" aria-hidden="true">
        <i /><i /><i />
        <span>tganalyzer.app/chat/example</span>
      </div>
      <div class="window__inner">
        <ClientOnly><MiniReport /></ClientOnly>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stage {
  display: flex;
  align-items: center;
  perspective: 1800px;
}

.window {
  --ry: -18deg;
  flex: none;
  width: 880px;
  overflow: hidden;
  border-radius: 18px;
  background: var(--bg);
  box-shadow: var(--shadow-window);
  transform: rotateY(var(--ry)) rotateX(6deg) scale(var(--ws, 0.9));
  transform-origin: 0 50%;
  transition: transform 900ms var(--ease-standard);
  animation: window-in 900ms 80ms var(--ease-standard) backwards;
}

@media (hover: hover) and (pointer: fine) {
  .stage:hover .window {
    --ry: -8deg;
  }
}

@keyframes window-in {
  from {
    opacity: 0;
    translate: 0 32px;
  }
}

.window__chrome {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 11px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.window__chrome i {
  width: 11px;
  height: 11px;
  border-radius: var(--radius-full);
  background: var(--border-strong);
}

.window__chrome span {
  margin: 0 auto;
  color: var(--text-faint);
  font: var(--text-caption);
}

.window__inner {
  padding: var(--space-4);
}

@media (max-width: 1100px) {
  .window {
    width: 760px;
  }
}

@media (min-width: 1600px) {
  .window {
    width: 1120px;
  }
}
</style>
