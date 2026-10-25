<script setup lang="ts">
import type { ReportSummaryDto } from '@tg-analyzer/shared'

/**
 * Private chats side by side: who carries each conversation, who starts it and
 * how fast each side replies. Built from report summaries only.
 */
const props = defineProps<{
  reports: readonly ReportSummaryDto[]
  avatars: ReadonlyMap<string, boolean>
}>()
const { t, formatPercent, formatDuration } = useI18n()

const rows = computed(() =>
  props.reports
    .filter((report) => report.headline && report.headline.sentSharePct !== null)
    .slice()
    .sort((left, right) => right.totalMessages - left.totalMessages)
    .map((report) => {
      const share = report.headline.sentSharePct ?? 50
      return {
        report,
        share,
        first: report.headline.iWriteFirstPct,
        mine: report.headline.medianMineSec,
        theirs: report.headline.medianTheirsSec,
      }
    }),
)
</script>

<template>
  <table class="people">
    <thead>
      <tr>
        <th scope="col">{{ t('people.person') }}</th>
        <th scope="col">{{ t('people.share') }}</th>
        <th scope="col" class="people__num">{{ t('people.first') }}</th>
        <th scope="col" class="people__num">{{ t('people.youReply') }}</th>
        <th scope="col" class="people__num">{{ t('people.theyReply') }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in rows" :key="row.report.chatId">
        <th scope="row" class="people__person">
          <NuxtLink :to="`/chat/${row.report.chatId}`" class="people__link">
            <ChatAvatar
              :chat-id="row.report.chatId"
              :title="row.report.title"
              :has-avatar="avatars.get(row.report.chatId)"
              size="sm"
            />
            <span class="people__name">{{ row.report.title }}</span>
          </NuxtLink>
        </th>
        <td class="people__share" :data-label="t('people.share')">
          <span class="split" role="img" :aria-label="t('people.shareLabel', { share: formatPercent(row.share) })">
            <span class="split__you" :style="{ width: `${row.share}%` }" />
            <span class="split__them" />
          </span>
          <span class="split__legend t-num">
            <span class="t-you">{{ formatPercent(row.share) }}</span>
            <span class="t-them">{{ formatPercent(100 - row.share) }}</span>
          </span>
        </td>
        <td class="people__num t-num" :data-label="t('people.first')">{{ formatPercent(row.first) }}</td>
        <td class="people__num t-num" :data-label="t('people.youReply')">{{ formatDuration(row.mine) }}</td>
        <td class="people__num t-num" :data-label="t('people.theyReply')">{{ formatDuration(row.theirs) }}</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.people {
  width: 100%;
  border-collapse: collapse;
  font: var(--text-ui);
}

.people th,
.people td {
  padding: var(--space-3) var(--space-4);
  text-align: left;
  vertical-align: middle;
}

.people thead th {
  padding-block: 0 var(--space-3);
  border-bottom: 1px solid var(--border-strong);
  color: var(--text-muted);
  font: var(--text-label);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.people tbody tr + tr > * {
  border-top: 1px solid var(--border);
}

.people th:first-child,
.people td:first-child {
  padding-left: 0;
}

.people th:last-child,
.people td:last-child {
  padding-right: 0;
}

.people__num {
  text-align: right !important;
  white-space: nowrap;
}

.people__person {
  font-weight: 400;
  max-width: 260px;
}

.people__link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
  border-radius: var(--radius-sm);
}

@media (hover: hover) {
  .people__link:hover .people__name {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
}

.people__name {
  overflow: hidden;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.people__share {
  width: 34%;
  min-width: 160px;
}

/* Your share in vermilion against theirs in indigo, with a hairline gap. */
.split {
  display: flex;
  gap: 2px;
  height: 6px;
}

.split__you {
  border-radius: var(--radius-full) 0 0 var(--radius-full);
  background: var(--you);
}

.split__them {
  flex: 1;
  border-radius: 0 var(--radius-full) var(--radius-full) 0;
  background: var(--them);
}

.split__legend {
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-1);
  font: var(--text-small);
  font-weight: 600;
}

@media (max-width: 720px) {
  .people thead {
    display: none;
  }

  .people tbody tr {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-3) var(--space-4);
    padding-block: var(--space-4);
  }

  .people tbody tr + tr {
    border-top: 1px solid var(--border);
  }

  .people tbody tr + tr > * {
    border-top: 0;
  }

  .people th,
  .people td {
    padding: 0 !important;
  }

  .people__person,
  .people__share {
    grid-column: 1 / -1;
    width: auto;
    max-width: none;
  }

  .people__num {
    display: grid;
    gap: 2px;
    text-align: left !important;
  }

  .people__num::before {
    content: attr(data-label);
    color: var(--text-muted);
    font: var(--text-caption);
    white-space: normal;
  }
}
</style>
