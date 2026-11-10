<script setup lang="ts">
import type { ShareLinkDays, ShareLinkDto, ShareReportSettings } from '@tg-analyzer/shared'
import { Copy } from '../../lib/icons'

/**
 * «Ссылка на отчёт», the second step of «Поделиться»: what the page shows (the other side's name,
 * words, stickers — names and words off by default), how long it stays open, the address with
 * «Копировать», how many times it was opened and «Отключить ссылку». Changing a setting makes a
 * new address: whoever had the old one sees «Ссылка больше не работает».
 */
const props = defineProps<{ chatId: string; name: string; link: ShareLinkDto | null }>()
const emit = defineEmits<{ update: [link: ShareLinkDto | null] }>()
const { t, tc } = useI18n()
const toast = useToast()
const errorMessage = useErrorMessage()

const DEFAULTS: ShareReportSettings = { showName: false, words: false, stickers: true }
const settings = reactive<ShareReportSettings>({ ...(props.link?.settings ?? DEFAULTS) })
const days = ref<'7' | '30' | 'forever'>('7')
const busy = ref(false)

const dayOptions = computed(() => [
  { value: '7' as const, label: t('share.days.7') },
  { value: '30' as const, label: t('share.days.30') },
  { value: 'forever' as const, label: t('share.days.forever') },
])
const changed = computed(
  () =>
    props.link?.settings &&
    (Object.keys(DEFAULTS) as (keyof ShareReportSettings)[]).some(
      (key) => settings[key] !== props.link!.settings![key],
    ),
)
const url = computed(() => (props.link && import.meta.client ? `${location.origin}/s/${props.link.token}` : ''))

async function save() {
  busy.value = true
  try {
    const value: ShareLinkDays = days.value === 'forever' ? null : (Number(days.value) as 7 | 30)
    const link = await api('POST /api/v1/reports/:chatId/links', {
      params: { chatId: props.chatId },
      body: { kind: 'report', days: value, settings: { ...settings } },
    })
    emit('update', link)
  } catch (error) {
    toast.error(errorMessage(error))
  } finally {
    busy.value = false
  }
}

async function copy() {
  await navigator.clipboard.writeText(url.value)
  toast.success(t('share.link.copied'))
}

async function remove() {
  busy.value = true
  try {
    await api('DELETE /api/v1/reports/:chatId/links/:kind', { params: { chatId: props.chatId, kind: 'report' } })
    emit('update', null)
    toast.success(t('share.link.deleted'))
  } catch (error) {
    toast.error(errorMessage(error))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="link-step">
    <div class="link-step__settings">
      <UiSwitch v-model="settings.showName" :label="t('share.link.name', { name })" :hint="t('share.link.nameHint')" />
      <UiSwitch v-model="settings.words" :label="t('share.link.words')" :hint="t('share.link.wordsHint')" />
      <UiSwitch v-model="settings.stickers" :label="t('share.link.stickers')" :hint="t('share.link.stickersHint')" />
    </div>
    <div v-if="!link || changed" class="link-step__days">
      <span class="link-step__label">{{ t('share.link.days') }}</span>
      <UiSegmentedControl v-model="days" inline :options="dayOptions" :aria-label="t('share.link.days')" />
    </div>
    <UiButton v-if="!link" variant="primary" block :loading="busy" @click="save">
      {{ t('share.link.create') }}
    </UiButton>
    <template v-else>
      <UiButton v-if="changed" variant="primary" block :loading="busy" @click="save">
        {{ t('share.link.save') }}
      </UiButton>
      <div class="link-step__box">
        <span class="link-step__url">{{ url }}</span>
        <UiButton :variant="changed ? 'secondary' : 'primary'" size="sm" :icon="Copy" @click="copy">
          {{ t('share.link.copy') }}
        </UiButton>
      </div>
      <div class="link-step__foot">
        <span class="t-small t-muted">{{ tc('share.link.views', link.views) }}</span>
        <UiButton variant="plain" size="sm" class="link-step__off" :disabled="busy" @click="remove">
          {{ t('share.link.delete') }}
        </UiButton>
      </div>
    </template>
  </div>
</template>

<style scoped>
.link-step {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-4);
  min-width: 0;
}

.link-step__settings {
  display: grid;
}

.link-step__settings > * + * {
  border-top: 1px solid var(--border);
}

.link-step__days,
.link-step__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.link-step__label {
  font: var(--text-ui);
}

/* The address and its button in one well. */
.link-step__box {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4);
  min-width: 0;
  border-radius: var(--radius-md);
  background: var(--surface-2);
}

.link-step__url {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font: var(--text-small);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link-step__off {
  color: var(--danger);
}
</style>
