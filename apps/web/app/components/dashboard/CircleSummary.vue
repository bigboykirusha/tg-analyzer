<script setup lang="ts">
import { summarizeCircle, type ReportSummaryDto } from '@tg-analyzer/shared'

/**
 * The top of the home page: everything the user's reports say together.
 * An ink tile with all messages and the shared pulse, and a lime tile with
 * the person they write with most.
 */
const props = defineProps<{ reports: ReportSummaryDto[]; avatars: Map<string, boolean> }>()
const { t, tc, formatNumber } = useI18n()

const circle = computed(() => summarizeCircle(props.reports))
const hasPulse = computed(() => circle.value.pulse.some((week) => week.sent || week.received))
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

.circle__most {
  transition: transform var(--duration-press) var(--ease-standard);
}

.circle__most:active {
  transform: scale(var(--press-scale));
}

.circle__avatar {
  margin-top: auto;
}

.circle__name {
  overflow: hidden;
  font: 600 28px/1.1 var(--font-sans);
  letter-spacing: -0.035em;
  text-overflow: ellipsis;
  white-space: nowrap;
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

/* Phones: the lime tile becomes a row, avatar beside the name. */
@media (max-width: 640px) {
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
</style>
