<script setup lang="ts">
import type { Locale } from '../composables/useI18n'
import type { ThemePreference } from '../composables/useTheme'
import { Trash2 } from '../lib/icons'

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

// The switch moves at once; the saved value catches up, and a failed save puts it back.
const pendingAutoDisconnect = ref<boolean | null>(null)
const autoDisconnect = computed({
  get: () => pendingAutoDisconnect.value ?? auth.user?.disconnectAfterAnalysis ?? false,
  set: (value: boolean) => void saveAutoDisconnect(value),
})

async function saveAutoDisconnect(value: boolean) {
  pendingAutoDisconnect.value = value
  savingAutoDisconnect.value = true
  try {
    await updateSettings({ disconnectAfterAnalysis: value })
    toast.success(value ? t('accountPage.autoDisconnectOn') : t('accountPage.autoDisconnectOff'))
  } catch (error) {
    toast.error(t('accountPage.saveError'), errorMessage(error))
  } finally {
    pendingAutoDisconnect.value = null
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
    <div class="page account">
      <UiPageBar :title="displayName" :lede="handle || t('accountPage.title')" back="/dashboard">
        <template #leading><ProfileAvatar :title="displayName" size="sm" /></template>
      </UiPageBar>

      <div class="account__sheets">
        <section class="tile sheet" aria-labelledby="telegram-title">
          <div class="sheet__aside">
            <h2 id="telegram-title" class="t-h3">{{ t('accountPage.telegramTitle') }}</h2>
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

        <section class="tile sheet" aria-labelledby="look-title">
          <div class="sheet__aside">
            <h2 id="look-title" class="t-h3">{{ t('accountPage.lookTitle') }}</h2>
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

        <section class="tile sheet" aria-labelledby="data-title">
          <div class="sheet__aside">
            <h2 id="data-title" class="t-h3">{{ t('accountPage.dataTitle') }}</h2>
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
            <button type="button" class="link" @click="privacyOpen = true">{{ t('accountPage.privacy') }}</button>
            <div class="sheet__actions">
              <UiButton variant="danger" size="sm" :icon="Trash2" @click="confirmDeleteOpen = true">{{
                t('account.delete')
              }}</UiButton>
            </div>
          </div>
        </section>
      </div>
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
/* Each section is a tile: title and lead on the left, settings on the right. */
.account__sheets {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.sheet {
  display: grid;
  grid-template-columns: minmax(0, 220px) minmax(0, 1fr);
  gap: var(--space-8);
  padding: var(--space-6);
}

.sheet__aside {
  display: grid;
  align-content: start;
  gap: var(--space-2);
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

.sheet__body .link {
  justify-self: start;
  font: var(--text-ui);
}

.facts {
  display: grid;
}

.facts__row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
  padding-block: var(--space-3);
  border-bottom: 1px solid var(--border);
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
  .sheet {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-5);
    padding: var(--space-5);
  }
}
</style>
