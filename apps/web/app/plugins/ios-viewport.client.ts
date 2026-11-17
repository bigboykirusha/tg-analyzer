/**
 * iOS 26 Safari (and a page added to the Home Screen) can keep the viewport shrunk after the keyboard has gone: fixed
 * things at the bottom — home's bar, a sheet — then hang a keyboard's height above the screen's edge (17.11). When a
 * field loses the focus and no other field takes it, the page scrolls to where it already is, which makes Safari lay
 * the viewport out again. Elsewhere the call changes nothing.
 */
const editable = (element: Element | null) =>
  element instanceof HTMLElement && (element.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(element.tagName))

export default defineNuxtPlugin(() => {
  let timer: ReturnType<typeof setTimeout> | undefined
  document.addEventListener(
    'focusout',
    (event) => {
      if (!editable(event.target as Element | null)) return
      clearTimeout(timer)
      // After the keyboard's own animation; a field focused meanwhile keeps it up.
      timer = setTimeout(() => {
        if (editable(document.activeElement)) return
        window.scrollTo(window.scrollX, window.scrollY)
      }, 300)
    },
    true,
  )
})
