/** Width of an exported story image; slides are 9:16, so the height is 1920. */
const STORY_WIDTH = 1080

/**
 * Turns a rendered slide into a PNG for stories and hands it to the device:
 * the system share sheet where files can be shared (phones), a download
 * otherwise.
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

  function download(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  /** Whether this browser can share image files (mobile share sheet). */
  function canShareFiles() {
    if (!import.meta.client || typeof navigator.canShare !== 'function') return false
    const probe = new File([new Blob()], 'probe.png', { type: 'image/png' })
    return navigator.canShare({ files: [probe] })
  }

  /** Shares through the system sheet; returns false when the user closed it. */
  async function share(files: File[], text?: string) {
    try {
      await navigator.share(text ? { files, text } : { files })
      return true
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return false
      throw error
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
