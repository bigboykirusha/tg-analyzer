<script setup lang="ts">
import { X } from '../lib/icons'

/** The privacy policy as a full-screen modal over the login page. */
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const panelRef = ref<HTMLElement | null>(null)
const titleId = useId()
const open = toRef(props, 'open')

useBodyScrollLock(open)
useFocusTrap(panelRef, open, { onEscape: () => emit('close'), initial: () => panelRef.value })

/** Each section: a title and paragraphs or a list, all from the copy files. */
const sections = computed(() => [
  {
    key: 'receive',
    title: t('privacy.receive.title'),
    items: [
      t('privacy.receive.phone'),
      t('privacy.receive.profile'),
      t('privacy.receive.chats'),
      t('privacy.receive.messages'),
    ],
  },
  {
    key: 'store',
    title: t('privacy.store.title'),
    items: [t('privacy.store.reports'), t('privacy.store.session'), t('privacy.store.technical')],
  },
  { key: 'use', title: t('privacy.use.title'), paragraphs: [t('privacy.use.text')] },
  { key: 'share', title: t('privacy.share.title'), paragraphs: [t('privacy.share.text'), t('privacy.share.hosting')] },
  { key: 'keep', title: t('privacy.keep.title'), paragraphs: [t('privacy.keep.text')] },
  {
    key: 'delete',
    title: t('privacy.delete.title'),
    paragraphs: [t('privacy.delete.text'), t('privacy.delete.telegram')],
  },
])
</script>

<template>
  <Teleport to="body">
    <Transition name="privacy">
      <section
        v-if="open"
        ref="panelRef"
        tabindex="-1"
        class="privacy"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
      >
        <header class="privacy__bar">
          <h1 :id="titleId" class="privacy__title">{{ t('privacy.title') }}</h1>
          <UiIconButton :icon="X" :label="t('common.close')" variant="ghost" @click="emit('close')" />
        </header>

        <UiPageContainer size="narrow">
          <article class="privacy__body">
            <section v-for="section in sections" :key="section.key" class="privacy__section">
              <h2 class="privacy__heading">{{ section.title }}</h2>
              <p v-for="paragraph in section.paragraphs ?? []" :key="paragraph" class="privacy__text">
                {{ paragraph }}
              </p>
              <ul v-if="section.items" class="privacy__list">
                <li v-for="item in section.items" :key="item">{{ item }}</li>
              </ul>
            </section>
          </article>
        </UiPageContainer>
      </section>
    </Transition>
  </Teleport>
</template>

<style scoped>
.privacy {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-bottom: max(var(--space-16), env(safe-area-inset-bottom));
  background: var(--bg);
  color: var(--text);
}

.privacy:focus {
  outline: none;
}

/* Title and close stay in reach while the policy scrolls. */
.privacy__bar {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
  padding: max(var(--space-3), env(safe-area-inset-top)) var(--space-3) var(--space-3) var(--space-5);
  border-bottom: 1px solid var(--border);
  background: var(--bg);
}

.privacy__title {
  flex: 1;
  min-width: 0;
  font: var(--text-title);
}

.privacy__body {
  display: grid;
  padding: var(--space-2) var(--space-6);
  border-radius: var(--radius-card);
  background: var(--surface);
}

.privacy__section {
  display: grid;
  gap: var(--space-2);
  padding-block: var(--space-5);
}

.privacy__section + .privacy__section {
  border-top: 1px solid var(--border);
}

.privacy__heading {
  font: 600 18px/26px var(--font-sans);
  letter-spacing: -0.01em;
}

.privacy__text {
  color: var(--text-muted);
  font: 400 15px/24px var(--font-sans);
}

.privacy__list {
  display: grid;
  gap: var(--space-1);
  padding-left: var(--space-5);
  color: var(--text-muted);
  font: 400 15px/24px var(--font-sans);
}

.privacy__list li::marker {
  color: var(--text-muted);
}

.privacy-enter-active,
.privacy-leave-active {
  transition:
    opacity var(--transition-normal),
    transform var(--transition-normal);
}

.privacy-enter-from,
.privacy-leave-to {
  opacity: 0;
  transform: translateY(var(--space-4));
}

@media (max-width: 640px) {
  .privacy__body {
    padding: var(--space-1) var(--space-5);
  }
}
</style>
