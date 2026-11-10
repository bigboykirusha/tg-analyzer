/** Over this many pixels after the poster's edge reaches the bar, the bar turns from poster into glass. */
const BLEND_PX = 56
/** Over the first this-many pixels of scroll the poster's big name goes under the bar and the capsule rises. */
const TITLE_PX = 56

const THEME_COLOR_NEUTRAL = { light: '#f2f2f5', dark: '#000000' }

/**
 * The colour of the browser's own chrome (the status strip above the page) has to say what is under it.
 * Safari 26 ignores `theme-color` and tints the strip from the `html` background and from a fixed or sticky
 * bar at the top edge; older Safari and Chrome read `theme-color`. So while the bar is the poster, all three
 * say «poster colour»; the moment it is not, they all go back to neutral — in steps, never through a
 * half-way colour that a browser could sample and keep.
 */
function syncBrowserChrome() {
  if (!import.meta.client) return () => undefined
  let last = ''
  const root = document.documentElement
  const meta = () => document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  function apply(over: boolean) {
    const dark = root.dataset.theme === 'dark'
    // The person's hue is set where the report is, not always on <html>: read the token off the poster itself.
    const posterEl = over ? document.querySelector<HTMLElement>('[data-poster]') : null
    const poster = posterEl ? getComputedStyle(posterEl).getPropertyValue('--poster').trim() : ''
    const tint = poster || THEME_COLOR_NEUTRAL[dark ? 'dark' : 'light']
    if (tint === last) return
    last = tint
    // The canvas behind the page: what a bounce at the top shows, and the page colour Safari 26 samples.
    root.style.backgroundColor = poster
    const tag = meta()
    if (tag) tag.content = tint
  }
  onBeforeUnmount(() => apply(false))
  return apply
}

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
  const applyChrome = syncBrowserChrome()
  const scrolled = ref(false)
  const progress = ref(1)
  /** 0 at the top of a report (the name is on the poster), 1 once the name has gone under the bar. */
  const titleProgress = ref(1)
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
      titleProgress.value = 1
      applyChrome(false)
      return
    }
    titleProgress.value = Math.min(1, Math.max(0, window.scrollY / TITLE_PX))
    const left = poster.getBoundingClientRect().bottom - (bar?.offsetHeight ?? 64)
    // While the poster is under the bar, the bar is the poster: no lighter band over it. Once its edge
    // has passed under, the colour the bar carries melts into glass over the next stretch.
    progress.value = Math.min(1, Math.max(0, -left / BLEND_PX))
    applyChrome(overPoster.value)
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

  return { scrolled, overPoster, progress, titleProgress, hasPoster }
}
