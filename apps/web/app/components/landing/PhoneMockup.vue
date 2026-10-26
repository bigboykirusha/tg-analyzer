<script setup lang="ts">
import { Lock, Share2 } from '../../lib/icons'

/** An iPhone 17 Pro Max-shaped frame with the example report as a website inside. */
const { t } = useI18n()
</script>

<template>
  <div class="iphone" role="img" :aria-label="t('landing.phoneLabel')">
    <div class="iphone__screen">
      <span class="iphone__island" aria-hidden="true" />
      <div class="iphone__status" aria-hidden="true">
        <span>9:41</span>
        <span class="iphone__status-icons">
          <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor">
            <rect x="0" y="7" width="3" height="4" rx="1" />
            <rect x="4.5" y="5" width="3" height="6" rx="1" />
            <rect x="9" y="2.5" width="3" height="8.5" rx="1" />
            <rect x="13.5" y="0" width="3" height="11" rx="1" />
          </svg>
          <svg width="25" height="12" viewBox="0 0 25 12">
            <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" fill="none" stroke="currentColor" opacity="0.4" />
            <rect x="2" y="2" width="15" height="8" rx="2" fill="currentColor" />
            <rect x="23" y="4" width="1.5" height="4" rx="0.75" fill="currentColor" opacity="0.4" />
          </svg>
        </span>
      </div>
      <div class="iphone__site">
        <div class="iphone__bar" aria-hidden="true">
          <span class="iphone__brand"><BrandMark :size="22" />TG Analyzer</span>
          <span class="iphone__share"><Share2 /></span>
        </div>
        <ClientOnly><MiniReport phone /></ClientOnly>
      </div>
      <div class="iphone__fade" aria-hidden="true" />
      <div class="iphone__url" aria-hidden="true"><Lock />tganalyzer.app</div>
      <span class="iphone__home" aria-hidden="true" />
    </div>
  </div>
</template>

<style scoped>
.iphone {
  position: relative;
  width: min(300px, 78vw);
  aspect-ratio: 440 / 956;
  margin: 0 auto;
  padding: 9px;
  border-radius: 58px;
  background: var(--device-frame);
  box-shadow: var(--shadow-device);
}

.iphone::before,
.iphone::after {
  content: '';
  position: absolute;
  width: 4px;
  border-radius: 2px;
  background: var(--device-button);
}

.iphone::before {
  top: 21%;
  left: -3px;
  height: 6%;
  box-shadow:
    0 58px 0 0 var(--device-button),
    0 108px 0 0 var(--device-button);
}

.iphone::after {
  top: 28%;
  right: -3px;
  height: 11%;
}

.iphone__screen {
  position: relative;
  height: 100%;
  overflow: hidden;
  border-radius: 50px;
  background: var(--bg);
  box-shadow: 0 0 0 3px var(--device-black);
  color: var(--text);
}

.iphone__island {
  position: absolute;
  z-index: 5;
  top: 10px;
  left: 50%;
  width: 31%;
  height: 28px;
  border-radius: 20px;
  background: var(--device-black);
  transform: translateX(-50%);
}

.iphone__status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 46px;
  padding: 14px 26px 0 30px;
  font: var(--device-status-font);
}

.iphone__status-icons {
  display: flex;
  align-items: center;
  gap: 5px;
}

.iphone__site {
  display: grid;
  gap: var(--space-2);
  padding: 0 12px;
}

.iphone__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0 2px;
}

.iphone__brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font: 600 13px/1 var(--font-sans);
  letter-spacing: -0.02em;
}

.iphone__share {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  box-shadow: inset 0 0 0 1px var(--border-strong);
  --icon-size: 14px;
}

.iphone__fade {
  position: absolute;
  inset: auto 0 0;
  height: 90px;
  background: linear-gradient(transparent, var(--bg));
}

.iphone__url {
  position: absolute;
  bottom: 14px;
  left: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 72%;
  height: 36px;
  border-radius: var(--radius-full);
  background: var(--surface);
  box-shadow: var(--shadow-overlay);
  font: 500 12px/1 var(--font-sans);
  transform: translateX(-50%);
  --icon-size: 12px;
}

.iphone__home {
  position: absolute;
  bottom: 5px;
  left: 50%;
  width: 36%;
  height: 4px;
  border-radius: 4px;
  background: var(--text);
  opacity: 0.85;
  transform: translateX(-50%);
}
</style>
