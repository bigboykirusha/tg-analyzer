<script setup lang="ts">
import {
  ChevronRight,
  Globe,
  LogOut,
  Moon,
  MoreHorizontal,
  RotateCw,
  Search,
  Settings,
  Share2,
  Sun,
  Trash2,
} from '../lib/icons'

/**
 * The living UI kit: every token and component of the design system on one page, drawn by the
 * real components. Dev only — `nuxt.config.ts` drops the route from production builds. Names on
 * this page are token and component names (code), the sample copy comes from i18n.
 */
const { t } = useI18n()
const toast = useToast()
useSeoMeta({ robots: 'noindex' })

const type = [
  { role: 'display', className: 't-display', sample: 'TG Analyzer' },
  { role: 'figure', className: 't-figure', sample: '5 078' },
  { role: 'h1', className: 't-h1', sample: t('report.kpi.whoWritesMore') },
  { role: 'h2', className: 't-h2', sample: t('report.kpi.even') },
  { role: 'h3', className: 't-h3', sample: t('report.tabs.together') },
  { role: 'title', className: 't-title', sample: t('report.fmt.recordsTitle') },
  { role: 'body', className: 't-lede', sample: t('example.endText') },
  { role: 'ui', className: 't-ui', sample: t('share.watch') },
  { role: 'small', className: 't-small', sample: t('report.speed.text') },
  { role: 'small-strong', className: 't-small-strong', sample: t('report.voice.together') },
  { role: 'caption', className: 't-caption', sample: t('report.you') },
]
const primitives = [
  { name: 'gray', steps: ['0', '1', '2', '3', '4', '5', '6', '8', '9', '11', '12'] },
  { name: 'night', steps: ['0', '1', '2', '3', '4', '5', '8', '9', '12'] },
  { name: 'hue-red', steps: ['poster', 'mark', 'glow', 'room', 'tint', 'mark-d', 'poster-d', 'room-d', 'tint-d'] },
  { name: 'hue-violet', steps: ['mark', 'room', 'tint', 'mark-d', 'poster-d', 'room-d', 'tint-d'] },
  { name: 'hue-orange', steps: ['mark', 'room', 'tint', 'mark-d', 'poster-d', 'room-d', 'tint-d'] },
  { name: 'hue-green', steps: ['mark', 'room', 'tint', 'mark-d', 'poster-d', 'room-d', 'tint-d'] },
  { name: 'hue-blue', steps: ['mark', 'room', 'tint', 'mark-d', 'poster-d', 'room-d', 'tint-d'] },
  { name: 'hue-pink', steps: ['mark', 'room', 'tint', 'mark-d', 'poster-d', 'room-d', 'tint-d'] },
  { name: 'hue-teal', steps: ['mark', 'room', 'tint', 'mark-d', 'poster-d', 'room-d', 'tint-d'] },
  { name: 'red', steps: ['1', '2', '6', 'd1', 'd2', 'd6'] },
  { name: 'amber', steps: ['6', 'd6'] },
]
const colors = [
  ['bg', 'surface', 'surface-2', 'surface-raised', 'fill-raised'],
  ['border', 'border-strong', 'hover', 'pressed', 'scrim'],
  ['text', 'text-muted', 'accent', 'danger', 'warning'],
  ['you', 'them', 'poster', 'room', 'room-tint'],
  ['heat-0', 'heat-1', 'heat-2', 'heat-3', 'heat-4'],
  ['avatar-1-bg', 'avatar-2-bg', 'avatar-3-bg', 'avatar-4-bg', 'avatar-5-bg'],
]
const spaces = ['0-5', '1', '2', '3', '4', '6', '8', '10', '12', '16', '20']
const radii = ['mark', 'xs', 'sm', 'md', 'lg', 'xl', 'full']
const rings = ['ring-hairline', 'ring-selected', 'divider-top', 'focus-ring', 'focus-ring-field', 'shadow-overlay']
const tones = ['plain', 'ink'] as const
const variants = ['primary', 'secondary', 'ghost', 'danger'] as const
const sizes = ['xs', 'sm', 'md', 'lg'] as const
const avatarSizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const
const people = ['Мила', 'Артём Котов', 'Sofia', 'Дима', 'Катя']

const segment = ref<'a' | 'b' | 'c'>('a')
const switched = ref(true)
const segments = computed(() => [
  { value: 'a' as const, label: t('report.tabs.together') },
  { value: 'b' as const, label: t('report.tabs.time') },
  { value: 'c' as const, label: t('report.tabs.words') },
])
const pick = ref<string | null>('ru')
const picks = [
  { value: 'ru', label: 'Русский', meta: 'RU', icon: Globe },
  { value: 'en', label: 'English', meta: 'EN', icon: Globe },
]
const words = [
  { value: 'вечером', count: 153 },
  { value: 'фильм', count: 149 },
  { value: 'кофе', count: 138 },
]

const query = ref('')
const name = ref('Мила')
const password = ref('secret')
const code = ref('12')
const menuOpen = ref(false)
const dialogOpen = ref(false)
const confirmOpen = ref(false)
const sheetOpen = ref(false)

function showToast(variant: 'success' | 'error' | 'info' | 'warning') {
  toast.push({
    variant,
    title: t('report.deleted'),
    description: t('report.deleteText'),
    action: variant === 'info' ? { label: t('common.retry'), onClick: () => undefined } : undefined,
  })
}
</script>

<template>
  <UiPageContainer>
    <div class="page kit">
      <UiPageHeader title="UI kit" lede="docs/design-system.md · apps/web/app/components/ui" />

      <!-- ─── Foundations ─────────────────────────────────────────────── -->
      <UiPageSection title="Type" hint="Ten roles, one family (Onest), three weights.">
        <div class="tile kit__list">
          <div v-for="item in type" :key="item.role" class="kit__row">
            <code>.{{ item.className }}</code>
            <span :class="item.className" class="kit__sample">{{ item.sample }}</span>
          </div>
        </div>
      </UiPageSection>

      <UiPageSection title="Colour · primitives" hint="Layer 1: components never read these.">
        <div class="tile kit__list">
          <div v-for="ramp in primitives" :key="ramp.name" class="kit__ramp">
            <code>--{{ ramp.name }}-*</code>
            <div class="kit__ramp-steps">
              <div v-for="step in ramp.steps" :key="step" class="kit__step">
                <i :style="{ background: `var(--${ramp.name}-${step})` }" />
                <code>{{ step }}</code>
              </div>
            </div>
          </div>
        </div>
      </UiPageSection>

      <UiPageSection title="Colour · semantic" hint="Layer 2: re-pointed once for the dark theme.">
        <div class="kit__swatches">
          <template v-for="(row, index) in colors" :key="index">
            <div v-for="token in row" :key="token" class="kit__swatch">
              <i :style="{ background: `var(--${token})` }" />
              <code>--{{ token }}</code>
            </div>
          </template>
        </div>
      </UiPageSection>

      <UiPageSection title="Space · radius · rings">
        <div class="kit__tiles">
          <div class="tile kit__list">
            <div v-for="step in spaces" :key="step" class="kit__row kit__row--tight">
              <code>--space-{{ step }}</code>
              <i class="kit__space" :style="{ width: `var(--space-${step})` }" />
            </div>
          </div>
          <div class="tile">
            <div class="kit__radii">
              <div v-for="radius in radii" :key="radius" class="kit__radius">
                <i :style="{ borderRadius: `var(--radius-${radius})` }" />
                <code>--radius-{{ radius }}</code>
              </div>
            </div>
            <div class="kit__radii">
              <div v-for="ring in rings" :key="ring" class="kit__radius">
                <i class="kit__ring" :style="{ boxShadow: `var(--${ring})` }" />
                <code>--{{ ring }}</code>
              </div>
            </div>
          </div>
        </div>
      </UiPageSection>

      <!-- ─── Atoms ───────────────────────────────────────────────────── -->
      <UiPageSection title="UiButton · UiIconButton">
        <div class="tile kit__grid">
          <div v-for="variant in variants" :key="variant" class="kit__inline">
            <UiButton v-for="size in sizes" :key="size" :variant="variant" :size="size">
              {{ variant }} {{ size }}
            </UiButton>
          </div>
          <div class="kit__inline">
            <UiButton variant="primary" :icon="Share2">{{ t('share.open') }}</UiButton>
            <UiButton variant="secondary" loading>{{ t('share.watch') }}</UiButton>
            <UiButton variant="primary" disabled>{{ t('share.watch') }}</UiButton>
            <UiButton variant="secondary" disabled>{{ t('share.watch') }}</UiButton>
            <UiIconButton :icon="Sun" :label="t('theme.light')" />
            <UiIconButton :icon="Moon" :label="t('theme.dark')" variant="secondary" />
            <UiIconButton :icon="Trash2" :label="t('report.delete')" variant="danger" />
            <UiIconButton :icon="MoreHorizontal" :label="t('common.more')" size="sm" />
          </div>
          <p class="t-small kit__inline">
            <code>variant="link"</code>
            <UiButton variant="link">{{ t('login.changeNumber') }}</UiButton>
            <UiButton variant="link" disabled>{{ t('login.resend') }}</UiButton>
          </p>
        </div>
      </UiPageSection>

      <UiPageSection title="UiBadge · UiAvatar">
        <div class="kit__tiles">
          <div class="tile kit__grid">
            <div class="kit__inline">
              <UiBadge>+7</UiBadge>
              <UiBadge tone="them">{{ t('report.you') }}</UiBadge>
              <UiBadge tone="danger">{{ t('report.delete') }}</UiBadge>
            </div>
            <div class="kit__inline">
              <UiAvatar v-for="(size, index) in avatarSizes" :key="size" :title="people[index]" :size="size" />
            </div>
            <div class="kit__inline">
              <UiAvatar v-for="person in people" :key="person" :title="person" size="sm" />
            </div>
          </div>
          <div class="kit__sides">
            <div v-for="tone in tones" :key="tone" class="tile" :class="tone === 'plain' ? '' : `tile--${tone}`">
              <code>side · {{ tone }}</code>
              <div class="kit__inline">
                <UiAvatar side="mine" title="Мила" size="xs" />
                <UiAvatar side="theirs" title="Мила" size="xs" />
                <UiAvatar side="mine" title="Мила" size="sm" />
                <UiAvatar side="theirs" title="Мила" size="sm" />
              </div>
            </div>
          </div>
        </div>
      </UiPageSection>

      <!-- ─── Fields ──────────────────────────────────────────────────── -->
      <UiPageSection title="UiField · UiInput · UiOtpInput · UiSelect">
        <div class="kit__tiles">
          <div class="tile kit__grid">
            <UiField :label="t('login.phoneLabel')" :hint="t('login.passwordHelp')">
              <UiInput v-model="name" clearable />
            </UiField>
            <UiField :label="t('common.search')">
              <UiInput v-model="query" :icon="Search" :placeholder="t('common.search')" clearable />
            </UiField>
            <UiField :label="t('login.passwordLabel')" :error="t('login.passwordHint', { hint: 'secret' })">
              <UiInput v-model="password" size="lg" revealable />
            </UiField>
            <UiField :label="t('login.phoneLabel')">
              <UiInput model-value="+7 900" disabled />
            </UiField>
          </div>
          <div class="tile kit__grid">
            <UiField :label="t('login.codeLabel')" :hint="t('login.codeHelp')" group>
              <UiOtpInput v-model="code" />
            </UiField>
            <UiField :label="t('login.codeLabel')" error="12345?" group>
              <UiOtpInput model-value="99" :length="6" />
            </UiField>
            <UiSelect v-model="pick" :options="picks" label="UiSelect" />
            <UiSelect :model-value="null" :options="picks" label="UiSelect · invalid" placeholder="—" invalid />
          </div>
        </div>
      </UiPageSection>

      <UiPageSection title="Controls">
        <div class="tile kit__grid">
          <UiSegmentedControl v-model="segment" :options="segments" aria-label="UiSegmentedControl" />
          <div class="kit__inline">
            <UiSegmentedControl v-model="segment" :options="segments" aria-label="inline" inline />
          </div>
          <UiSwitch v-model="switched" :label="t('accountPage.theme')" :hint="t('accountPage.timezoneHint')" />
          <UiSwitch :model-value="false" :label="t('accountPage.theme')" disabled />
          <div class="kit__inline">
            <UiThemeToggle />
            <UiLocaleSwitch />
            <UiTooltip :text="t('share.watch')"><UiButton variant="ghost">UiTooltip</UiButton></UiTooltip>
            <span class="spinner" aria-hidden="true" />
            <UiSkeleton width="calc(var(--space-20) * 2)" />
          </div>
        </div>
      </UiPageSection>

      <!-- ─── Lists and menus ─────────────────────────────────────────── -->
      <UiPageSection title="UiListRow" hint="sm 44 · md 56 · lg 68; leading, title, subtitle, trailing.">
        <div class="kit__tiles">
          <div class="tile kit__rows">
            <UiListRow
              v-for="(person, index) in people.slice(0, 3)"
              :key="person"
              as="button"
              size="lg"
              :divider="index > 0"
              :title="person"
              :subtitle="t('common.messagesCount.many', { count: 4800 - index * 1200 })"
            >
              <template #leading><UiAvatar :title="person" /></template>
              <template #trailing>
                <UiBadge v-if="index === 0" tone="them">{{ t('common.justNow') }}</UiBadge>
                <ChevronRight />
              </template>
            </UiListRow>
          </div>
          <div class="tile kit__rows">
            <UiListRow size="md" :title="t('accountPage.theme')" :subtitle="t('accountPage.themeSystem')">
              <template #trailing>{{ t('accountPage.themeLight') }}</template>
            </UiListRow>
            <UiListRow size="md" divider :title="t('accountPage.timezone')">
              <template #trailing>Europe/Moscow</template>
            </UiListRow>
            <UiListRow as="button" size="md" divider :title="t('accountPage.privacy')">
              <template #leading><Settings class="row-icon" /></template>
              <template #trailing><ChevronRight /></template>
            </UiListRow>
            <UiListRow as="button" size="md" divider danger :title="t('accountPage.logoutAndDelete')">
              <template #leading><Trash2 class="row-icon" /></template>
            </UiListRow>
            <UiListRow as="button" size="md" divider disabled :title="t('common.refresh')" />
          </div>
        </div>
      </UiPageSection>

      <UiPageSection title="UiMenuPanel · UiMenuItem · UiPopoverMenu">
        <div class="kit__tiles">
          <div class="kit__menu-stage">
            <UiMenuPanel class="kit__static-panel" role="menu" aria-label="UiMenuPanel">
              <div class="menu-identity">
                <UiAvatar title="Мила" size="md" />
                <div class="menu-identity__copy">
                  <span class="menu-identity__name">Мила</span>
                  <span class="menu-identity__sub">+7 900 000-00-00</span>
                </div>
              </div>
              <div class="menu-divider" role="separator" />
              <UiMenuItem role="menuitem" :icon="Sun" meta="RU">{{ t('accountPage.theme') }}</UiMenuItem>
              <UiMenuItem role="menuitem" :icon="Settings">{{ t('account.settings') }}</UiMenuItem>
              <UiMenuItem role="menuitem" :icon="RotateCw" disabled>{{ t('common.refresh') }}</UiMenuItem>
              <div class="menu-divider" role="separator" />
              <UiMenuItem role="menuitem" :icon="LogOut">{{ t('account.logout') }}</UiMenuItem>
              <UiMenuItem role="menuitem" :icon="Trash2" danger>{{ t('report.deleteMenu') }}</UiMenuItem>
            </UiMenuPanel>
          </div>
          <div class="tile kit__grid">
            <UiPopoverMenu v-model:open="menuOpen" align="start" :aria-label="t('common.more')">
              <template #trigger>
                <UiButton :icon="MoreHorizontal" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen">
                  UiPopoverMenu
                </UiButton>
              </template>
              <UiMenuItem role="menuitem" :icon="RotateCw" @click="menuOpen = false">{{
                t('common.refresh')
              }}</UiMenuItem>
              <UiMenuItem role="menuitem" :icon="Share2" @click="menuOpen = false">{{ t('share.open') }}</UiMenuItem>
              <div class="menu-divider" role="separator" />
              <UiMenuItem role="menuitem" :icon="Trash2" danger @click="menuOpen = false">
                {{ t('report.deleteMenu') }}
              </UiMenuItem>
            </UiPopoverMenu>
          </div>
        </div>
      </UiPageSection>

      <!-- ─── Overlays ────────────────────────────────────────────────── -->
      <UiPageSection title="Overlays" hint="UiModalDialog · UiConfirmDialog · UiBottomSheet · toasts">
        <div class="tile kit__inline">
          <UiButton @click="dialogOpen = true">UiModalDialog</UiButton>
          <UiButton @click="confirmOpen = true">UiConfirmDialog</UiButton>
          <UiButton @click="sheetOpen = true">UiBottomSheet</UiButton>
          <UiButton variant="ghost" @click="showToast('success')">toast · success</UiButton>
          <UiButton variant="ghost" @click="showToast('error')">toast · error</UiButton>
          <UiButton variant="ghost" @click="showToast('info')">toast · action</UiButton>
        </div>
        <UiModalDialog
          :open="dialogOpen"
          :title="t('accountPage.logoutTitle')"
          :description="t('accountPage.logoutText')"
          size="md"
          @close="dialogOpen = false"
        >
          <UiField :label="t('login.phoneLabel')">
            <UiInput v-model="name" clearable />
          </UiField>
          <template #actions>
            <UiButton variant="secondary" @click="dialogOpen = false">{{ t('common.cancel') }}</UiButton>
            <UiButton variant="primary" @click="dialogOpen = false">{{ t('account.logout') }}</UiButton>
          </template>
        </UiModalDialog>
        <UiConfirmDialog
          :open="confirmOpen"
          :title="t('report.deleteTitle')"
          :description="t('report.deleteText')"
          :confirm-label="t('report.delete')"
          :confirm-icon="Trash2"
          variant="danger"
          @close="confirmOpen = false"
          @confirm="confirmOpen = false"
        >
          <template #subject>
            <UiListRow class="kit__subject" title="Мила" :subtitle="t('common.messagesCount.many', { count: 4800 })">
              <template #leading><UiAvatar title="Мила" size="sm" /></template>
            </UiListRow>
          </template>
        </UiConfirmDialog>
        <UiBottomSheet :open="sheetOpen" :title="t('common.more')" @close="sheetOpen = false">
          <UiMenuItem :icon="RotateCw" @click="sheetOpen = false">{{ t('common.refresh') }}</UiMenuItem>
          <UiMenuItem :icon="Trash2" danger @click="sheetOpen = false">{{ t('report.deleteMenu') }}</UiMenuItem>
        </UiBottomSheet>
      </UiPageSection>

      <!-- ─── Report ──────────────────────────────────────────────────── -->
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

      <UiPageSection title="States">
        <div class="kit__tiles">
          <UiMetricCard :label="t('report.kpi.messages')" value="5 078" sub="+12%" />
          <div class="tile">
            <UiEmptyState :title="t('chart.noActivity')" :description="t('report.words.none')" compact />
          </div>
          <div class="tile">
            <UiEmptyState
              :title="t('report.deleteError')"
              :description="t('report.deleteText')"
              :icon="Trash2"
              tone="danger"
              compact
            >
              <template #action>
                <UiButton size="sm">{{ t('common.retry') }}</UiButton>
              </template>
            </UiEmptyState>
          </div>
          <UiListSkeleton :rows="3" />
        </div>
      </UiPageSection>
    </div>
  </UiPageContainer>
</template>

<style scoped>
code {
  color: var(--text-muted);
  font: var(--text-caption);
}

.kit__list {
  display: grid;
  gap: var(--space-4);
}

.kit__row {
  display: grid;
  grid-template-columns: calc(var(--space-20) * 2) minmax(0, 1fr);
  align-items: baseline;
  gap: var(--space-4);
}

.kit__row--tight {
  align-items: center;
  gap: var(--space-2);
}

.kit__sample {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kit__ramp {
  display: grid;
  gap: var(--space-2);
}

.kit__ramp-steps {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--control-lg), 1fr));
  gap: var(--space-2);
}

.kit__step {
  display: grid;
  gap: var(--space-1);
}

.kit__step i {
  height: var(--control-md);
  border-radius: var(--radius-xs);
  box-shadow: var(--ring-hairline);
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
  min-width: 0;
}

.kit__swatch code {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kit__swatch i {
  height: var(--control-md);
  border-radius: var(--radius-sm);
  box-shadow: var(--ring-hairline);
}

.kit__space {
  height: var(--space-4);
  border-radius: var(--radius-mark);
  background: var(--them);
}

.kit__radii {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-6);
}

.kit__radius i {
  width: var(--avatar-xl);
  height: var(--avatar-xl);
  background: var(--tile-ink);
}

.kit__radius i.kit__ring {
  border-radius: var(--radius-md);
  background: var(--surface);
}

.kit__tiles {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: var(--card-gap);
}

.kit__grid {
  display: grid;
  gap: var(--space-6);
}

.kit__inline {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
}

.kit__sides {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--card-gap);
}

/* A list of rows inside a card: the rows reach the card's edge, dividers between them. */
.kit__rows {
  gap: 0;
  padding: var(--space-2);
}

/* The subject of a confirmation lines up with the dialog title. */
.kit__subject {
  --row-px: 0px;
}

/* The menu panel drawn in place instead of floating. */
.kit__menu-stage {
  display: flex;
}

.kit .kit__static-panel {
  position: static;
  z-index: auto;
  max-height: none;
}

@media (max-width: 640px) {
  .kit__row {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-1);
  }

  .kit__swatches {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .kit__tiles,
  .kit__sides {
    grid-template-columns: minmax(0, 1fr);
  }

  .kit .kit__static-panel {
    width: 100%;
  }
}
</style>
