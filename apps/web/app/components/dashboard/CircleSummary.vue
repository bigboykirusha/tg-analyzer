<script setup lang="ts">
import { summarizeCircle, type ReportSummaryDto } from '@tg-analyzer/shared'
import { ChevronRight } from '../../lib/icons'

/**
 * The top of the home page: everything the user's reports say together.
 * An ink tile with all messages and the shared pulse, a lime tile with the
 * person they write with most, then who replies fastest and who starts.
 */
const props = defineProps<{ reports: ReportSummaryDto[]; avatars: Map<string, boolean> }>()
const { t, tc, formatNumber, formatDuration, formatPercent } = useI18n()

const circle = computed(() => summarizeCircle(props.reports))
const hasPulse = computed(() => circle.value.pulse.some((week) => week.sent || week.received))

const people = computed(() => {
  const c = circle.value
  const items = []
  if (c.fastestReply)
    items.push({
      key: 'fastest',
      label: t('circle.fastest'),
      who: c.fastestReply,
      note: t('circle.fastestNote', { time: formatDuration(c.fastestReply.value) }),
    })
  if (c.youStartMost)
    items.push({
      key: 'you-start',
      label: t('circle.youStart'),
      who: c.youStartMost,
      note: t('circle.youStartNote', { pct: formatPercent(c.youStartMost.value) }),
    })
  if (c.theyStartMost && c.theyStartMost.chatId !== c.youStartMost?.chatId)
    items.push({
      key: 'they-start',
      label: t('circle.theyStart'),
      who: c.theyStartMost,
      note: t('circle.theyStartNote', { pct: formatPercent(100 - c.theyStartMost.value) }),
    })
  return items
})
</script>

<template>
  <div class="bento circle">
    <section class="tile tile--ink circle__main" :class="circle.mostMessages ? 'span-8' : 'span-12'">
      <div class="tile__label">{{ t('circle.total') }}</div>
      <div class="tile__figure">{{ formatNumber(circle.totalMessages) }}</div>
      <div class="tile__note">
        {{ tc('circle.chats', circle.chats)
        }}<template v-if="circle.people"> · {{ tc('circle.people', circle.people) }}</template
        ><template v-if="circle.sentMessages !== null">
          · {{ t('circle.sent', { count: formatNumber(circle.sentMessages) }) }}</template
        >
      </div>
      <Seismograph
        v-if="hasPulse"
        class="circle__pulse"
        :days="circle.pulse"
        :height="72"
        :label="t('dashboard.pulseLabel')"
      />
    </section>

    <NuxtLink
      v-if="circle.mostMessages"
      :to="`/chat/${circle.mostMessages.chatId}`"
      class="tile tile--lime span-4 circle__most"
    >
      <div class="tile__label">{{ t('circle.mostMessages') }}</div>
      <ChatAvatar
        :chat-id="circle.mostMessages.chatId"
        :title="circle.mostMessages.title"
        :has-avatar="avatars.get(circle.mostMessages.chatId)"
        size="lg"
        class="circle__avatar"
      />
      <div class="circle__name">{{ circle.mostMessages.title }}</div>
      <div class="tile__note">{{ tc('common.messagesCount', circle.mostMessages.value) }}</div>
    </NuxtLink>

    <div v-if="people.length" class="span-12 circle__people">
      <NuxtLink v-for="item in people" :key="item.key" :to="`/chat/${item.who.chatId}`" class="tile circle__person">
        <div class="tile__label">{{ item.label }}</div>
        <div class="circle__who">
          <ChatAvatar
            :chat-id="item.who.chatId"
            :title="item.who.title"
            :has-avatar="avatars.get(item.who.chatId)"
            size="sm"
          />
          <span class="circle__who-name">{{ item.who.title }}</span>
          <ChevronRight class="circle__chevron" aria-hidden="true" />
        </div>
        <div class="tile__note">{{ item.note }}</div>
      </NuxtLink>
    </div>

    <p v-if="circle.people === 1" class="tile span-12 circle__hint">{{ t('circle.compareHint') }}</p>
  </div>
</template>

<style scoped>
.circle__main {
  min-height: 240px;
}

.circle__pulse {
  margin-top: auto;
  padding-top: var(--space-4);
}

.circle__most,
.circle__person {
  transition: transform var(--duration-press) var(--ease-standard);
}

.circle__most:active,
.circle__person:active {
  transform: scale(var(--press-scale));
}

.circle__avatar {
  margin-top: auto;
}

.circle__people {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
}

.circle__name {
  overflow: hidden;
  font: 600 28px/1.1 var(--font-sans);
  letter-spacing: -0.035em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.circle__who {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
  margin-top: var(--space-1);
}

.circle__who-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font: 600 20px/1.2 var(--font-sans);
  letter-spacing: -0.02em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.circle__chevron {
  color: var(--text-faint);
}

.circle__hint {
  color: var(--text-muted);
  font: var(--text-small);
}

@media (max-width: 900px) {
  .circle__main {
    min-height: 0;
  }

  .circle__pulse {
    margin-top: 0;
    padding-top: var(--space-2);
  }
}

/* Phones: the people slide sideways instead of stacking three more screens. */
@media (max-width: 640px) {
  .circle__people {
    display: flex;
    margin-inline: calc(var(--page-gutter) * -1);
    padding: 0 var(--page-gutter);
    overflow-x: auto;
    scroll-padding-inline: var(--page-gutter);
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
  }

  .circle__people::-webkit-scrollbar {
    display: none;
  }

  .circle__person {
    flex: 0 0 78%;
    scroll-snap-align: start;
  }

  .circle__most {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    column-gap: var(--space-3);
  }

  .circle__most .tile__label {
    grid-column: 1 / -1;
  }

  .circle__most .circle__avatar {
    grid-row: span 2;
    margin-top: 0;
  }

  .circle__name {
    font-size: 24px;
  }
}

@media (hover: hover) {
  .circle__person:hover .circle__chevron {
    color: var(--text);
  }
}
</style>
