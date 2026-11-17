/** The same title and byline on a shared report and in the owner's preview. */
export function useSharedReportHeading() {
  const { t } = useI18n()

  return (chat: string, owner: string, group: boolean, showName: boolean) => {
    const author = showName ? owner : t('share.author')
    const partner = (showName && chat) || t(group ? 'share.group' : 'share.partner')
    const caption = showName ? t('publicReport.sharedBy', { name: author }) : ''
    let heading = partner
    if (!group)
      heading = showName ? t('publicReport.pair', { me: author, name: partner }) : t('publicReport.anonymousTitle')
    return { author, partner, caption, heading }
  }
}
