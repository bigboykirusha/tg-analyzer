<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { Scale } from '../../lib/icons'

/**
 * «Баланс»: who carries the chat. The answer is one phrase («Пишете на равных») or one figure («×1,8» and
 * who it is for); under it three identical rows, you on the left in ink and the other side on the right in
 * their colour: messages, reply time, who starts the conversation. The numbers and the verdict come from
 * `useBalance`, shared with the guest's page and the «Итоги». With an `author` the card speaks in the third
 * person, for a reader who opened the report by a link.
 */
const props = defineProps<{ data: ReportDto; author?: string | null }>()
const { t } = useI18n()
const { name, me, answer, figure, rows } = useBalance(
  () => props.data,
  () => props.author ?? null,
)
</script>

<template>
  <ReportSection
    v-if="answer"
    id="part-balance"
    tone="ink"
    :icon="Scale"
    :title="t('report.balance.title')"
    :figure="figure"
    :answer="answer"
  >
    <div class="balance">
      <p v-if="!author" class="balance__sides t-label" aria-hidden="true">
        <span>{{ me }}</span>
        <span class="balance__them">{{ name }}</span>
      </p>
      <div v-for="row in rows" :key="row.key" class="balance__row">
        <p class="t-label">{{ row.label }}</p>
        <ReportLine
          :mine="row.mine"
          :theirs="row.theirs"
          :left="row.left"
          :right="row.right"
          :left-name="me"
          :right-name="name"
        />
      </div>
    </div>
  </ReportSection>
</template>

<style scoped>
.balance {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.balance__sides {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
}

.balance__sides > span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.balance__them {
  color: var(--them-ink);
}

.balance__row {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
</style>
