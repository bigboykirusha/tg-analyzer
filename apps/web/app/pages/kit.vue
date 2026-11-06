<script setup lang="ts">
import { Moon, Share2, Sun, Trash2 } from '../lib/icons'

/**
 * The living UI kit: every token and component of the design system on one page, drawn by the
 * real components. Dev only — `nuxt.config.ts` drops the route from production builds. Names on
 * this page are token and component names (code), the sample copy comes from i18n.
 */
const { t } = useI18n()
useSeoMeta({ robots: 'noindex' })

const type = [
  { token: 'display', sample: 'TG Analyzer' },
  { token: 'figure', sample: '5 078' },
  { token: 'h1', sample: t('report.kpi.whoWritesMore') },
  { token: 'h2', sample: t('report.kpi.even') },
  { token: 'h3', sample: t('report.tabs.together') },
  { token: 'title', sample: t('report.fmt.recordsTitle') },
  { token: 'body', sample: t('example.endText') },
  { token: 'ui', sample: t('share.watch') },
  { token: 'small', sample: t('report.speed.text') },
  { token: 'caption', sample: t('report.you') },
]
const spaces = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16]
const radii = ['mark', 'xs', 'sm', 'md', 'lg', 'xl', 'full']
const colors = [
  ['bg', 'surface', 'surface-2', 'border', 'border-strong'],
  ['text', 'text-muted', 'accent', 'danger', 'warning'],
  ['you', 'them', 'lime', 'tile-ink', 'tile-grey'],
  ['heat-1', 'heat-2', 'heat-3', 'heat-4', 'chart-neutral'],
  ['avatar-1-bg', 'avatar-2-bg', 'avatar-3-bg', 'avatar-4-bg', 'avatar-5-bg'],
]
const tones = ['plain', 'ink', 'lime', 'grey'] as const
const variants = ['primary', 'secondary', 'ghost', 'danger'] as const
const sizes = ['xs', 'sm', 'md', 'lg'] as const

const segment = ref<'a' | 'b' | 'c'>('a')
const segments = computed(() => [
  { value: 'a' as const, label: t('report.tabs.together') },
  { value: 'b' as const, label: t('report.tabs.time') },
  { value: 'c' as const, label: t('report.tabs.words') },
])
const pick = ref<string | null>('ru')
const picks = [
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
]
const words = [
  { value: 'вечером', count: 153 },
  { value: 'фильм', count: 149 },
  { value: 'кофе', count: 138 },
]
</script>

<template>
  <UiPageContainer>
    <div class="page kit">
      <UiPageHeader title="UI kit" lede="docs/design-system.md" />

      <UiPageSection title="Type">
        <div class="kit__list">
          <div v-for="item in type" :key="item.token" class="kit__row">
            <code>--text-{{ item.token }}</code>
            <span :style="{ font: `var(--text-${item.token})` }" class="kit__sample">{{ item.sample }}</span>
          </div>
        </div>
      </UiPageSection>

      <UiPageSection title="Colour">
        <div class="kit__swatches">
          <template v-for="(row, index) in colors" :key="index">
            <div v-for="name in row" :key="name" class="kit__swatch">
              <i :style="{ background: `var(--${name})` }" />
              <code>--{{ name }}</code>
            </div>
          </template>
        </div>
      </UiPageSection>

      <UiPageSection title="Space · radius">
        <div class="kit__list">
          <div v-for="step in spaces" :key="step" class="kit__row">
            <code>--space-{{ step }}</code>
            <i class="kit__space" :style="{ width: `var(--space-${step})` }" />
          </div>
        </div>
        <div class="kit__radii">
          <div v-for="name in radii" :key="name" class="kit__radius">
            <i :style="{ borderRadius: `var(--radius-${name})` }" />
            <code>--radius-{{ name }}</code>
          </div>
        </div>
      </UiPageSection>

      <UiPageSection title="Tiles">
        <div class="kit__tiles">
          <ReportSection
            v-for="tone in tones"
            :key="tone"
            :tone="tone === 'plain' ? undefined : tone"
            :title="t('report.kpi.whoWritesMore')"
            :text="tone"
            :answer="t('report.fmt.speedEven')"
          >
            <ReportLine :mine="52" :theirs="48" />
          </ReportSection>
        </div>
      </UiPageSection>

      <UiPageSection title="Report parts">
        <div class="kit__tiles">
          <ReportSection :title="t('report.habits.title')">
            <div class="report-rows">
              <div class="report-rows__row">
                <span class="report-rows__label">{{ t('report.habits.starts') }} · {{ t('report.habits.mine') }}</span>
                <ReportLine :mine="73" :theirs="27" />
              </div>
              <div class="report-rows__row">
                <span class="report-rows__label">{{ t('report.habits.voice') }}</span>
                <ReportLine :mine="134" :theirs="0" left="134" right="0" />
              </div>
            </div>
          </ReportSection>
          <ReportSection :title="t('report.words.title')">
            <div class="kit__inline">
              <ReportSideAvatar side="mine" name="Аня" />
              <ReportSideAvatar side="theirs" name="Аня" />
            </div>
            <WordChips :items="words" :empty="t('report.words.none')" />
            <dl class="fact-line">
              <div>
                <dt>{{ t('report.voice.together') }}</dt>
                <dd class="t-num">18 ч 29 мин</dd>
              </div>
              <div>
                <dt>{{ t('report.voice.longest') }}</dt>
                <dd class="t-num">10:29</dd>
              </div>
            </dl>
          </ReportSection>
        </div>
      </UiPageSection>

      <UiPageSection title="Buttons">
        <div class="kit__grid">
          <div v-for="variant in variants" :key="variant" class="kit__inline">
            <UiButton v-for="size in sizes" :key="size" :variant="variant" :size="size">
              {{ variant }} {{ size }}
            </UiButton>
          </div>
          <div class="kit__inline">
            <UiButton :icon="Share2">{{ t('share.open') }}</UiButton>
            <UiButton variant="secondary" loading>{{ t('share.watch') }}</UiButton>
            <UiButton variant="secondary" disabled>{{ t('share.watch') }}</UiButton>
            <UiIconButton :icon="Sun" :label="t('report.you')" />
            <UiIconButton :icon="Moon" :label="t('report.you')" variant="secondary" />
            <UiIconButton :icon="Trash2" :label="t('report.you')" variant="danger" />
          </div>
        </div>
      </UiPageSection>

      <UiPageSection title="Controls">
        <div class="kit__grid">
          <UiSegmentedControl v-model="segment" :options="segments" aria-label="Segments" />
          <div class="kit__field">
            <UiSelect v-model="pick" :options="picks" label="UiSelect" />
          </div>
          <div class="kit__inline">
            <UiAvatar title="Аня" size="xs" />
            <UiAvatar title="Мила" size="sm" />
            <UiAvatar title="Олег" size="md" />
            <UiAvatar title="Катя" size="lg" />
            <UiThemeToggle />
            <UiLocaleSwitch />
          </div>
          <div class="kit__inline">
            <UiTooltip text="UiTooltip"><UiButton variant="ghost">UiTooltip</UiButton></UiTooltip>
            <span class="spinner" aria-hidden="true" />
            <UiSkeleton width="160px" height="16px" />
          </div>
        </div>
      </UiPageSection>

      <UiPageSection title="States">
        <div class="kit__tiles">
          <UiMetricCard :label="t('report.kpi.messages')" value="5 078" sub="+12%" />
          <div class="tile">
            <UiEmptyState :title="t('chart.noActivity')" :description="t('report.words.none')" compact />
          </div>
        </div>
      </UiPageSection>
    </div>
  </UiPageContainer>
</template>

<style scoped>
.kit__list {
  display: grid;
  gap: var(--space-4);
}

.kit__row {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  align-items: baseline;
  gap: var(--space-4);
}

code {
  color: var(--text-muted);
  font: var(--text-caption);
}

.kit__sample {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kit__swatches {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--space-4);
}

.kit__swatch,
.kit__radius {
  display: grid;
  gap: var(--space-2);
}

.kit__swatch i {
  height: var(--control-md);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.kit__space {
  height: var(--space-4);
  background: var(--them);
}

.kit__radii {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-6);
  margin-top: var(--space-6);
}

.kit__radius i {
  width: 72px;
  height: 72px;
  background: var(--tile-ink);
}

.kit__tiles {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--card-gap);
}

.kit__grid {
  display: grid;
  gap: var(--space-4);
}

.kit__inline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.kit__field {
  max-width: 320px;
}

@media (max-width: 640px) {
  .kit__row {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-1);
  }

  .kit__swatches {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .kit__tiles {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
