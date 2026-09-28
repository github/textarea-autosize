export default function autosize(textarea, {viewportMarginBottom = 100} = {}) {
  let previousValue = null
  let isUserResized = false

  // The last height string set by the library (e.g. "120px"). Tracked so we can
  // distinguish library-initiated resizes from user-initiated drag resizes.
  let height = null

  // Cached border/box-sizing values that rarely change between keystrokes.
  // null means the cache is uninitialized or has been invalidated.
  let cachedBorderAddOn = null

  const document = textarea.ownerDocument
  const documentElement = document.documentElement

  function overflowOffset() {
    let offsetTop = 0
    let el = textarea

    while (el !== document.body && el !== null) {
      offsetTop += el.offsetTop || 0
      el = el.offsetParent
    }

    const top = offsetTop - document.defaultView.pageYOffset
    const bottom = documentElement.clientHeight - (top + textarea.offsetHeight)
    return {top, bottom}
  }

  function sizeToFit() {
    if (isUserResized) return
    if (textarea.value === previousValue) return
    if (textarea.offsetWidth <= 0 && textarea.offsetHeight <= 0) return

    // -- READS: all DOM reads are batched before any writes to avoid forced
    //    synchronous layout recalculations (layout thrashing). --

    const {top, bottom} = overflowOffset()
    if (top < 0 || bottom < 0) {
      return
    }

    // Repopulate the border/box-sizing cache on first call or after invalidation.
    // Caching avoids a redundant getComputedStyle call on every keystroke.
    if (cachedBorderAddOn === null) {
      const s = getComputedStyle(textarea)
      const topBorderWidth = Math.ceil(parseFloat(s.borderTopWidth))
      const bottomBorderWidth = Math.ceil(parseFloat(s.borderBottomWidth))
      cachedBorderAddOn = s.boxSizing === 'border-box' ? topBorderWidth + bottomBorderWidth : 0
    }

    // maxHeight must derive from the *rendered* height (post min/max-height clamping),
    // so read computed height here; only the border add-on is safely cached.
    const parsedHeight = parseFloat(getComputedStyle(textarea).height)

    // Read the container's inline and computed heights now, before any writes,
    // so there is no read-after-write that would force an extra layout recalculation.
    const container = textarea.parentElement
    let containerInlineHeight = null
    let containerComputedHeight = null
    if (container instanceof HTMLElement) {
      containerInlineHeight = container.style.height
      containerComputedHeight = getComputedStyle(container).height
    }

    // Pure math — no DOM access.
    const adjustedViewportMarginBottom = bottom < viewportMarginBottom ? bottom : viewportMarginBottom
    const maxHeight = parsedHeight + bottom

    // -- WRITES --

    // Always apply the maxHeight cap (matches original behaviour: maxHeight is
    // set regardless of whether a parent container exists).
    textarea.style.maxHeight = `${maxHeight - adjustedViewportMarginBottom}px`

    if (container instanceof HTMLElement) {
      // Pin the container's height before modifying the textarea so that the
      // scrollHeight measurement below is not skewed by the parent reflowing.
      container.style.height = containerComputedHeight

      // Setting height to 'auto' is the only way to measure the textarea's
      // natural content height via scrollHeight. This write-then-read is the
      // single unavoidable forced layout recalculation; it is kept isolated to
      // minimise additional reflows.
      textarea.style.height = 'auto'
      const scrollHeight = textarea.scrollHeight

      textarea.style.height = `${scrollHeight + cachedBorderAddOn}px`
      container.style.height = containerInlineHeight

      // Keep height in sync so the ResizeObserver (or fallback) can distinguish
      // library-initiated resizes from user-initiated drag resizes.
      height = textarea.style.height
    }

    previousValue = textarea.value
  }

  function onFormReset() {
    isUserResized = false
    // Clear height and the style cache so the next sizeToFit re-reads from the
    // DOM rather than using stale values after the form has been cleared.
    height = null
    cachedBorderAddOn = null
    textarea.style.height = ''
    textarea.style.maxHeight = ''
  }

  // -- User-resize detection --
  //
  // A ResizeObserver is cheaper than an always-on mousemove listener because it
  // fires only when dimensions actually change, not on every pointer movement.
  // The fallback (for environments without ResizeObserver) gates a mousemove
  // handler behind mousedown/mouseup so it is only active during an active drag.

  let cleanupResizeDetection = () => {}

  if (typeof ResizeObserver !== 'undefined') {
    const resizeObserver = new ResizeObserver(() => {
      // Only act once the library has set a height, and stop once a user resize
      // has already been detected — no further work is needed after that point.
      if (!height || isUserResized) return

      // If the textarea's inline height no longer matches what the library last
      // wrote, the change was not library-initiated — treat it as a user drag.
      const currentHeight = textarea.style.height
      if (currentHeight !== height) {
        // Invalidate the style cache: an external resize may indicate that CSS
        // has changed (e.g. a responsive breakpoint altered border widths).
        cachedBorderAddOn = null
        isUserResized = true
        textarea.style.maxHeight = ''
      }
    })
    resizeObserver.observe(textarea)
    cleanupResizeDetection = () => resizeObserver.disconnect()
  } else {
    // Fallback: attach mousemove only while a pointer button is held so the
    // high-frequency handler is not active during normal (non-drag) use.
    let lastClientX
    let lastClientY

    const onUserResize = event => {
      if (lastClientX !== event.clientX || lastClientY !== event.clientY) {
        const newHeight = textarea.style.height
        if (height && height !== newHeight) {
          isUserResized = true
          textarea.style.maxHeight = ''
          height = newHeight
        }
      }
      lastClientX = event.clientX
      lastClientY = event.clientY
    }

    const onMousedown = () => textarea.addEventListener('mousemove', onUserResize)
    const onMouseup = () => textarea.removeEventListener('mousemove', onUserResize)

    textarea.addEventListener('mousedown', onMousedown)
    // Listen for mouseup on the document so the mousemove handler is removed
    // even when the pointer is released outside the textarea during a drag.
    document.addEventListener('mouseup', onMouseup)
    cleanupResizeDetection = () => {
      textarea.removeEventListener('mousedown', onMousedown)
      document.removeEventListener('mouseup', onMouseup)
      // Remove mousemove too in case mouseup never fired (e.g. pointer left window).
      textarea.removeEventListener('mousemove', onUserResize)
    }
  }

  textarea.addEventListener('input', sizeToFit)
  textarea.addEventListener('change', sizeToFit)
  textarea.addEventListener('paste', sizeToFit)
  const form = textarea.form
  if (form) form.addEventListener('reset', onFormReset)
  if (textarea.value) sizeToFit()

  return {
    unsubscribe() {
      textarea.removeEventListener('input', sizeToFit)
      textarea.removeEventListener('change', sizeToFit)
      textarea.removeEventListener('paste', sizeToFit)
      if (form) form.removeEventListener('reset', onFormReset)
      cleanupResizeDetection()
    }
  }
}
