import type { GroupReportDto } from '@tg-analyzer/shared'

/** Display name for a group participant: "You" for the account owner, a fallback for deleted accounts. */
export function useParticipantName() {
  const { t } = useI18n()
  return (participant: { name: string; isSelf?: boolean }) =>
    participant.isSelf ? t('group.you') : participant.name || t('group.unknownParticipant')
}

/** Resolves pair member names through the participant list so that the owner shows as "You". */
export function usePairNames(group: () => GroupReportDto) {
  const nameOf = useParticipantName()
  const byId = computed(() => new Map(group().participants.map((participant) => [participant.id, participant])))
  return (id: string, fallback: string) => nameOf(byId.value.get(id) ?? { name: fallback })
}
