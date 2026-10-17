import type { Ref } from 'vue'
import { api } from './useApi'

function safeFileName(value: string) {
  const cleaned = value
    // eslint-disable-next-line no-control-regex -- strip characters that are invalid in file names
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)
  return `${cleaned || 'telegram-chat'}-report.pdf`
}

/**
 * Renders the report element into a multi-page A4 PDF on the client.
 * The heavy libraries are loaded only when an export is requested.
 */
async function renderPdf(element: HTMLElement): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
  const background = getComputedStyle(document.documentElement).getPropertyValue('--export-background').trim() || '#fff'

  const clone = element.cloneNode(true) as HTMLElement
  clone.classList.add('pdf-export')
  clone.querySelectorAll('.no-print').forEach((node) => node.remove())
  const width = Math.ceil(element.scrollWidth)
  Object.assign(clone.style, { position: 'fixed', left: '-20000px', top: '0', width: `${width}px`, background })
  document.body.append(clone)

  try {
    const canvas = await html2canvas(clone, {
      scale: 2,
      backgroundColor: background,
      logging: false,
      width,
      windowWidth: width,
    })
    const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4', compress: true })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const sliceHeight = Math.floor((canvas.width * pageHeight) / pageWidth)

    for (let top = 0, page = 0; top < canvas.height; top += sliceHeight, page += 1) {
      const height = Math.min(sliceHeight, canvas.height - top)
      const slice = document.createElement('canvas')
      slice.width = canvas.width
      slice.height = height
      const context = slice.getContext('2d')
      if (!context) throw new Error('Canvas is unavailable')
      context.fillStyle = background
      context.fillRect(0, 0, slice.width, height)
      context.drawImage(canvas, 0, top, canvas.width, height, 0, 0, canvas.width, height)
      if (page > 0) pdf.addPage()
      pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageWidth, (height * pageWidth) / canvas.width)
    }
    return pdf.output('blob')
  } finally {
    clone.remove()
  }
}

export function useReportExport(options: {
  element: Ref<HTMLElement | null>
  chatId: Ref<string>
  title: Ref<string>
}) {
  const exporting = ref(false)

  async function withExport(work: (file: { blob: Blob; name: string }) => Promise<void> | void) {
    if (exporting.value || !options.element.value) return
    exporting.value = true
    try {
      await work({ blob: await renderPdf(options.element.value), name: safeFileName(options.title.value) })
    } finally {
      exporting.value = false
    }
  }

  function download() {
    return withExport(({ blob, name }) => {
      const url = URL.createObjectURL(blob)
      const link = Object.assign(document.createElement('a'), { href: url, download: name })
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    })
  }

  /** Sends the PDF to the user's own Saved Messages in Telegram. */
  function sendToSavedMessages() {
    return withExport(async ({ blob, name }) => {
      await api('POST /api/v1/reports/:chatId/share', {
        params: { chatId: options.chatId.value },
        query: { fileName: name },
        body: new Blob([blob], { type: 'application/pdf' }),
      })
    })
  }

  return { exporting, download, sendToSavedMessages }
}
