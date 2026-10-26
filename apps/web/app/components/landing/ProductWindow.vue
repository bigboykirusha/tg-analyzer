<script setup lang="ts">
/** The desktop hero: the example report in a browser window, turned in 3D; it straightens on hover. */
const { t } = useI18n()
</script>

<template>
  <div class="stage">
    <div class="window" role="img" :aria-label="t('landing.windowLabel')">
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
  perspective: 1800px;
}

.window {
  --ry: -18deg;
  width: 880px;
  overflow: hidden;
  border-radius: 18px;
  background: var(--bg);
  box-shadow: var(--shadow-window);
  transform: rotateY(var(--ry)) rotateX(6deg) scale(0.9);
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
</style>
