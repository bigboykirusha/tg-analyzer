<script setup lang="ts">
import type { ShareLinkKind, TelegramSessionDto, UserShareLinkDto } from '@tg-analyzer/shared'
import type { Locale } from '../composables/useI18n'
import type { ThemePreference } from '../composables/useTheme'

definePageMeta({ layout: 'workspace', middleware: ['auth'] })

/**
 * The account as grouped settings: who you are, how the app looks, whether Telegram messages you, the
 * links you shared (each with a switch), and signing out — the reports stay.
 */
const { t, locale, intlLocale, setLocale, formatDate } = useI18n()
useSeoMeta({ title: () => t('accountPage.title') })

const auth = useAuthStore()
const { logout, updateSettings, refreshUser } = useAuth()
const { preference, setPreference } = useTheme()
const toast = useToast()
const errorMessage = useErrorMessage()

const displayName = computed(() => auth.user?.firstName || auth.user?.username || t('account.anonymous'))
const handle = computed(() => (auth.user?.username ? `@${auth.user.username}` : ''))

/** «Москва, UTC+3» from the browser zone; the raw IANA name if Intl cannot name it. */
const timezoneLabel = computed(() => {
  const zone = auth.user?.timezone
  if (!zone) return ''
  const part = (style: 'longGeneric' | 'shortOffset') => {
    try {
      return new Intl.DateTimeFormat(intlLocale.value, { timeZone: zone, timeZoneName: style })
        .formatToParts(new Date())
        .find((item) => item.type === 'timeZoneName')?.value
    } catch {
      return undefined
    }
  }
  const name = part('longGeneric')?.split(',')[0]?.trim()
  const raw = part('shortOffset')?.replace(/^GMT/, 'UTC')
  const offset = raw === 'UTC' ? 'UTC+0' : raw
  if (!offset) return zone
  return !name || /^(GMT|UTC)/u.test(name) ? offset : `${name}, ${offset}`
})

const languages: { value: Locale; label: string }[] = [
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
]
const themes = computed<{ value: ThemePreference; label: string }[]>(() => [
  { value: 'system', label: t('accountPage.themeSystem') },
  { value: 'light', label: t('accountPage.themeLight') },
  { value: 'dark', label: t('accountPage.themeDark') },
])
const languageOpen = ref(false)
const themeOpen = ref(false)

/** Telegram messages: turned on in the bot (a link), turned off here. */
const notify = computed({
  get: () => Boolean(auth.user?.botNotify),
  set: (value: boolean) => {
    if (value && auth.user?.botUrl) {
      window.open(auth.user.botUrl, '_blank', 'noopener')
      // Back from the bot: read the account again to see «Start» pressed.
      window.addEventListener('focus', () => void refreshUser().catch(() => undefined), { once: true })
    } else if (!value)
      void updateSettings({ botNotify: false }).catch((error) =>
        toast.error(t('accountPage.linkError'), errorMessage(error)),
      )
  },
})

/** Shared links: on while they exist; off deletes, on again makes a new one. */
const links = ref<(UserShareLinkDto & { on: boolean })[]>([])
async function loadLinks() {
  try {
    links.value = (await api('GET /api/v1/links')).links.map((link) => ({ ...link, on: true }))
  } catch {
    links.value = []
  }
}
async function toggleLink(link: UserShareLinkDto & { on: boolean }, on: boolean) {
  const previous = link.on
  link.on = on
  try {
    const params = { chatId: link.chatId, kind: link.kind as ShareLinkKind }
    if (on)
      await api('POST /api/v1/reports/:chatId/links', {
        params: { chatId: link.chatId },
        body: { kind: link.kind, days: 30 },
      })
    else await api('DELETE /api/v1/reports/:chatId/links/:kind', { params })
  } catch (error) {
    link.on = previous
    toast.error(t('accountPage.linkError'), errorMessage(error))
  }
}
function linkHint(link: UserShareLinkDto & { on: boolean }) {
  if (!link.on) return t('accountPage.linkOff')
  if (link.result?.score !== null && link.result)
    return t('accountPage.linkAnswered', { name: link.title, score: link.result.score, total: link.result.total })
  return link.expiresAt
    ? t('accountPage.linkOn', { date: formatDate(link.expiresAt, { day: 'numeric', month: 'long' }) })
    : t('accountPage.linkForever')
}

/** The account's Telegram sessions, read from Telegram on every visit and not kept anywhere. */
const devices = ref<TelegramSessionDto[]>([])
async function loadDevices() {
  if (!auth.telegramSessionActive) return
  try {
    devices.value = (await api('GET /api/v1/telegram/sessions')).sessions
  } catch {
    devices.value = []
  }
}
function deviceTitle(device: TelegramSessionDto) {
  return device.device
}
function deviceWhen(device: TelegramSessionDto) {
  if (device.current) return t('accountPage.deviceThis')
  const date = new Date(device.activeAt)
  const time = formatDate(date, { hour: '2-digit', minute: '2-digit' })
  const dayStart = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()
  const days = Math.round((dayStart(new Date()) - dayStart(date)) / 86_400_000)
  if (days <= 0) return t('accountPage.deviceToday', { time })
  if (days === 1) return t('accountPage.deviceYesterday', { time })
  return formatDate(date, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}
function deviceSubtitle(device: TelegramSessionDto) {
  const parts = [device.app, device.country, deviceWhen(device)]
  if (!device.official && !device.current) parts.push(t('accountPage.deviceUnofficial'))
  return parts.filter(Boolean).join(', ')
}
const endingDevice = ref<TelegramSessionDto | null>(null)
const ending = ref(false)
async function endDevice() {
  const device = endingDevice.value
  if (!device) return
  ending.value = true
  try {
    await api('DELETE /api/v1/telegram/sessions/:hash', { params: { hash: device.hash } })
    devices.value = devices.value.filter((item) => item.hash !== device.hash)
    endingDevice.value = null
  } catch (error) {
    endingDevice.value = null
    toast.error(t('accountPage.deviceEndError'), errorMessage(error))
  } finally {
    ending.value = false
  }
}

const signOutOpen = ref(false)
const signingOut = ref(false)
async function signOut() {
  signingOut.value = true
  try {
    await logout()
  } catch (error) {
    toast.error(t('account.logoutError'), errorMessage(error))
    signingOut.value = false
  }
}

onMounted(() => void Promise.all([loadLinks(), loadDevices()]))
</script>

<template>
  <UiPageContainer>
    <div class="account">
      <UiPageBar :title="t('accountPage.title')" back="/dashboard" />
      <!-- Who you are: one calm card, as at the top of iOS settings. -->
      <section class="account__me" :aria-label="displayName">
        <ProfileAvatar :title="displayName" size="lg" />
        <div class="account__who">
          <p class="account__name t-h3">{{ displayName }}</p>
          <p v-if="handle" class="account__handle">{{ handle }}</p>
        </div>
      </section>

      <div class="account__grid">
        <div class="account__col">
          <UiGroup :header="t('accountPage.lookTitle')">
            <UiPopoverMenu
              v-model:open="languageOpen"
              align="end"
              :aria-label="t('accountPage.language')"
              :title="t('accountPage.language')"
            >
              <template #trigger>
                <UiListRow
                  as="button"
                  :title="t('accountPage.language')"
                  chevron
                  aria-haspopup="menu"
                  @click="languageOpen = !languageOpen"
                >
                  <template #trailing>{{ languages.find((item) => item.value === locale)?.label }}</template>
                </UiListRow>
              </template>
              <UiMenuItem
                v-for="item in languages"
                :key="item.value"
                role="menuitemradio"
                :aria-checked="item.value === locale"
                :selected="item.value === locale"
                @click="(setLocale(item.value), (languageOpen = false))"
              >
                {{ item.label }}
              </UiMenuItem>
            </UiPopoverMenu>
            <UiPopoverMenu
              v-model:open="themeOpen"
              align="end"
              :aria-label="t('accountPage.theme')"
              :title="t('accountPage.theme')"
            >
              <template #trigger>
                <UiListRow
                  as="button"
                  :title="t('accountPage.theme')"
                  chevron
                  aria-haspopup="menu"
                  @click="themeOpen = !themeOpen"
                >
                  <template #trailing>{{ themes.find((item) => item.value === preference)?.label }}</template>
                </UiListRow>
              </template>
              <UiMenuItem
                v-for="item in themes"
                :key="item.value"
                role="menuitemradio"
                :aria-checked="item.value === preference"
                :selected="item.value === preference"
                @click="(setPreference(item.value), (themeOpen = false))"
              >
                {{ item.label }}
              </UiMenuItem>
            </UiPopoverMenu>
            <UiListRow v-if="timezoneLabel" :title="t('accountPage.timezone')">
              <template #trailing>{{ timezoneLabel }}</template>
            </UiListRow>
          </UiGroup>

          <UiGroup v-if="auth.user?.botUrl || auth.user?.botNotify" :header="t('accountPage.notifyTitle')">
            <UiSwitch v-model="notify" :label="t('accountPage.notify')" :hint="t('accountPage.notifyHint')" />
          </UiGroup>
        </div>

        <div class="account__col">
          <UiGroup v-if="links.length" :header="t('accountPage.linksTitle')" :footer="t('accountPage.linksFoot')">
            <UiSwitch
              v-for="link in links"
              :key="`${link.chatId}-${link.kind}`"
              :model-value="link.on"
              :label="t(link.kind === 'quiz' ? 'accountPage.linkQuiz' : 'accountPage.linkReport', { chat: link.title })"
              :hint="linkHint(link)"
              @update:model-value="toggleLink(link, $event)"
            >
              <template #leading><ChatAvatar :chat-id="link.chatId" :title="link.title" size="sm" /></template>
            </UiSwitch>
          </UiGroup>

          <UiGroup v-if="devices.length" :header="t('accountPage.devicesTitle')" :footer="t('accountPage.devicesFoot')">
            <UiListRow
              v-for="device in devices"
              :key="device.hash"
              wrap
              :title="deviceTitle(device)"
              :subtitle="deviceSubtitle(device)"
            >
              <template v-if="!device.current" #trailing>
                <UiButton
                  size="sm"
                  :aria-label="`${t('accountPage.deviceEnd')}: ${deviceTitle(device)}`"
                  @click="endingDevice = device"
                >
                  {{ t('accountPage.deviceEnd') }}
                </UiButton>
              </template>
            </UiListRow>
          </UiGroup>

          <UiGroup :footer="t('accountPage.logoutFoot')">
            <UiListRow as="button" :title="t('accountPage.logout')" danger @click="signOutOpen = true" />
          </UiGroup>
        </div>
      </div>
    </div>

    <UiConfirmDialog
      :open="Boolean(endingDevice)"
      :title="t('accountPage.deviceEndTitle')"
      :description="t('accountPage.deviceEndText', { device: endingDevice?.device ?? '' })"
      :confirm-label="t('accountPage.deviceEnd')"
      variant="danger"
      :loading="ending"
      @close="endingDevice = null"
      @confirm="endDevice"
    />
    <UiConfirmDialog
      :open="signOutOpen"
      :title="t('accountPage.logoutTitle')"
      :description="t('accountPage.logoutText')"
      :confirm-label="t('accountPage.logout')"
      variant="danger"
      :loading="signingOut"
      @close="signOutOpen = false"
      @confirm="signOut"
    />
  </UiPageContainer>
</template>

<style scoped>
.account {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  padding-bottom: var(--page-bottom);
}

.account__me {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  min-width: 0;
  padding: var(--space-4);
  border-radius: var(--radius-card);
  background: var(--surface);
}

.account__who {
  min-width: 0;
}

.account__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account__handle {
  color: var(--text-muted);
  font: var(--text-small);
}

.account__grid,
.account__col {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  min-width: 0;
}

/* Desktop: settings on the left, the shared links beside them — no half-empty column under one card. */
@media (min-width: 901px) {
  .account {
    gap: var(--page-gap);
  }

  .account__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
    gap: var(--page-gap);
  }
}
</style>
