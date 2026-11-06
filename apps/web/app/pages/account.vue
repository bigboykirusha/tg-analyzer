<script setup lang="ts">
import type { Locale } from '../composables/useI18n'
import type { ThemePreference } from '../composables/useTheme'
import { ChevronRight, LogOut } from '../lib/icons'

definePageMeta({ layout: 'workspace', middleware: ['auth'] })

const { t, locale, intlLocale, setLocale } = useI18n()
useSeoMeta({ title: () => t('accountPage.title') })

const auth = useAuthStore()

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
  // «Москва, стандартное время» → «Москва»; Chromium has no short Russian names.
  const name = part('longGeneric')?.split(',')[0]?.trim()
  const offset = part('shortOffset')?.replace(/^GMT/, 'UTC')
  return name && offset ? `${name}, ${offset === 'UTC' ? 'UTC+0' : offset}` : zone
})

const workspace = useWorkspaceStore()
const { deleteAccount, logout } = useAuth()
const { preference, setPreference } = useTheme()
const toast = useToast()
const errorMessage = useErrorMessage()

const displayName = computed(() => auth.user?.firstName || auth.user?.username || t('account.anonymous'))
const handle = computed(() => (auth.user?.username ? `@${auth.user.username}` : ''))
const reportCount = computed(() => workspace.reports.length)

/** «Sign out» asks first; the same dialog is where everything gets deleted, so the promise holds. */
const signOutOpen = ref(false)
const busy = ref<'logout' | 'delete' | null>(null)

async function signOut(alsoDelete: boolean) {
  busy.value = alsoDelete ? 'delete' : 'logout'
  try {
    if (alsoDelete) await deleteAccount()
    else await logout()
  } catch (error) {
    toast.error(alsoDelete ? t('account.deleteError') : t('account.logoutError'), errorMessage(error))
    busy.value = null
  }
}

const languageOptions = computed(() => [
  { value: 'ru' as Locale, label: 'Русский' },
  { value: 'en' as Locale, label: 'English' },
])
const themeOptions = computed(() => [
  { value: 'system' as ThemePreference, label: t('accountPage.themeSystem') },
  { value: 'light' as ThemePreference, label: t('accountPage.themeLight') },
  { value: 'dark' as ThemePreference, label: t('accountPage.themeDark') },
])

onMounted(() => {
  if (workspace.reportsState === 'idle') void workspace.loadReports().catch(() => undefined)
})
</script>

<template>
  <UiPageContainer>
    <div class="page account">
      <UiPageBar
        :title="t('accountPage.title')"
        :lede="[displayName, handle].filter(Boolean).join(' · ')"
        back="/dashboard"
      >
        <template #leading><ProfileAvatar :title="displayName" size="sm" /></template>
      </UiPageBar>

      <!-- Grouped settings: a quiet caption over a card of rows, as in system settings. -->
      <div class="account__groups">
        <section class="group" aria-labelledby="look-title">
          <h2 id="look-title" class="group__title">{{ t('accountPage.lookTitle') }}</h2>
          <div class="tile group__card">
            <div class="row">
              <span class="row__label">{{ t('nav.language') }}</span>
              <UiSegmentedControl
                :model-value="locale"
                :options="languageOptions"
                :aria-label="t('nav.language')"
                inline
                @update:model-value="setLocale"
              />
            </div>
            <div class="row">
              <span class="row__label">{{ t('accountPage.theme') }}</span>
              <UiSegmentedControl
                :model-value="preference"
                :options="themeOptions"
                :aria-label="t('accountPage.theme')"
                inline
                @update:model-value="setPreference"
              />
            </div>
            <div class="row">
              <span class="row__label">
                {{ t('accountPage.timezone') }}
                <small>{{ t('accountPage.timezoneHint') }}</small>
              </span>
              <span class="row__value">{{ timezoneLabel }}</span>
            </div>
          </div>
        </section>

        <section class="group" aria-labelledby="data-title">
          <h2 id="data-title" class="group__title">{{ t('accountPage.dataTitle') }}</h2>
          <div class="tile group__card">
            <div class="row">
              <span class="row__label">{{ t('accountPage.reports') }}</span>
              <span class="row__value t-num">{{ reportCount }}</span>
            </div>
            <div class="row">
              <span class="row__label">{{ t('accountPage.messagesKept') }}</span>
              <span class="row__value">{{ t('accountPage.messagesKeptValue') }}</span>
            </div>
            <NuxtLink to="/faq" class="row row--link">
              <span class="row__label">{{ t('accountPage.privacy') }}</span>
              <ChevronRight aria-hidden="true" />
            </NuxtLink>
          </div>
        </section>
      </div>

      <section class="sign-out">
        <UiButton variant="secondary" :icon="LogOut" @click="signOutOpen = true">{{ t('account.logout') }}</UiButton>
        <p class="sign-out__hint">{{ t('accountPage.logoutHint') }}</p>
      </section>
    </div>

    <UiModalDialog
      :open="signOutOpen"
      :title="t('accountPage.logoutTitle')"
      :description="t('accountPage.logoutText')"
      :close-label="t('common.close')"
      :busy="busy !== null"
      role="alertdialog"
      @close="signOutOpen = false"
    >
      <div class="sign-out__choices">
        <UiButton block :loading="busy === 'logout'" :disabled="busy === 'delete'" @click="signOut(false)">
          {{ t('account.logout') }}
        </UiButton>
        <UiButton
          block
          variant="danger"
          :loading="busy === 'delete'"
          :disabled="busy === 'logout'"
          @click="signOut(true)"
        >
          {{ t('accountPage.logoutAndDelete') }}
        </UiButton>
        <UiButton block variant="ghost" :disabled="busy !== null" @click="signOutOpen = false">
          {{ t('common.cancel') }}
        </UiButton>
      </div>
    </UiModalDialog>
  </UiPageContainer>
</template>

<style scoped>
/* The same column as every other page: the two groups of settings sit side by side. */
.account__groups {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-6);
  align-items: start;
}

.group {
  display: grid;
  gap: var(--space-2);
}

.group__title {
  padding-inline: var(--space-1);
  color: var(--text-muted);
  font: var(--text-small);
  font-weight: 500;
}

.group__card {
  gap: 0;
  padding-block: 0;
}

/* One setting per row: the name on the left, the control on the right, hairlines between. */
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  min-height: 60px;
  padding-block: var(--space-2);
  font: var(--text-body);
}

.row + .row {
  border-top: 1px solid var(--border);
}

.row__label {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.row__label small {
  color: var(--text-muted);
  font: var(--text-caption);
}

.row__value {
  flex: none;
  color: var(--text-muted);
}

.row--link {
  color: var(--text);
}

.row--link svg {
  color: var(--text-muted);
}

@media (hover: hover) and (pointer: fine) {
  .row--link:hover .row__label {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
}

.sign-out {
  display: grid;
  justify-items: start;
  gap: var(--space-2);
}

.sign-out__hint {
  padding-inline: var(--space-1);
  color: var(--text-muted);
  font: var(--text-small);
}

.sign-out__choices {
  display: grid;
  gap: var(--space-2);
}

@media (max-width: 900px) {
  .account__groups {
    grid-template-columns: minmax(0, 1fr);
  }
}

/* Phones: a control under its name, and a full-width «Sign out». */
@media (max-width: 640px) {
  .row:has(.segmented) {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-2);
    padding-block: var(--space-3);
  }

  .row :deep(.segmented) {
    width: 100%;
  }

  .row :deep(.segment) {
    flex: 1 1 0;
  }

  .sign-out {
    justify-items: stretch;
  }

  .sign-out__hint {
    text-align: center;
  }
}
</style>
