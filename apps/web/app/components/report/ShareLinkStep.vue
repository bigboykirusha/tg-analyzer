<script setup lang="ts">
import { fillDailyGaps, type ReportDto, type ShareLinkDto, type ShareReportSettings } from '@tg-analyzer/shared'
import { Copy } from '../../lib/icons'

/**
 * «Ссылка на отчёт», the second step of «Поделиться»: how the other side will see the page, two
 * choices — names, and words with emoji (names are on, words are off until you say so) — and one row that copies the
 * address. Changing a choice makes a new address: whoever had the old one sees «Ссылка больше не
 * работает». A link lives 30 days and is turned off in the account.
 */
const props = defineProps<{ data: ReportDto; link: ShareLinkDto | null }>()
const emit = defineEmits<{ update: [link: ShareLinkDto | null] }>()
const { t, tc, formatDate } = useI18n()
const auth = useAuthStore()
const toast = useToast()
const copyLink = useCopyLink()
const errorMessage = useErrorMessage()

const settings = reactive({
  showName: props.link?.settings?.showName ?? true,
  words: props.link?.settings?.words ?? false,
})
const busy = ref(false)
const name = computed(() => props.data.summary.title)
const days = computed(() => fillDailyGaps(props.data.report.activity.daily))

/** The page's title as the guest reads it, with or without names. */
const heading = computed(() =>
  settings.showName
    ? t('share.link.pair', {
        me: auth.user?.firstName?.trim() || auth.user?.username || t('share.author'),
        name: name.value,
      })
    : t('share.link.pair', { me: t('share.author'), name: t('share.partner') }),
)
/** The same line as on the guest's poster (useChatSpan). */
const chatSpan = useChatSpan()
const meta = computed(() => chatSpan(props.data))
const changed = computed(
  () =>
    !props.link?.settings ||
    props.link.settings.showName !== settings.showName ||
    props.link.settings.words !== settings.words,
)
const status = computed(() => {
  const link = props.link
  if (!link) return t('share.link.hint')
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
      <p class="link-step__label">{{ t('share.link.preview', { name }) }}</p>
      <div class="link-step__poster" aria-hidden="true">
        <b class="link-step__title">{{ heading }}</b>
        <span class="link-step__meta">{{ meta }}</span>
        <Pulse class="link-step__pulse" :data="days" :bars="48" :height="16" />
      </div>
    </div>
    <UiGroup>
      <UiSwitch v-model="settings.showName" :label="t('share.link.name')" :hint="t('share.link.nameHint')" />
      <UiSwitch v-model="settings.words" :label="t('share.link.words')" :hint="t('share.link.wordsHint')" />
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
  overflow: hidden;
  font: var(--text-h3);
  letter-spacing: var(--tracking-h3);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link-step__meta {
  color: var(--on-poster-muted);
  font: var(--text-label);
}

.link-step__pulse {
  margin-top: var(--space-3);
}
</style>
