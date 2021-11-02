interface TextAreaData {
  previousValue?: string
  previousHeight?: string
  x?: number
  y?: number
  isUserResized?: boolean
}

const map = new WeakMap<HTMLTextAreaElement, TextAreaData>()

// Check if textarea has been resized by the user.
function onUserResize(event: MouseEvent) {
  const textarea = event.currentTarget as HTMLTextAreaElement
  const options = map.get(textarea) || {}
  if (options.x !== event.clientX || options.y !== event.clientY) {
    const newHeight = textarea.style.height
    if (options.previousHeight && options.previousHeight !== newHeight) {
      options.isUserResized = true
      textarea.style.maxHeight = ''
      textarea.removeEventListener('mousemove', onUserResize)
    }
    options.previousHeight = newHeight
  }

  options.x = event.clientX
  options.y = event.clientY
  map.set(textarea, options)
}

function overflowOffset(textarea: HTMLElement) {
  let offsetTop = 0
  let el = textarea

  while (el !== textarea.ownerDocument.body && el !== null) {
    offsetTop += el.offsetTop || 0
    el = el.offsetParent as HTMLTextAreaElement
  }

  const top = offsetTop - textarea.ownerDocument.defaultView!.pageYOffset
  const bottom = textarea.ownerDocument.documentElement.clientHeight - (top + textarea.offsetHeight)
  return {top, bottom}
}

export default function autosize(textarea: HTMLTextAreaElement, {viewportMarginBottom = 100} = {}) {
  function sizeToFit() {
    if (map.get(textarea)?.isUserResized) return
    if (textarea.value === map.get(textarea)?.previousValue) return
    if (textarea.offsetWidth <= 0 && textarea.offsetHeight <= 0) return

    const {top, bottom} = overflowOffset(textarea)
    if (top < 0 || bottom < 0) {
      return
    }

    const textareaStyle = getComputedStyle(textarea)

    const topBorderWidth = Number(textareaStyle.borderTopWidth.replace(/px/, ''))
    const bottomBorderWidth = Number(textareaStyle.borderBottomWidth.replace(/px/, ''))

    const isBorderBox = textareaStyle.boxSizing === 'border-box'
    const borderAddOn = isBorderBox ? topBorderWidth + bottomBorderWidth : 0

    const maxHeight = Number(textareaStyle.height.replace(/px/, '')) + bottom
    const adjustedViewportMarginBottom = bottom < viewportMarginBottom ? bottom : viewportMarginBottom
    textarea.style.maxHeight = `${maxHeight - adjustedViewportMarginBottom}px`

    const scrollPosition = document.documentElement.scrollTop

    const container = textarea.parentElement
    if (container instanceof HTMLElement) {
      const containerHeight = container.style.height
      container.style.height = getComputedStyle(container).height
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight + borderAddOn}px`
      container.style.height = containerHeight
      const options = map.get(textarea) || {}
      options.previousHeight = textarea.style.height
      document.documentElement.scrollTop = scrollPosition
    }

    const options = map.get(textarea) || {}
    options.previousValue = textarea.value
    map.set(textarea, options)
  }

  function onFormReset() {
    map.set(textarea, {})

    textarea.style.height = ''
    textarea.style.maxHeight = ''
  }

  textarea.addEventListener('mousemove', onUserResize)
  textarea.addEventListener('input', sizeToFit)
  textarea.addEventListener('change', sizeToFit)
  const form = textarea.form
  if (form) form.addEventListener('reset', onFormReset)
  if (textarea.value) sizeToFit()

  return {
    unsubscribe() {
      textarea.removeEventListener('mousemove', onUserResize)
      textarea.removeEventListener('input', sizeToFit)
      textarea.removeEventListener('change', sizeToFit)
      if (form) form.removeEventListener('reset', onFormReset)
    }
  }
}
