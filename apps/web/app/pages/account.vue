<script setup lang="ts">
import type { ShareLinkKind, UserShareLinkDto } from '@tg-analyzer/shared'
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
const handle = computed(() => [auth.user?.username ? `@${auth.user.username}` : '', maskPhone(auth.user?.phone)].filter(Boolean).join(', '))
/** «+7 912 •••-••-89»: enough to recognise the number, not enough to read it off a shoulder. */
function maskPhone(phone: string | undefined) {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 7) return ''
  return `+${digits.slice(0, digits.length - 10 || 1)} ${digits.slice(-10, -7)} •••-••-${digits.slice(-2)}`
}

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
    } else if (!value) void updateSettings({ botNotify: false }).catch((error) => toast.error(t('accountPage.linkError'), errorMessage(error)))
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
    if (on) await api('POST /api/v1/reports/:chatId/links', { params: { chatId: link.chatId }, body: { kind: link.kind, days: 30 } })
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

onMounted(loadLinks)
</script>

<template>
  <UiPageContainer>
    <div class="account">
      <UiPageBar :title="t('accountPage.title')" back="/dashboard" />
      <header class="account__me">
        <ProfileAvatar :title="displayName" size="lg" />
        <div class="account__who">
          <p class="t-h1">{{ displayName }}</p>
          <p v-if="handle" class="account__handle">{{ handle }}</p>
        </div>
      </header>

      <div class="account__grid">
        <div class="account__col">
          <UiGroup :header="t('accountPage.lookTitle')">
            <UiPopoverMenu v-model:open="languageOpen" align="end" :aria-label="t('accountPage.language')" :title="t('accountPage.language')">
              <template #trigger>
                <UiListRow as="button" :title="t('accountPage.language')" chevron aria-haspopup="menu" @click="languageOpen = !languageOpen">
                  <template #trailing>{{ languages.find((item) => item.value === locale)?.label }}</template>
                </UiListRow>
              </template>
              <UiMenuItem
                v-for="item in languages"
                :key="item.value"
                role="menuitemradio"
                :aria-checked="item.value === locale"
                :selected="item.value === locale"
                @click="setLocale(item.value), (languageOpen = false)"
              >
                {{ item.label }}
              </UiMenuItem>
            </UiPopoverMenu>
            <UiPopoverMenu v-model:open="themeOpen" align="end" :aria-label="t('accountPage.theme')" :title="t('accountPage.theme')">
              <template #trigger>
                <UiListRow as="button" :title="t('accountPage.theme')" chevron aria-haspopup="menu" @click="themeOpen = !themeOpen">
                  <template #trailing>{{ themes.find((item) => item.value === preference)?.label }}</template>
                </UiListRow>
              </template>
              <UiMenuItem
                v-for="item in themes"
                :key="item.value"
                role="menuitemradio"
                :aria-checked="item.value === preference"
                :selected="item.value === preference"
                @click="setPreference(item.value), (themeOpen = false)"
              >
                {{ item.label }}
              </UiMenuItem>
            </UiPopoverMenu>
            <UiListRow v-if="timezoneLabel" :title="t('accountPage.timezone')" :subtitle="t('accountPage.timezoneHint')">
              <template #trailing>{{ timezoneLabel }}</template>
            </UiListRow>
          </UiGroup>

          <UiGroup v-if="auth.user?.botUrl || auth.user?.botNotify" :header="t('accountPage.notifyTitle')">
            <UiSwitch v-model="notify" :label="t('accountPage.notify')" :hint="t('accountPage.notifyHint')" />
          </UiGroup>

          <UiGroup :footer="t('accountPage.logoutFoot')">
            <UiListRow as="button" :title="t('accountPage.logout')" danger @click="signOutOpen = true" />
          </UiGroup>
        </div>

        <div v-if="links.length" class="account__col">
          <UiGroup :header="t('accountPage.linksTitle')" :footer="t('accountPage.linksFoot')">
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
        </div>
      </div>
    </div>

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
}

.account__who {
  min-width: 0;
}

.account__who .t-h1 {
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

  .account :deep(.page-title) {
    display: none;
  }
}
</style>
