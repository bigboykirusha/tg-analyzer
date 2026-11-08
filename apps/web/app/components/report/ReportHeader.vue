<script setup lang="ts">
import type { ReportSummaryDto } from '@tg-analyzer/shared'
import type { ChapterHeadline } from '../../composables/useChapterHeadlines'
import { ChevronDown, Play, RotateCw, Share } from '../../lib/icons'

/**
 * The report's bar.
 *
 * Phones and tablets (≤ 900 px): a back circle, a capsule in the middle and a share circle. The capsule
 * appears as the poster's big name goes under the bar (Apple's large title): the name and a status —
 * the size of the chat, then, once the reader is in a chapter, «Время · 2 из 3 ▾». Tapping it opens a
 * sheet with every chapter and its answer, «Смотреть итоги», «Поделиться» and «Разобрать заново». There
 * is no second bar of tabs.
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
    /** A fresh analysis can start from the sheet. */
    canReanalyse?: boolean
  }>(),
  { demo: false, guest: false, headlines: () => [], meta: '', canReanalyse: false },
)
const emit = defineEmits<{ share: []; story: []; reanalyse: [] }>()
const { t } = useI18n()

const capsule = computed(() => !props.demo && !props.guest && props.headlines.length > 0)
const spy = useChapterSpy(() => props.headlines.map((headline) => headline.id))
const position = computed(() => props.headlines.findIndex((headline) => headline.id === spy.current.value))
const status = computed(() => {
  const at = position.value
  const chapter = props.headlines[at]
  if (!chapter) return props.meta
  return t('report.capsule.chapter', { name: chapter.label, at: at + 1, total: props.headlines.length })
})
const sheetOpen = ref(false)

function jump(id: string) {
  sheetOpen.value = false
  // After the sheet has let go of the page (its scroll lock and focus return come with closing): two
  // frames, so a slow device has painted the sheet's exit before the page starts to move.
  requestAnimationFrame(() => requestAnimationFrame(() => spy.go(id)))
}

function act(action: 'share' | 'story' | 'reanalyse') {
  sheetOpen.value = false
  if (action === 'share') emit('share')
  else if (action === 'story') emit('story')
  else emit('reanalyse')
}
</script>

<template>
  <UiPageBar :title="summary.title" :back="guest ? '' : demo ? '/' : '/dashboard'" :quiet-on-wide="demo || guest">
    <template v-if="!demo && !guest" #leading>
      <ChatAvatar class="report-header__avatar" :chat-id="summary.chatId" :title="summary.title" size="sm" />
      <button
        v-if="capsule"
        type="button"
        class="capsule"
        aria-haspopup="dialog"
        :aria-expanded="sheetOpen"
        :aria-label="t('report.capsule.open', { name: summary.title })"
        @click="sheetOpen = true"
      >
        <span class="capsule__name" aria-hidden="true">{{ summary.title }}</span>
        <span class="capsule__status t-num" aria-hidden="true">
          {{ status }}<ChevronDown v-if="position >= 0" class="capsule__chevron" />
        </span>
      </button>
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

  <UiBottomSheet v-if="capsule" :open="sheetOpen" :title="summary.title" @close="sheetOpen = false">
    <p class="chapters__meta t-small t-muted">{{ meta }}</p>
    <nav class="chapters" :aria-label="t('report.tabs.label')">
      <button
        v-for="(headline, at) in headlines"
        :key="headline.id"
        type="button"
        class="chapters__row"
        :aria-current="at === position ? 'location' : undefined"
        @click="jump(headline.id)"
      >
        <strong>{{ headline.label }}</strong>
        <span v-if="headline.text">{{ headline.text }}</span>
      </button>
    </nav>
    <template #actions>
      <div class="chapters__actions">
        <UiButton variant="primary" :icon="Play" @click="act('story')">{{ t('share.watch') }}</UiButton>
        <UiButton variant="secondary" :icon="Share" @click="act('share')">{{ t('share.open') }}</UiButton>
      </div>
      <UiButton v-if="canReanalyse" variant="ghost" :icon="RotateCw" @click="act('reanalyse')">
        {{ t('dashboard.reanalyse') }}
      </UiButton>
    </template>
  </UiBottomSheet>
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
    width: var(--control-lg);
    height: var(--control-lg);
    place-items: center;
    border: 0;
    border-radius: var(--radius-full);
    background: var(--header-chip);
    box-shadow: var(--header-chip-ring);
    color: var(--text);
    cursor: pointer;
    --icon-size: var(--icon-md);
  }

  /* The capsule rises into the bar as the poster's big name goes under it. */
  .capsule {
    display: grid;
    flex: 1;
    min-width: 0;
    height: var(--control-lg);
    align-content: center;
    justify-items: center;
    padding: 0 var(--space-4);
    border: 0;
    border-radius: var(--radius-full);
    background: var(--header-chip);
    box-shadow: var(--header-chip-ring);
    color: var(--text);
    cursor: pointer;
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

  .capsule__chevron {
    flex: none;
    --icon-size: var(--icon-sm);
  }

  .report-bar__circle:active,
  .capsule:active {
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

.chapters__meta {
  padding: 0 var(--space-3) var(--space-2);
}

.chapters {
  display: grid;
  gap: var(--space-1);
}

/* A chapter: its name and its answer; the one being read is marked. */
.chapters__row {
  display: grid;
  gap: var(--space-0-5);
  padding: var(--space-3);
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text);
  font: var(--text-body);
  text-align: left;
  cursor: pointer;
}

.chapters__row strong {
  font: var(--text-title);
}

.chapters__row span {
  color: var(--text-muted);
  font: var(--text-small);
}

.chapters__row[aria-current] {
  background: var(--surface-2);
}

.chapters__row:active {
  background: var(--pressed);
}

.chapters__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
}
</style>
