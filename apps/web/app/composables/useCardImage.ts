/** Width of an exported story image; slides are 9:16, so the height is 1920. */
const STORY_WIDTH = 1080

/**
 * Turns a rendered slide into a PNG for stories and hands it to the device:
 * the system share sheet where files can be shared (phones), a download
 * otherwise, and the picture opened by itself where even that is not possible.
 */
export function useCardImage() {
  const busy = ref(false)

  async function render(slide: HTMLElement): Promise<Blob> {
    const { default: html2canvas } = await import('html2canvas')
    // Exactly 9:16 so stories accept the image without cropping (1080×1920).
    const width = slide.offsetWidth
    const canvas = await html2canvas(slide, {
      scale: STORY_WIDTH / width,
      width,
      height: (width * 16) / 9,
      backgroundColor: null,
      logging: false,
    })
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('Could not render the slide')
    return blob
  }

  /**
   * Saves a picture. A browser that honours `download` (Safari 13+, Chrome) saves it; one that does not
   * (the in-app browser of Telegram, an old WebView) opens the picture instead, so it can be held and
   * saved by hand. Returns which of the two happened.
   */
  function download(blob: Blob, fileName: string): 'saved' | 'opened' {
    const url = URL.createObjectURL(blob)
    if (/Telegram/iu.test(navigator.userAgent) || !('download' in HTMLAnchorElement.prototype)) {
      const tab = window.open(url, '_blank')
      // A blocked pop-up: show the picture in this tab rather than lose it.
      if (!tab) window.location.assign(url)
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
      return 'opened'
    }
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.rel = 'noopener'
    // Safari wants the link in the document.
    document.body.append(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    return 'saved'
  }

  /** Whether this browser can share image files (mobile share sheet). */
  function canShareFiles() {
    if (!import.meta.client || typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function')
      return false
    try {
      return navigator.canShare({ files: [new File([new Blob()], 'probe.png', { type: 'image/png' })] })
    } catch {
      return false
    }
  }

  /**
   * Shares through the system sheet. `cancelled`: the person closed it. `failed`: the browser refused
   * (Safari drops the tap's permission while the pictures render, a WebView may lack the sheet), so the
   * caller saves the files instead.
   */
  async function share(files: File[], text?: string): Promise<'shared' | 'cancelled' | 'failed'> {
    try {
      await navigator.share(text ? { files, text } : { files })
      return 'shared'
    } catch (error) {
      return (error as DOMException)?.name === 'AbortError' ? 'cancelled' : 'failed'
    }
  }

  async function run<T>(work: () => Promise<T>) {
    busy.value = true
    try {
      return await work()
    } finally {
      busy.value = false
    }
  }

  return { busy, render, download, canShareFiles, share, run }
}
