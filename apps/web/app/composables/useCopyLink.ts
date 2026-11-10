/**
 * Copies an address to the clipboard. Where the browser has no clipboard access (an insecure page,
 * a denied permission, an embedded view) it does not fail with an error: `fallback` keeps the address,
 * so the dialog shows it as selectable text next to the system share sheet when there is one.
 */
export function useCopyLink() {
  const { t } = useI18n()
  const toast = useToast()
  const fallback = ref('')
  const canShare = computed(() => import.meta.client && typeof navigator !== 'undefined' && 'share' in navigator)

  async function copy(url: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(url)
      fallback.value = ''
      toast.success(t('share.link.copied'))
      return true
    } catch {
      fallback.value = url
      return false
    }
  }

  async function share() {
    if (!fallback.value) return
    try {
      await navigator.share({ url: fallback.value })
    } catch {
      // The sheet was closed: the address stays on screen.
    }
  }

  return { fallback, canShare, copy, share }
}
