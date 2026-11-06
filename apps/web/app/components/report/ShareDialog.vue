<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { Download, Play, Share2 } from '../../lib/icons'

/**
 * «Поделиться»: the recap («Итоги») with a preview of its first slide on the left and what you can
 * do with it on the right — watch it, save every slide as a 1080×1920 picture, or send them through
 * the phone's share sheet (only where the browser can share files). On phones it is the same
 * content as a floating sheet (`UiModalDialog`).
 */
export type StoryIntent = 'view' | 'save' | 'share'

const props = defineProps<{ open: boolean; data: ReportDto }>()
const emit = defineEmits<{ close: []; story: [intent: StoryIntent] }>()
const { t, tc, formatNumber } = useI18n()
const image = useCardImage()

const canShare = ref(false)
watch(
  () => props.open,
  (open) => {
    if (open) canShare.value = image.canShareFiles()
  },
)

function pick(intent: StoryIntent) {
  emit('close')
  emit('story', intent)
}
</script>

<template>
  <UiModalDialog :open="open" size="md" :title="t('share.title', { name: data.summary.title })" @close="emit('close')">
    <div class="share">
      <div class="share__preview" aria-hidden="true">
        <span class="share__bars"><i class="is-on" /><i /><i /><i /><i /><i /></span>
        <span class="share__slide">
          <small>{{ t('share.slideWith', { name: data.summary.title }) }}</small>
          <b class="t-num">{{ formatNumber(data.report.totals.messages) }}</b>
          <small>{{ tc('share.messages', data.report.totals.messages) }}</small>
        </span>
      </div>
      <div class="share__actions">
        <p class="share__lede">{{ t('share.lede') }}</p>
        <UiButton variant="primary" :icon="Play" block @click="pick('view')">{{ t('share.watch') }}</UiButton>
        <button type="button" class="share__row" @click="pick('save')">
          <span class="share__icon"><Download aria-hidden="true" /></span>
          <span
            >{{ t('share.save') }}<small>{{ t('share.saveNote') }}</small></span
          >
        </button>
        <button v-if="canShare" type="button" class="share__row" @click="pick('share')">
          <span class="share__icon"><Share2 aria-hidden="true" /></span>
          <span
            >{{ t('share.send') }}<small>{{ t('share.sendNote') }}</small></span
          >
        </button>
      </div>
    </div>
  </UiModalDialog>
</template>

<style scoped>
.share {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
  gap: var(--space-5);
}

/* The first slide of «Итоги», in its own poster colours (the same in both themes). */
.share__preview {
  display: grid;
  align-content: space-between;
  aspect-ratio: 9 / 16;
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--story-gradient-1);
  color: var(--story-ink);
}

.share__bars {
  display: flex;
  gap: 3px;
}

.share__bars i {
  flex: 1;
  height: 2px;
  border-radius: var(--radius-full);
  background: var(--story-track);
}

.share__bars .is-on {
  background: var(--story-ink);
}

.share__slide {
  display: grid;
  gap: var(--space-1);
  font: var(--text-caption);
}

.share__slide small {
  color: var(--story-ink-muted);
  font: inherit;
}

.share__slide b {
  font: var(--text-h1);
  letter-spacing: var(--tracking-figure);
}

.share__actions {
  display: grid;
  align-content: start;
  gap: var(--space-4);
}

.share__lede {
  color: var(--text-muted);
  font: var(--text-small);
}

.share__row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--hit-min);
  padding: var(--space-2) 0;
  border: 0;
  background: none;
  color: var(--text);
  font: var(--text-ui);
  text-align: left;
  cursor: pointer;
}

.share__row small {
  display: block;
  color: var(--text-muted);
  font: var(--text-caption);
}

.share__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: var(--control-sm);
  height: var(--control-sm);
  border-radius: var(--radius-full);
  background: var(--fill-raised);
}

@media (hover: hover) and (pointer: fine) {
  .share__row:hover .share__icon {
    background: var(--fill-hover);
  }
}

@media (max-width: 640px) {
  .share {
    grid-template-columns: minmax(0, 1fr);
  }

  .share__preview {
    width: 120px;
  }
}
</style>
