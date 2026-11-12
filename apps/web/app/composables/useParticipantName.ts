/** Display name for a group participant: "You" for the account owner, a fallback for deleted accounts. */
export function useParticipantName() {
  const { t } = useI18n()
  return (participant: { name: string; isSelf?: boolean }) =>
    participant.isSelf ? t('group.you') : participant.name || t('group.unknownParticipant')
}
