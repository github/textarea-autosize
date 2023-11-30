export default function autosize(textarea, {viewportMarginBottom = 100} = {}) {
  let previousValue = null
  let isUserResized = false

  let x
  let y
  let height

  function onUserResize(event) {
    if (x !== event.clientX || y !== event.clientY) {
      const newHeight = textarea.style.height
      if (height && height !== newHeight) {
        isUserResized = true
        textarea.style.maxHeight = ''
        textarea.removeEventListener('mousemove', onUserResize)
      }
      height = newHeight
    }

    x = event.clientX
    y = event.clientY
  }

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

    const {top, bottom} = overflowOffset()
    if (top < 0 || bottom < 0) {
      return
    }

    const textareaStyle = getComputedStyle(textarea)

    const topBorderWidth = Math.ceil(parseFloat(textareaStyle.borderTopWidth))
    const bottomBorderWidth = Math.ceil(parseFloat(textareaStyle.borderBottomWidth))

    const isBorderBox = textareaStyle.boxSizing === 'border-box'
    const borderAddOn = isBorderBox ? topBorderWidth + bottomBorderWidth : 0

    const maxHeight = parseFloat(textareaStyle.height) + bottom
    const adjustedViewportMarginBottom = bottom < viewportMarginBottom ? bottom : viewportMarginBottom
    textarea.style.maxHeight = `${maxHeight - adjustedViewportMarginBottom}px`

    const container = textarea.parentElement
    if (container instanceof HTMLElement) {
      const containerHeight = container.style.height
      container.style.height = getComputedStyle(container).height
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight + borderAddOn}px`
      container.style.height = containerHeight
      height = textarea.style.height
    }

    previousValue = textarea.value
  }

  function onFormReset() {
    isUserResized = false
    textarea.style.height = ''
    textarea.style.maxHeight = ''
  }

  textarea.addEventListener('mousemove', onUserResize)
  textarea.addEventListener('input', sizeToFit)
  textarea.addEventListener('change', sizeToFit)
  textarea.addEventListener('paste', sizeToFit)
  const form = textarea.form
  if (form) form.addEventListener('reset', onFormReset)
  if (textarea.value) sizeToFit()

  return {
    unsubscribe() {
      textarea.removeEventListener('mousemove', onUserResize)
      textarea.removeEventListener('input', sizeToFit)
      textarea.removeEventListener('change', sizeToFit)
      textarea.removeEventListener('paste', sizeToFit)
      if (form) form.removeEventListener('reset', onFormReset)
    }
  }
}
