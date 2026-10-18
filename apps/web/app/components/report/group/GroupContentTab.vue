<script setup lang="ts">
import type { GroupReportDto, ReportDto } from '@tg-analyzer/shared'

const props = defineProps<{ data: ReportDto; group: GroupReportDto }>()
const { t } = useI18n()
const nameOf = useParticipantName()

const signatures = computed(() =>
  [...props.group.participants]
    .filter((p) => p.topicSignature.length)
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, 8),
)
</script>

<template>
  <div class="report-grid">
    <ReportSection :title="t('group.sharedVocabulary')" :text="t('group.sharedVocabularyHint')">
      <WordChips :items="group.sharedVocabulary" :empty="t('group.noWords')" />
    </ReportSection>
    <ReportSection
      v-if="group.uniqueGroupWords.length"
      :title="t('group.uniqueWords')"
      :text="t('group.uniqueWordsHint')"
    >
      <WordChips :items="group.uniqueGroupWords" :empty="t('group.noWords')" />
    </ReportSection>

    <ReportSection v-if="signatures.length" wide :title="t('group.signatures')">
      <div class="signatures">
        <div v-for="p in signatures" :key="p.id" class="signature">
          <strong>{{ nameOf(p) }}</strong>
          <WordChips :items="p.topicSignature" :empty="t('group.noWords')" :counts="false" />
        </div>
      </div>
    </ReportSection>

    <ReportSection wide :title="t('group.topEmoji')">
      <EmojiGrid :items="data.report.vocabulary.topEmoji.slice(0, 12)" />
    </ReportSection>
  </div>
</template>

<style scoped>
.signatures {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-3);
}

.signature {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}
</style>
