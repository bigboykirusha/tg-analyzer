<script setup lang="ts">
import type { Locale } from '../composables/useI18n'
import type { ThemePreference } from '../composables/useTheme'

definePageMeta({ layout: 'workspace', middleware: ['auth'] })

const { t, tc, locale, setLocale } = useI18n()
useSeoMeta({ title: () => t('accountPage.title') })

const auth = useAuthStore()
const workspace = useWorkspaceStore()
const { deleteAccount, disconnectTelegram, logout, updateSettings } = useAuth()
const { preference, setPreference } = useTheme()
const toast = useToast()
const errorMessage = useErrorMessage()

const displayName = computed(() => auth.user?.firstName || auth.user?.username || t('account.anonymous'))
const handle = computed(() => (auth.user?.username ? `@${auth.user.username}` : ''))
const reportCount = computed(() => workspace.reports.length)

const savingAutoDisconnect = ref(false)
const confirmDisconnectOpen = ref(false)
const disconnecting = ref(false)
const confirmDeleteOpen = ref(false)
const deleting = ref(false)
const privacyOpen = ref(false)

const autoDisconnect = computed({
  get: () => auth.user?.disconnectAfterAnalysis ?? false,
  set: (value: boolean) => void saveAutoDisconnect(value),
})

async function saveAutoDisconnect(value: boolean) {
  savingAutoDisconnect.value = true
  try {
    await updateSettings({ disconnectAfterAnalysis: value })
    toast.success(value ? t('accountPage.autoDisconnectOn') : t('accountPage.autoDisconnectOff'))
  } catch (error) {
    toast.error(t('accountPage.saveError'), errorMessage(error))
  } finally {
    savingAutoDisconnect.value = false
  }
}

async function confirmDisconnect() {
  disconnecting.value = true
  try {
    await disconnectTelegram()
    toast.success(t('accountPage.disconnected'))
  } catch (error) {
    toast.error(t('accountPage.disconnectError'), errorMessage(error))
  } finally {
    disconnecting.value = false
    confirmDisconnectOpen.value = false
  }
}

async function confirmDeleteAccount() {
  deleting.value = true
  try {
    await deleteAccount()
  } catch (error) {
    toast.error(t('account.deleteError'), errorMessage(error))
  } finally {
    deleting.value = false
    confirmDeleteOpen.value = false
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
  <UiPageContainer size="narrow">
    <div class="account">
      <header class="account-head">
        <ProfileAvatar :title="displayName" size="lg" />
        <div class="account-head__copy">
          <p class="t-label">{{ t('accountPage.title') }}</p>
          <h1 class="t-h1">{{ displayName }}</h1>
          <p v-if="handle" class="account-head__handle">{{ handle }}</p>
        </div>
      </header>

      <section class="sheet" aria-labelledby="telegram-title">
        <div class="sheet__aside">
          <h2 id="telegram-title" class="sheet__title">{{ t('accountPage.telegramTitle') }}</h2>
          <p class="sheet__lead">{{ t('accountPage.telegramLead') }}</p>
        </div>
        <div class="sheet__body">
          <div class="status-line" role="status">
            <span class="status-line__dot" :class="{ 'is-off': !auth.telegramSessionActive }" aria-hidden="true" />
            <span class="status-line__text">
              <strong>{{
                auth.telegramSessionActive ? t('accountPage.connected') : t('accountPage.notConnected')
              }}</strong>
              <span>{{
                auth.telegramSessionActive ? t('accountPage.connectedHint') : t('accountPage.notConnectedHint')
              }}</span>
            </span>
          </div>

          <UiSwitch
            v-model="autoDisconnect"
            :disabled="savingAutoDisconnect"
            :hint="t('accountPage.autoDisconnectHint')"
          >
            {{ t('accountPage.autoDisconnect') }}
          </UiSwitch>

          <div class="sheet__actions">
            <UiButton
              v-if="auth.telegramSessionActive"
              variant="secondary"
              size="sm"
              @click="confirmDisconnectOpen = true"
            >
              {{ t('accountPage.disconnect') }}
            </UiButton>
            <UiButton v-else variant="primary" size="sm" @click="logout">{{ t('accountPage.reconnect') }}</UiButton>
          </div>
        </div>
      </section>

      <section class="sheet" aria-labelledby="look-title">
        <div class="sheet__aside">
          <h2 id="look-title" class="sheet__title">{{ t('accountPage.lookTitle') }}</h2>
        </div>
        <div class="sheet__body">
          <div class="field">
            <span class="field__label">{{ t('nav.language') }}</span>
            <UiSegmentedControl
              :model-value="locale"
              :options="languageOptions"
              :aria-label="t('nav.language')"
              inline
              @update:model-value="setLocale"
            />
          </div>
          <div class="field">
            <span class="field__label">{{ t('accountPage.theme') }}</span>
            <UiSegmentedControl
              :model-value="preference"
              :options="themeOptions"
              :aria-label="t('accountPage.theme')"
              inline
              @update:model-value="setPreference"
            />
          </div>
          <div class="field">
            <span class="field__label">{{ t('accountPage.timezone') }}</span>
            <span class="field__value">{{ auth.user?.timezone }}</span>
            <span class="field__hint">{{ t('accountPage.timezoneHint') }}</span>
          </div>
        </div>
      </section>

      <section class="sheet" aria-labelledby="data-title">
        <div class="sheet__aside">
          <h2 id="data-title" class="sheet__title">{{ t('accountPage.dataTitle') }}</h2>
          <p class="sheet__lead">{{ t('accountPage.dataLead') }}</p>
        </div>
        <div class="sheet__body">
          <dl class="facts">
            <div class="facts__row">
              <dt>{{ t('accountPage.reports') }}</dt>
              <dd class="t-num">{{ tc('accountPage.reportCount', reportCount) }}</dd>
            </div>
            <div class="facts__row">
              <dt>{{ t('accountPage.messagesKept') }}</dt>
              <dd>{{ t('accountPage.messagesKeptValue') }}</dd>
            </div>
          </dl>
          <button type="button" class="text-link" @click="privacyOpen = true">{{ t('accountPage.privacy') }}</button>
          <div class="sheet__actions">
            <UiButton variant="danger" size="sm" @click="confirmDeleteOpen = true">{{ t('account.delete') }}</UiButton>
          </div>
        </div>
      </section>
    </div>

    <UiConfirmDialog
      :open="confirmDisconnectOpen"
      :title="t('accountPage.disconnectTitle')"
      :description="t('accountPage.disconnectText')"
      :confirm-label="t('accountPage.disconnect')"
      :loading="disconnecting"
      @close="confirmDisconnectOpen = false"
      @confirm="confirmDisconnect"
    />
    <UiConfirmDialog
      :open="confirmDeleteOpen"
      :title="t('account.deleteTitle')"
      :description="t('account.deleteConfirm')"
      :confirm-label="t('account.delete')"
      variant="danger"
      :loading="deleting"
      @close="confirmDeleteOpen = false"
      @confirm="confirmDeleteAccount"
    />
    <PrivacyDialog :open="privacyOpen" @close="privacyOpen = false" />
  </UiPageContainer>
</template>

<style scoped>
.account {
  display: flex;
  flex-direction: column;
}

.account-head {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  padding-bottom: var(--space-8);
}

.account-head__copy {
  display: grid;
  gap: var(--space-1);
  min-width: 0;
}

.account-head__copy .t-h1 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-head__handle {
  color: var(--text-muted);
  font: var(--text-ui);
}

/* A printed form: a hairline above each section, title in the margin. */
.sheet {
  display: grid;
  grid-template-columns: minmax(0, 220px) minmax(0, 1fr);
  gap: var(--space-8);
  padding-block: var(--space-8);
  border-top: 1px solid var(--border);
}

.sheet__aside {
  display: grid;
  align-content: start;
  gap: var(--space-2);
}

.sheet__title {
  font: var(--text-h2);
  font-size: 20px;
  line-height: 28px;
}

.sheet__lead {
  color: var(--text-muted);
  font: var(--text-small);
}

.sheet__body {
  display: grid;
  align-content: start;
  gap: var(--space-5);
  min-width: 0;
}

.sheet__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.status-line {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.status-line__dot {
  flex: none;
  width: 10px;
  height: 10px;
  margin-top: 6px;
  border-radius: 50%;
  background: var(--success);
}

.status-line__dot.is-off {
  border: 2px solid var(--text-muted);
  background: none;
}

.status-line__text {
  display: grid;
  gap: 2px;
  font: var(--text-ui);
}

.status-line__text span {
  color: var(--text-muted);
  font: var(--text-small);
}

.field {
  display: grid;
  justify-items: start;
  gap: var(--space-2);
}

.field__label {
  font: var(--text-ui);
  font-weight: 600;
}

.field__value {
  font: var(--text-ui);
  font-variant-numeric: tabular-nums;
}

.field__hint {
  color: var(--text-muted);
  font: var(--text-small);
}

.text-link {
  justify-self: start;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--text);
  font: var(--text-ui);
  text-decoration: underline;
  text-decoration-color: var(--border-strong);
  text-underline-offset: 4px;
  cursor: pointer;
}

@media (hover: hover) {
  .text-link:hover {
    text-decoration-color: currentColor;
  }
}

.text-link:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.facts {
  display: grid;
}

.facts__row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
  padding-block: var(--space-3);
  border-bottom: 1px dashed var(--border);
  font: var(--text-ui);
}

.facts__row:first-child {
  padding-top: 0;
}

.facts__row dt {
  color: var(--text-muted);
}

.facts__row dd {
  text-align: right;
}

@media (max-width: 720px) {
  .account-head {
    padding-bottom: var(--space-6);
  }

  .sheet {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-5);
    padding-block: var(--space-6);
  }
}
</style>
