<script setup lang="ts">
import type { MilestoneDto } from '@tg-analyzer/shared'

/**
 * Round message numbers of a chat with their date, who wrote it and what it
 * was — a voice message of 0:42, a 😭 sticker, five words. Never the text:
 * it is not stored. A link opens the message itself in Telegram.
 * `authors` names who wrote each, in the same order.
 */
const props = defineProps<{ milestones: MilestoneDto[]; authors: string[]; chatId: string }>()
const { t, tc, formatNumber, formatDate, formatCountdown } = useI18n()

/** What the message was, from its kind and size. */
function what(milestone: MilestoneDto) {
  const length = milestone.durationSec ? formatCountdown(milestone.durationSec) : null
  switch (milestone.kind) {
    case 'text':
      return milestone.words ? tc('report.milestone.text', milestone.words) : t('report.milestone.textPlain')
    case 'voice':
      return length ? t('report.milestone.voiceLength', { length }) : t('report.milestone.voice')
    case 'round':
      return length ? t('report.milestone.roundLength', { length }) : t('report.milestone.round')
    case 'sticker':
      return milestone.emoji
        ? t('report.milestone.stickerEmoji', { emoji: milestone.emoji })
        : t('report.milestone.sticker')
    case 'media':
      return t('report.milestone.media')
    case 'file':
      return t('report.milestone.file')
    default:
      return null
  }
}

/**
 * The message in Telegram: private chats by user id, supergroups through
 * t.me/c. Basic groups have no such link.
 */
function link(milestone: MilestoneDto) {
  if (!milestone.messageId) return null
  const id = props.chatId
  if (/^\d+$/.test(id)) return `tg://openmessage?user_id=${id}&message_id=${milestone.messageId}`
  if (id.startsWith('-100')) return `https://t.me/c/${id.slice(4)}/${milestone.messageId}`
  return null
}

const rows = computed(() =>
  props.milestones.map((milestone, index) => ({
    key: milestone.index,
    label:
      milestone.index === 1
        ? t('report.talk.milestoneFirst')
        : t('report.talk.milestoneN', { n: formatNumber(milestone.index) }),
    date: formatDate(milestone.at, { day: 'numeric', month: 'long', year: 'numeric' }),
    author: props.authors[index] ?? '',
    what: what(milestone),
    link: link(milestone),
    mine: milestone.mine,
  })),
)
</script>

<template>
  <ol class="milestones">
    <li v-for="row in rows" :key="row.key" class="milestone">
      <i class="milestone__dot" :class="{ 'milestone__dot--mine': row.mine }" aria-hidden="true" />
      <strong class="t-title">{{ row.label }}</strong>
      <span class="t-small t-muted">{{ row.date }} · {{ row.author }}</span>
      <span v-if="row.what" class="t-small">{{ row.what }}</span>
      <a v-if="row.link" class="link t-small" :href="row.link" target="_blank" rel="noopener">{{
        t('report.milestone.open')
      }}</a>
    </li>
  </ol>
</template>

<style scoped>
.milestones {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-4) var(--space-6);
  list-style: none;
}

.milestone {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: baseline;
  gap: var(--space-1) var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border);
}

.milestone > span,
.milestone > a {
  grid-column: 2;
}

.milestone__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--them);
}

.milestone__dot--mine {
  background: var(--you);
}
</style>
