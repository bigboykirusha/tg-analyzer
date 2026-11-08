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
  <ReportSection
    :wide="!group.uniqueGroupWords.length"
    :title="t('group.sharedVocabulary')"
    :text="t('group.sharedVocabularyHint')"
  >
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
</template>

<style scoped>
/* One row per person, divided by hairlines: no boxes inside the card. */
.signatures {
  display: grid;
}

.signature {
  display: grid;
  grid-template-columns: minmax(var(--space-20), calc(var(--space-20) * 2)) minmax(0, 1fr);
  align-items: baseline;
  gap: var(--space-4);
  padding-block: var(--space-3);
}

.signature + .signature {
  box-shadow: var(--divider-top);
}

.signature strong {
  overflow: hidden;
  font: var(--text-title);
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .signature {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-2);
  }
}
</style>
