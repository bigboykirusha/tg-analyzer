/**
 * Saves one report card as a PNG to share: the card is copied into an
 * off-screen frame with the app's name underneath and rendered with
 * html2canvas. The chat's name is not added — only what the card shows.
 */
export function useCardImage() {
  const saving = ref(false)

  async function save(card: HTMLElement, fileName: string) {
    if (!import.meta.client || saving.value) return
    saving.value = true
    const frame = document.createElement('div')
    try {
      const { default: html2canvas } = await import('html2canvas')
      const styles = getComputedStyle(document.documentElement)
      const background = styles.getPropertyValue('--bg').trim() || '#f5f5f7'

      Object.assign(frame.style, {
        position: 'fixed',
        left: '-10000px',
        top: '0',
        width: '480px',
        padding: '32px',
        display: 'grid',
        gap: '16px',
        background,
        fontFamily: styles.getPropertyValue('--font-sans'),
      })
      const clone = card.cloneNode(true) as HTMLElement
      clone.querySelectorAll('.no-print').forEach((node) => node.remove())
      const brand = document.createElement('div')
      brand.textContent = 'TG Analyzer'
      Object.assign(brand.style, {
        color: styles.getPropertyValue('--text-muted').trim(),
        font: styles.getPropertyValue('--text-caption'),
        fontWeight: '600',
        textAlign: 'right',
      })
      frame.append(clone, brand)
      document.body.append(frame)

      const canvas = await html2canvas(frame, { scale: 2, backgroundColor: background, logging: false })
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('Could not render the card')
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } finally {
      frame.remove()
      saving.value = false
    }
  }

  return { save, saving }
}
