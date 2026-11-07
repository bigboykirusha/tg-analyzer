/** Over this many pixels after the poster's edge reaches the bar, the bar turns from poster into glass. */
const BLEND_PX = 56

/**
 * The toolbar over a page: at the top of a report it is the poster (the name is on the poster, so the
 * bar shows only its controls); when the poster's edge passes under it, the bar keeps the colour for a
 * moment and melts into glass while the screen's title rises into the bar — Apple's large title, as one continuous
 * material driven by the scroll, not a switch at one pixel.
 *
 * `progress` is 0 over the poster and 1 once it has gone (or when the page has no poster); the bar
 * writes it to `--poster-progress`. `overPoster` flips the control colours at the midpoint.
 */
export function usePosterHeader() {
  const scrolled = ref(false)
  const progress = ref(1)
  const hasPoster = ref(false)
  const overPoster = computed(() => hasPoster.value && progress.value < 0.5)
  let observer: ResizeObserver | null = null
  let frame = 0
  let poster: HTMLElement | null = null
  let bar: HTMLElement | null = null

  function find() {
    poster = document.querySelector<HTMLElement>('[data-poster]')
    bar = document.querySelector<HTMLElement>('[data-toolbar]')
  }

  function update() {
    frame = 0
    scrolled.value = window.scrollY > 4
    if (!poster?.isConnected) find()
    hasPoster.value = Boolean(poster)
    if (!poster) {
      progress.value = 1
      return
    }
    const left = poster.getBoundingClientRect().bottom - (bar?.offsetHeight ?? 64)
    // While the poster is under the bar, the bar is the poster: no lighter band over it. Once its edge
    // has passed under, the colour the bar carries melts into glass over the next stretch.
    progress.value = Math.min(1, Math.max(0, -left / BLEND_PX))
  }

  /** One read per frame, however many scroll events arrive. */
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update)
  }

  onMounted(() => {
    find()
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    // The poster arrives with the report; the page growing is the signal to look again.
    observer = new ResizeObserver(() => {
      find()
      schedule()
    })
    observer.observe(document.body)
  })
  onBeforeUnmount(() => {
    cancelAnimationFrame(frame)
    window.removeEventListener('scroll', schedule)
    observer?.disconnect()
  })
  const route = useRoute()
  watch(
    () => route.fullPath,
    () =>
      nextTick(() => {
        find()
        update()
      }),
  )

  return { scrolled, overPoster, progress, hasPoster }
}
