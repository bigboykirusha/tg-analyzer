/**
 * Display name for a group participant: «You» for the account owner (the author's name on a shared link), a
 * number for a member a shared link left without a name («Участник 3»: the link's ids are «p1», «p2», … by activity),
 * a plain fallback for deleted accounts.
 */
export function useParticipantName() {
  const { t } = useI18n()
  const author = useReportAuthor()
  return (participant: { id?: string; name: string; isSelf?: boolean }) => {
    if (participant.isSelf) return author.value ?? t('group.you')
    if (participant.name) return participant.name
    const alias = participant.id ? /^p(\d+)$/.exec(participant.id) : null
    return alias ? t('group.participantNumber', { n: alias[1]! }) : t('group.unknownParticipant')
  }
}
