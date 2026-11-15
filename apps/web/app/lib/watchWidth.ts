/** One observer for every pulse on the page: a tile per report would otherwise mean one each. */
type WidthCallback = (width: number) => void
const widths = new WeakMap<Element, WidthCallback>()
let sharedObserver: ResizeObserver | undefined
export function watchWidth(el: Element, callback: WidthCallback) {
  sharedObserver ??= new ResizeObserver((entries) => {
    for (const entry of entries) widths.get(entry.target)?.(entry.contentRect.width)
  })
  widths.set(el, callback)
  sharedObserver.observe(el)
  return () => {
    sharedObserver?.unobserve(el)
    widths.delete(el)
  }
}
