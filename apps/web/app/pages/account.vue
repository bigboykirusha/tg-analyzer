<script setup lang="ts">
import type { ShareLinkKind, UserShareLinkDto } from '@tg-analyzer/shared'
import type { Locale } from '../composables/useI18n'
import type { ThemePreference } from '../composables/useTheme'

definePageMeta({ layout: 'workspace', middleware: ['auth'] })

/**
 * The account as grouped settings: who you are, how the app looks, notifications on this device (web push), the
 * bot's news and «Сообщить о проблеме», the
 * links you shared (each with a switch — the list manages links; how a friend did in «Угадайка» is the report's
 * news, in its «Поделиться»), and signing out — the reports stay.
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

/** Web push on this browser: the person's own news. On asks the browser; off forgets this browser. */
const push = usePush()
const pushOn = computed({
  get: () => push.state.value === 'on',
  set: (value: boolean) => void (value ? push.enable() : push.disable()).catch(() => toast.error(t('push.error'))),
})
const pushHint = computed(() => {
  switch (push.state.value) {
    case 'install':
      return t('push.installText')
    case 'denied':
      return t('push.deniedText')
    case 'unsupported':
      return t('push.unsupportedText')
    default:
      return t('push.offText')
  }
})

/** The bot's news: subscribed by Start in the bot (a link), unsubscribed here. */
const notify = computed({
  get: () => Boolean(auth.user?.botNotify),
  set: (value: boolean) => {
    if (value && auth.user?.botUrl) {
      window.open(auth.user.botUrl, '_blank', 'noopener')
      // Back from the bot: read the account again to see «Start» pressed.
      window.addEventListener('focus', () => void refreshUser().catch(() => undefined), { once: true })
    } else if (!value)
      void updateSettings({ botNotify: false }).catch((error) =>
        toast.error(t('accountPage.notifyError'), errorMessage(error)),
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
    if (on) {
      // A new link with a new address, but showing what the old one showed: the author's choice of names and words.
      const made = await api('POST /api/v1/reports/:chatId/links', {
        params: { chatId: link.chatId },
        body: { kind: link.kind, days: 30, ...(link.settings ? { settings: link.settings } : {}) },
      })
      link.expiresAt = made.expiresAt
    } else await api('DELETE /api/v1/reports/:chatId/links/:kind', { params })
  } catch (error) {
    link.on = previous
    toast.error(t('accountPage.linkError'), errorMessage(error))
  }
}
function linkHint(link: UserShareLinkDto & { on: boolean }) {
  if (!link.on) return t('accountPage.linkOff')
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

onMounted(() => {
  void loadLinks()
  void push.refresh().catch(() => undefined)
})
</script>

<template>
  <UiPageContainer>
    <div class="account">
      <UiPageBar :title="t('accountPage.title')" back="/dashboard" />
      <div class="account__list">
        <!-- Who you are: one calm card, as at the top of iOS settings. -->
        <section class="account__me" :aria-label="displayName">
          <ProfileAvatar :title="displayName" size="lg" />
          <div class="account__who">
            <p class="account__name t-h3">{{ displayName }}</p>
            <p v-if="handle" class="account__handle">{{ handle }}</p>
          </div>
        </section>

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

        <!-- This device's notifications; where they cannot be turned on, the switch says why. -->
        <UiGroup v-if="push.state.value !== 'hidden'" :header="t('accountPage.pushTitle')">
          <UiSwitch
            v-model="pushOn"
            :label="t('push.title')"
            :hint="pushHint"
            :disabled="
              push.busy.value ||
              push.state.value === 'install' ||
              push.state.value === 'denied' ||
              push.state.value === 'unsupported'
            "
          />
        </UiGroup>

        <!-- The bot: its news, and problems reported through it — one place for one bot. -->
        <UiGroup
          v-if="auth.user?.botUrl || auth.user?.botNotify || auth.user?.feedbackUrl"
          :header="t('accountPage.botTitle')"
        >
          <UiSwitch
            v-if="auth.user?.botUrl || auth.user?.botNotify"
            v-model="notify"
            :label="t('accountPage.notify')"
            :hint="t('accountPage.notifyHint')"
          >
            <template #leading><TelegramMark /></template>
          </UiSwitch>
          <UiListRow
            v-if="auth.user?.feedbackUrl"
            as="a"
            :href="auth.user.feedbackUrl"
            target="_blank"
            rel="noopener"
            :title="t('accountPage.feedback')"
            :subtitle="t('accountPage.feedbackHint')"
            chevron
          />
        </UiGroup>

        <UiGroup v-if="links.length" :header="t('accountPage.linksTitle')">
          <UiSwitch
            v-for="link in links"
            :key="`${link.chatId}-${link.kind}`"
            :model-value="link.on"
            :label="t(link.kind === 'quiz' ? 'accountPage.linkQuiz' : 'accountPage.linkReport', { chat: link.title })"
            :hint="linkHint(link)"
            @update:model-value="toggleLink(link, $event)"
          >
            <template #leading><ChatAvatar :chat-id="link.chatId" :title="link.title" /></template>
          </UiSwitch>
        </UiGroup>

        <UiGroup>
          <UiListRow as="button" :title="t('accountPage.logout')" danger @click="signOutOpen = true" />
        </UiGroup>
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
  /* The groups' inset: the avatar stands on the same line as every row's text below it; above and below, the 16 of
     a row, so the card reads as one more group of the same list. */
  padding: var(--space-4) var(--card-padding);
  border-radius: var(--radius-card);
  background: var(--surface);
  box-shadow: var(--ring-card);
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
  font: var(--text-label);
}

/* One column on every screen, as iOS and macOS settings: a few groups side by side read as a dashboard with a
   half-empty column, not as settings. On a computer it keeps a reading width, left under the title. */
.account__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  min-width: 0;
  max-width: var(--page-max-narrow);
}

@media (min-width: 901px) {
  .account {
    gap: var(--page-gap);
  }
}
</style>
