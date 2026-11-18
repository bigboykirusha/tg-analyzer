import type { GroupPairDto } from '@tg-analyzer/shared'

export function useGroupPairDetail() {
  const { t, formatNumber } = useI18n()
  return (pair: GroupPairDto) =>
    [
      pair.directReplies ? t('group.pairs.direct', { count: formatNumber(pair.directReplies) }) : '',
      pair.impliedReplies ? t('group.pairs.implied', { count: formatNumber(pair.impliedReplies) }) : '',
    ]
      .filter(Boolean)
      .join(' · ')
}
