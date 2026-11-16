import type { ReportSummaryDto } from '@tg-analyzer/shared'

/** One stop of the chapter strip: the id of the part on the page (`chapter-<id>`) and its name. */
export interface Chapter {
  id: string
  label: string
}

/** Listeners and the one measured state are shared by every strip on the page (a phone's and a computer's). */
let users = 0
let frame = 0
let stop: (() => void) | null = null
/** After a tap the tapped chapter stays current while the page scrolls to it, not flickering through the ones it passes. */
let holdUntil = 0

/**
 * The chapters of an open report: «Главное», the parts under it — whichever of them the page actually drew — and
 * the one the reader is in now. The strip (`ReportChapters`) is a phone's row under the poster and a computer's
 * middle of the bar; both read this, so they always agree. A part is current once its title has come up to the
 * edge it scrolls to (the page's `scroll-padding-top` and its own `scroll-margin-top`, the same place a tap on the strip brings it).
 */
export function useReportChapters(summary: () => ReportSummaryDto) {
  const { t } = useI18n()
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const active = useState('report-chapter', () => '')
  const drawn = useState<string[]>('report-chapters-drawn', () => [])

  const all = computed<Chapter[]>(() => {
    const { type, title } = summary()
    if (type === 'group')
      return [
        { id: 'people', label: t('group.tabs.people') },
        { id: 'talk', label: t('group.tabs.talk') },
        { id: 'time', label: t('report.tabs.time') },
        { id: 'words', label: t('report.tabs.words') },
      ]
    return [
      { id: 'highlights', label: t('report.highlights.title') },
      { id: 'together', label: t('report.tabs.withName', { name: title }) },
      { id: 'time', label: t('report.tabs.time') },
      { id: 'talk', label: t('report.tabs.talk') },
      { id: 'words', label: t('report.tabs.words') },
    ]
  })
  /** Only the parts that are on the page: a short chat has no «Главное», a link without words no «О чём». */
  const chapters = computed(() => all.value.filter((item) => drawn.value.includes(item.id)))

  function measure() {
    frame = 0
    const present = all.value.filter((item) => document.getElementById(`chapter-${item.id}`))
    const ids = present.map((item) => item.id)
    if (ids.join() !== drawn.value.join()) drawn.value = ids
    // The edge a part scrolls to: the page's own scroll padding (under the bar) and the part's margin (under the strip).
    const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0
    let current = ids[0] ?? ''
    for (const id of ids) {
      const element = document.getElementById(`chapter-${id}`)
      if (!element) continue
      const edge = (Number.parseFloat(getComputedStyle(element).scrollMarginTop) || 0) + padding
      // A hair of slack, so a part reached by a tap is current the moment it has stopped.
      if (element.getBoundingClientRect().top <= edge + 2) current = id
    }
    // At the very bottom the last part is current even when it is too short to reach the edge.
    if (ids.length && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2)
      current = ids[ids.length - 1] ?? current
    if (current !== active.value && performance.now() > holdUntil) active.value = current
  }
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(measure)
  }

  onMounted(() => {
    if (!users++) {
      window.addEventListener('scroll', schedule, { passive: true })
      window.addEventListener('resize', schedule)
      // The parts arrive with the report: the page growing is the signal to look again.
      const observer = new ResizeObserver(schedule)
      observer.observe(document.body)
      stop = () => {
        window.removeEventListener('scroll', schedule)
        window.removeEventListener('resize', schedule)
        observer.disconnect()
        cancelAnimationFrame(frame)
        frame = 0
      }
    }
    schedule()
  })
  onBeforeUnmount(() => {
    if (!--users) {
      stop?.()
      stop = null
      drawn.value = []
      active.value = ''
    }
  })

  function go(id: string) {
    const element = document.getElementById(`chapter-${id}`)
    if (!element) return
    holdUntil = performance.now() + (reduced.value ? 100 : 900)
    element.scrollIntoView({ behavior: reduced.value ? 'auto' : 'smooth', block: 'start' })
    // The part takes the focus too, so Tab and a screen reader go on from the chapter, not from the strip.
    element.focus({ preventScroll: true })
    active.value = id
    // Once the page has settled, look again: it may have stopped short of the part (the page's end).
    setTimeout(schedule, reduced.value ? 150 : 1000)
  }

  return { chapters, active, go }
}
