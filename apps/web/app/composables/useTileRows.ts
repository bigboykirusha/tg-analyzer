import type { Ref } from 'vue'

/** The half tile's side padding on a phone (`--space-4`, HomeCard) — the room a name has is the tile minus two of these. */
const HALF_TILE_PADDING = 16

/**
 * Home tiles on a phone stand two to a row; a name that does not fit one line of a half tile takes the whole row
 * (the owner's rule, 13.11), and so does a tile left without a neighbour — the order of the reports is kept and
 * no cell stays empty. Names are measured in the tile's own type (`--text-h3`), so the answer is known before
 * the tiles are drawn and nothing jumps.
 */
export function useTileRows<T>(items: () => T[], title: (item: T) => string, grid: Ref<HTMLElement | null>) {
  const width = ref(0)
  const gap = ref(12)
  /** Bumped when the web font arrives: a name measured in the fallback font is measured again. */
  const fontEpoch = ref(0)
  let observer: ResizeObserver | null = null
  let context: CanvasRenderingContext2D | null = null
  let tracking = 0

  function read(element: HTMLElement) {
    width.value = element.clientWidth
    gap.value = parseFloat(getComputedStyle(element).columnGap) || 0
  }

  watch(
    grid,
    (element) => {
      observer?.disconnect()
      if (!element || typeof ResizeObserver === 'undefined') return
      read(element)
      observer = new ResizeObserver(() => read(element))
      observer.observe(element)
    },
    { immediate: true, flush: 'post' },
  )

  onMounted(() => {
    const style = getComputedStyle(document.documentElement)
    const role = style.getPropertyValue('--text-h3').trim()
    const weight = role.match(/^\d+/)?.[0] ?? '500'
    const size = parseFloat(role.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? '20')
    const family = style.getPropertyValue('--font-sans').trim() || 'sans-serif'
    context = document.createElement('canvas').getContext('2d')
    // A canvas does not read var(): the role's weight and size with the resolved family.
    if (context) context.font = `${weight} ${size}px ${family}`
    tracking = (parseFloat(style.getPropertyValue('--tracking-h3')) || 0) * size
    fontEpoch.value += 1
    void document.fonts?.ready.then(() => (fontEpoch.value += 1))
  })
  onBeforeUnmount(() => observer?.disconnect())

  /** The room a name has in a half tile; before the grid is measured, the screen minus the page's gutters. */
  const room = computed(() => {
    const full = width.value || (import.meta.client ? window.innerWidth - 32 : 0)
    return (full - gap.value) / 2 - HALF_TILE_PADDING * 2
  })

  function fits(text: string) {
    // Read so that the answer follows the font: a canvas does not report when its font has loaded.
    void fontEpoch.value
    if (!context) return true
    return context.measureText(text).width + tracking * [...text].length <= room.value
  }

  return computed(() => {
    const list = items()
    const short = list.map((item) => fits(title(item)))
    const rows: { item: T; wide: boolean }[] = []
    for (let index = 0; index < list.length; index += 1) {
      const pair = short[index] && index + 1 < list.length && short[index + 1]
      if (pair) {
        rows.push({ item: list[index]!, wide: false }, { item: list[index + 1]!, wide: false })
        index += 1
      } else rows.push({ item: list[index]!, wide: true })
    }
    return rows
  })
}
