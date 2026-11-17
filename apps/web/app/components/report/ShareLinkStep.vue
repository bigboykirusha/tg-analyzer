<script setup lang="ts">
import {
  fillDailyGaps,
  reportChatSpan,
  SHARE_PREVIEW_PULSE_COLUMNS,
  type ReportDto,
  type ShareLinkDto,
  type ShareReportSettings,
} from '@tg-analyzer/shared'
import { Copy } from '../../lib/icons'

/**
 * «Ссылка на отчёт», the second step of «Поделиться»: how the other side will see the page, two
 * choices — names, and words with emoji (names are on, words are off until you say so) — and one row that copies the
 * address. A group's link is the same page for the whole group: its members are named only on request (off
 * by default: they have not agreed, and a sent link cannot be taken back). Changing a choice makes a new address: whoever had the old one sees «Ссылка больше не
 * работает». A link lives 30 days and is turned off in the account.
 */
const props = defineProps<{ data: ReportDto; link: ShareLinkDto | null }>()
const emit = defineEmits<{ update: [link: ShareLinkDto | null] }>()
const { t, tc, formatDate } = useI18n()
const auth = useAuthStore()
const toast = useToast()
const copyLink = useCopyLink()
const errorMessage = useErrorMessage()

const isGroup = computed(() => Boolean(props.data.report.group))
const settings = reactive({
  showName: props.link?.settings?.showName ?? !props.data.report.group,
  words: props.link?.settings?.words ?? false,
})
watch(settings, () => {
  copyLink.fallback.value = ''
})
const busy = ref(false)
const name = computed(() => props.data.summary.title)
const changed = computed(
  () =>
    !props.link?.settings ||
    props.link.settings.showName !== settings.showName ||
    props.link.settings.words !== settings.words,
)
const preview = computed(() => {
  /** An existing link keeps its own report, even after the owner refreshes theirs. */
  if (!changed.value && props.link?.reportPreview) return props.link.reportPreview
  const report = props.data.report
  const days = fillDailyGaps(report.activity.daily)
  return {
    title: name.value,
    author: auth.user?.firstName?.trim() || 'Telegram',
    ...reportChatSpan(report, days),
    pulse: days,
  }
})
const reportHeading = useSharedReportHeading()
const cover = computed(() =>
  reportHeading(preview.value.title, preview.value.author, preview.value.participants !== null, settings.showName),
)
const formatChatSpan = useFormatChatSpan()
const meta = computed(() => formatChatSpan(preview.value))
const status = computed(() => {
  const link = props.link
  if (!link) return t('share.link.hint')
  if (changed.value) return t('share.link.replaceHint')
  const until = link.expiresAt
    ? t('share.link.onUntil', { date: formatDate(link.expiresAt, { day: 'numeric', month: 'long' }) })
    : t('share.link.on')
  return link.views ? `${until}, ${tc('share.link.views', link.views)}` : until
})

/** Copies the address; makes the link first when there is none or a choice has changed. */
async function copy() {
  busy.value = true
  try {
    let link = props.link
    if (!link || changed.value) {
      // Stickers and reactions follow the words: both show what was written, not how much.
      const body: ShareReportSettings = { showName: settings.showName, words: settings.words, stickers: settings.words }
      link = await api('POST /api/v1/reports/:chatId/links', {
        params: { chatId: props.data.summary.chatId },
        body: { kind: 'report', days: 30, settings: body },
      })
      emit('update', link)
    }
    await copyLink.copy(`${location.origin}/s/${link.token}`)
  } catch (error) {
    toast.error(errorMessage(error))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="link-step">
    <div class="link-step__preview">
      <p class="link-step__label">
        {{ isGroup ? t('share.link.previewGroup') : t('share.link.preview', { name }) }}
      </p>
      <div class="link-step__poster">
        <span v-if="cover.caption" class="link-step__meta">{{ cover.caption }}</span>
        <b class="link-step__title">{{ cover.heading }}</b>
        <span class="link-step__meta">{{ meta }}</span>
        <Pulse class="link-step__pulse" :data="preview.pulse" :bars="SHARE_PREVIEW_PULSE_COLUMNS" :height="16" />
      </div>
    </div>
    <UiGroup>
      <UiSwitch
        v-model="settings.showName"
        :disabled="busy"
        :label="t(isGroup ? 'share.link.nameGroup' : 'share.link.name')"
        :hint="t(isGroup ? 'share.link.nameGroupHint' : 'share.link.nameHint')"
      />
      <UiSwitch
        v-model="settings.words"
        :disabled="busy"
        :label="t('share.link.words')"
        :hint="t('share.link.wordsHint')"
      />
    </UiGroup>
    <div class="link-step__actions">
      <UiButton variant="primary" block :icon="Copy" :loading="busy" @click="copy">
        {{ t('share.link.copy') }}
      </UiButton>
      <ShareFallback
        v-if="copyLink.fallback.value"
        :url="copyLink.fallback.value"
        :can-share="copyLink.canShare.value"
        @share="copyLink.share"
      />
      <p v-else class="link-step__note" role="status">{{ status }}</p>
    </div>
  </div>
</template>

<style scoped>
.link-step {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}

.link-step__preview,
.link-step__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.link-step__actions {
  gap: var(--space-3);
}

.link-step__label,
.link-step__note {
  color: var(--text-muted);
  font: var(--text-label);
}

.link-step__note {
  text-align: center;
}

.link-step__poster {
  --pulse-you: var(--on-poster);
  --pulse-them: var(--on-them);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-4);
  border-radius: var(--radius-card);
  background-color: var(--poster);
  background-image: var(--poster-image);
  color: var(--on-poster);
}

.link-step__title {
  font: var(--text-h3);
  letter-spacing: var(--tracking-h3);
  overflow-wrap: anywhere;
}

.link-step__meta {
  color: var(--on-poster-muted);
  font: var(--text-label);
}

.link-step__pulse {
  margin-top: var(--space-3);
}
</style>
