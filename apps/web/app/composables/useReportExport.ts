import { nextTick, ref } from 'vue'
import type { Ref } from 'vue'
import { useApiEndpoint } from './useApi'

interface ReportExportOptions<ExpandedChart> {
  reportElement: Ref<HTMLElement | null>
  fileBaseName: Ref<string>
  chatId: Ref<string>
  expandedChart: Ref<ExpandedChart | null>
  shareOpen: Ref<boolean>
}

function buildSafeExportName(value: string) {
  return (
    value
      // eslint-disable-next-line no-control-regex -- Strip control characters from export filenames.
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60) || 'telegram-chat'
  )
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  document.body.append(link)
  link.click()
  window.setTimeout(() => {
    link.remove()
    URL.revokeObjectURL(url)
  }, 1000)
}

async function fileToBase64(file: File) {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

export function useReportExport<ExpandedChart>(options: ReportExportOptions<ExpandedChart>) {
  const auth = useAuthStore()
  const toast = useToast()
  const { t } = useI18n()
  const exporting = ref(false)

  async function createReportPdfFile() {
    if (!import.meta.client) {
      throw new Error('Client-only action')
    }

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])

    options.expandedChart.value = null
    options.shareOpen.value = false
    await nextTick()

    let exportRoot: HTMLElement | null = null
    try {
      const target = options.reportElement.value
      if (!target) {
        throw new Error('Report content is unavailable')
      }

      exportRoot = target.cloneNode(true) as HTMLElement
      // On phones the report identity lives in the persistent navigation header.
      const mobileIdentity = document.querySelector('#mobile-report-toolbar .report-topline')
      if (mobileIdentity && !exportRoot.querySelector('.report-topline')) {
        exportRoot.querySelector('.report-header')?.prepend(mobileIdentity.cloneNode(true))
      }
      exportRoot.classList.add('pdf-export-clone')
      exportRoot.querySelectorAll('.no-print, .dialog-backdrop, .chart-overlay').forEach((node) => node.remove())
      const exportBackground = getComputedStyle(document.documentElement).getPropertyValue('--export-background').trim()
      Object.assign(exportRoot.style, {
        position: 'fixed',
        left: '-20000px',
        top: '0',
        width: `${Math.ceil(target.scrollWidth)}px`,
        maxWidth: 'none',
        minWidth: `${Math.ceil(target.scrollWidth)}px`,
        background: exportBackground,
        zIndex: '-1',
        pointerEvents: 'none',
        overflow: 'visible',
      })
      document.body.append(exportRoot)

      const exportWidth = Math.ceil(exportRoot.scrollWidth)
      const exportHeight = Math.ceil(exportRoot.scrollHeight)
      const canvas = await html2canvas(exportRoot, {
        scale: 2,
        backgroundColor: exportBackground,
        useCORS: true,
        logging: false,
        width: exportWidth,
        height: exportHeight,
        windowWidth: exportWidth,
        windowHeight: exportHeight,
        scrollX: 0,
        scrollY: 0,
      })

      const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4', compress: true })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const pageHeightPx = Math.floor((canvas.width * pageHeight) / pageWidth)
      const totalPages = Math.max(1, Math.ceil(canvas.height / pageHeightPx))

      for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
        if (pageIndex > 0) {
          pdf.addPage()
        }

        const sliceTop = pageIndex * pageHeightPx
        const sliceHeight = Math.min(pageHeightPx, canvas.height - sliceTop)
        const pageCanvas = document.createElement('canvas')
        pageCanvas.width = canvas.width
        pageCanvas.height = sliceHeight

        const pageContext = pageCanvas.getContext('2d')
        if (!pageContext) {
          throw new Error('Canvas is unavailable')
        }

        pageContext.fillStyle = exportBackground
        pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
        pageContext.drawImage(canvas, 0, sliceTop, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight)

        const pageImageHeight = (sliceHeight * pageWidth) / canvas.width
        const pageImage = pageCanvas.toDataURL('image/jpeg', 0.92)
        pdf.addImage(pageImage, 'JPEG', 0, 0, pageWidth, pageImageHeight, undefined, 'FAST')
      }

      const blob = pdf.output('blob')
      const fileName = `${buildSafeExportName(options.fileBaseName.value)}-report.pdf`
      return new File([blob], fileName, { type: 'application/pdf' })
    } finally {
      exportRoot?.remove()
    }
  }

  async function downloadReportPdf() {
    if (exporting.value) {
      return
    }

    exporting.value = true
    try {
      downloadFile(await createReportPdfFile())
      toast.success(t('chat.pdfReady'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('chat.pdfReady'))
    } finally {
      exporting.value = false
    }
  }

  async function sendReportPdfToTelegramChat() {
    if (auth.user?.telegramSessionActive === false) {
      toast.warning(t('dashboard.sessionInactive'))
      return
    }
    if (exporting.value) {
      return
    }

    exporting.value = true
    try {
      const file = await createReportPdfFile()
      await useApiEndpoint('POST /api/v1/parse/share-report', {
        body: {
          chatId: options.chatId.value,
          fileName: file.name,
          mimeType: file.type,
          base64: await fileToBase64(file),
        },
      })

      options.shareOpen.value = false
      toast.success(t('chat.sentToTelegram'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('chat.sentToTelegram'))
    } finally {
      exporting.value = false
    }
  }

  return { downloadReportPdf, exporting, sendReportPdfToTelegramChat }
}
