<script setup lang="ts">
import type { ReportSummaryDto } from '@tg-analyzer/shared'
import type { ChapterHeadline } from '../../composables/useChapterHeadlines'
import { Share } from '../../lib/icons'

/**
 * The report's bar.
 *
 * Phones and tablets (≤ 900 px): a back circle, a capsule in the middle and a share circle, 36 px. The
 * capsule appears as the poster's big name goes under the bar (Apple's large title): the name and how
 * many messages the chat has. It is a label, not a button. There is no second bar of tabs.
 *
 * Wide screens: back, the chat's avatar, its name and «Поделиться».
 */
const props = withDefaults(
  defineProps<{
    summary: ReportSummaryDto
    /** The demo report: one action, «Sign in»; nothing to share. */
    demo?: boolean
    /** A shared link: just the name; the site header already offers «Войти», and there is nowhere to go back to. */
    guest?: boolean
    /** The chapters and their answers (`useChapterHeadlines`): the capsule and its sheet. */
    headlines?: ChapterHeadline[]
    /** «4 800 сообщений»: the capsule's second line before the first chapter. */
    meta?: string
  }>(),
  { demo: false, guest: false, headlines: () => [], meta: '' },
)
const emit = defineEmits<{ share: [] }>()
const { t } = useI18n()

const capsule = computed(() => !props.demo && !props.guest && props.headlines.length > 0)
const spy = useChapterSpy(() => props.headlines.map((headline) => headline.id))
</script>

<template>
  <UiPageBar :title="summary.title" :back="guest ? '' : demo ? '/' : '/dashboard'" :quiet-on-wide="demo || guest">
    <template v-if="!demo && !guest" #leading>
      <ChatAvatar class="report-header__avatar" :chat-id="summary.chatId" :title="summary.title" size="sm" />
      <span v-if="capsule" class="capsule" aria-hidden="true">
        <span class="capsule__name">{{ summary.title }}</span>
        <span class="capsule__status t-num">{{ meta }}</span>
      </span>
    </template>
    <template v-if="!guest" #actions>
      <UiButton v-if="demo" variant="primary" size="sm" to="/login">{{ t('site.signIn') }}</UiButton>
      <template v-else>
        <UiButton
          class="report-bar__share-wide"
          variant="primary"
          size="sm"
          :icon="Share"
          aria-haspopup="dialog"
          @click="emit('share')"
        >
          {{ t('share.open') }}
        </UiButton>
        <button
          type="button"
          class="report-bar__circle report-bar__share-narrow"
          aria-haspopup="dialog"
          :aria-label="t('share.open')"
          @click="emit('share')"
        >
          <Share aria-hidden="true" />
        </button>
      </template>
    </template>
  </UiPageBar>

  <!--
    Installed on the home screen (display-mode: standalone) there is no Safari bar at the bottom: the
    chapters and «Поделиться» move to a dock under the thumb. In a browser tab it is never drawn.
  -->
  <nav v-if="capsule" class="report-dock no-print" :aria-label="t('report.tabs.label')">
    <div class="report-dock__chapters">
      <button
        v-for="headline in headlines"
        :key="headline.id"
        type="button"
        class="report-dock__chapter"
        :aria-current="headline.id === spy.current.value ? 'location' : undefined"
        @click="spy.go(headline.id)"
      >
        {{ headline.label }}
      </button>
    </div>
    <button type="button" class="report-dock__share" :aria-label="t('share.open')" @click="emit('share')">
      <Share aria-hidden="true" />
    </button>
  </nav>
</template>

<style scoped>
.report-bar__circle,
.capsule {
  display: none;
}

/* Phones and tablets: back · capsule · share, every target 48 px. */
@media (max-width: 900px) {
  .report-header__avatar:has(~ .capsule),
  .report-bar__share-wide {
    display: none;
  }

  .report-bar__circle {
    display: grid;
    flex: none;
    width: var(--control-sm);
    height: var(--control-sm);
    place-items: center;
    border: 0;
    border-radius: var(--radius-full);
    background: var(--header-chip);
    box-shadow: var(--header-chip-ring);
    color: var(--text);
    cursor: pointer;
    --icon-size: var(--icon-sm);
  }

  /* The capsule rises into the bar as the poster's big name goes under it. */
  .capsule {
    display: grid;
    flex: 1;
    min-width: 0;
    height: var(--control-sm);
    align-content: center;
    justify-items: center;
    padding: 0 var(--space-4);
    border: 0;
    border-radius: var(--radius-full);
    background: var(--header-chip);
    box-shadow: var(--header-chip-ring);
    color: var(--text);
    opacity: var(--title-progress, 1);
    transform: translateY(calc((1 - var(--title-progress, 1)) * var(--space-1)));
  }

  .capsule__name,
  .capsule__status {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .capsule__name {
    font: var(--text-ui);
    font-weight: 600;
  }

  .capsule__status {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    color: var(--text-muted);
    font: var(--text-caption);
    font-weight: 400;
  }

  .report-bar__circle {
    position: relative;
  }

  .report-bar__circle::after {
    content: '';
    position: absolute;
    inset: calc((var(--control-sm) - var(--hit-min)) / 2);
  }

  .report-bar__circle:active {
    transform: scale(var(--press-scale));
  }
}

.report-dock {
  display: none;
}

@media (display-mode: standalone) and (max-width: 900px) {
  .report-dock {
    position: fixed;
    z-index: var(--z-header);
    inset: auto var(--space-3) calc(var(--space-3) + env(safe-area-inset-bottom, 0px));
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .report-dock__chapters {
    display: flex;
    flex: 1;
    min-width: 0;
    padding: var(--space-1);
    border-radius: var(--radius-full);
    background: var(--toolbar-glass);
    box-shadow: var(--shadow-overlay);
    -webkit-backdrop-filter: var(--glass-filter);
    backdrop-filter: var(--glass-filter);
  }

  .report-dock__chapter {
    flex: 1;
    min-width: 0;
    min-height: var(--control-md);
    border: 0;
    border-radius: var(--radius-full);
    background: transparent;
    color: var(--text);
    cursor: pointer;
    font: var(--text-ui);
    white-space: nowrap;
  }

  .report-dock__chapter[aria-current] {
    background: var(--accent);
    color: var(--on-accent);
  }

  .report-dock__share {
    display: grid;
    flex: none;
    width: calc(var(--control-md) + var(--space-2));
    height: calc(var(--control-md) + var(--space-2));
    place-items: center;
    border: 0;
    border-radius: var(--radius-full);
    background: var(--toolbar-glass);
    box-shadow: var(--shadow-overlay);
    color: var(--text);
    cursor: pointer;
    -webkit-backdrop-filter: var(--glass-filter);
    backdrop-filter: var(--glass-filter);
    --icon-size: var(--icon-md);
  }
}
</style>
