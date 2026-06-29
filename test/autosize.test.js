import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import autosize from '../src/index.js'

let form
let textarea
let cleanup

function dispatchInput(el) {
  el.dispatchEvent(new Event('input', {bubbles: true}))
}

function waitFor(fn, {timeout = 1000} = {}) {
  return vi.waitFor(fn, {timeout})
}

beforeEach(() => {
  form = document.createElement('form')
  textarea = document.createElement('textarea')

  // Give the textarea a stable, known width so layout is deterministic.
  textarea.style.width = '300px'
  textarea.style.boxSizing = 'border-box'
  // Ensure the textarea starts in the viewport so overflowOffset works.
  form.style.position = 'fixed'
  form.style.top = '0'
  form.style.left = '0'

  form.appendChild(textarea)
  document.body.appendChild(form)
})

afterEach(() => {
  if (cleanup) {
    cleanup()
    cleanup = null
  }
  form.remove()
})

describe('grows on input', () => {
  it('increases height when multi-line content is typed', async () => {
    const {unsubscribe} = autosize(textarea)
    cleanup = unsubscribe

    const singleLineHeight = textarea.clientHeight

    textarea.value = 'line1\nline2\nline3\nline4\nline5'
    dispatchInput(textarea)

    expect(parseInt(textarea.style.height)).toBeGreaterThan(singleLineHeight)
  })
})

describe('shrinks on delete', () => {
  it('reduces height when content is removed', async () => {
    const {unsubscribe} = autosize(textarea)
    cleanup = unsubscribe

    textarea.value = 'line1\nline2\nline3\nline4\nline5'
    dispatchInput(textarea)
    const grownHeight = parseInt(textarea.style.height)

    textarea.value = 'short'
    dispatchInput(textarea)

    expect(parseInt(textarea.style.height)).toBeLessThan(grownHeight)
  })
})

describe('respects min-height', () => {
  it('keeps rendered height at least min-height with short content', async () => {
    textarea.style.minHeight = '120px'
    const {unsubscribe} = autosize(textarea)
    cleanup = unsubscribe

    textarea.value = 'hi'
    dispatchInput(textarea)

    // The rendered height must be at least the min-height.
    // Use getComputedStyle().height (not clientHeight) because clientHeight
    // excludes borders, which would make it smaller than min-height with border-box.
    expect(parseFloat(getComputedStyle(textarea).height)).toBeGreaterThanOrEqual(120)
  })

  it('guards Task 1 fix: maxHeight is not capped below the min-height-driven computed height', async () => {
    // This test specifically guards the regression where the library used its
    // last-written inline height (e.g. "40px") instead of the live computed
    // height (e.g. "120px" after min-height clamping) when deriving maxHeight.
    // With the pre-fix logic, style.maxHeight would be capped lower than the
    // actual rendered height, which is incorrect.
    textarea.style.minHeight = '120px'
    const {unsubscribe} = autosize(textarea)
    cleanup = unsubscribe

    textarea.value = 'hi'
    dispatchInput(textarea)

    // maxHeight should be at least the computed/rendered height (>= 120px after
    // min-height clamping), not capped to an incorrectly small value.
    const maxHeight = parseFloat(textarea.style.maxHeight)
    const computedHeight = parseFloat(getComputedStyle(textarea).height)
    expect(maxHeight).toBeGreaterThanOrEqual(computedHeight)
  })
})

describe('drag-resize disables autosize', () => {
  it('detects user resize, latches isUserResized, and clears maxHeight', async () => {
    const {unsubscribe} = autosize(textarea)
    cleanup = unsubscribe

    // Trigger initial sizing so the library records a height.
    textarea.value = 'line1\nline2\nline3'
    dispatchInput(textarea)
    const autosizedHeight = textarea.style.height

    // Simulate a user drag-resize by setting a different inline height directly.
    const differentHeight = `${parseInt(autosizedHeight) + 50}px`
    textarea.style.height = differentHeight

    // ResizeObserver fires asynchronously; wait for the library to react.
    await waitFor(() => {
      expect(textarea.style.maxHeight).toBe('')
    })

    // After the library detects the drag, further input should not change height.
    const heightAfterDetection = textarea.style.height
    textarea.value = 'line1\nline2\nline3\nline4\nline5'
    dispatchInput(textarea)

    expect(textarea.style.height).toBe(heightAfterDetection)
  })
})

describe('form reset re-enables autosize', () => {
  it('re-enables sizing after a drag-resize when form is reset', async () => {
    const {unsubscribe} = autosize(textarea)
    cleanup = unsubscribe

    // Grow the textarea and then simulate user drag-resize.
    textarea.value = 'line1\nline2\nline3'
    dispatchInput(textarea)
    const autosizedHeight = textarea.style.height
    textarea.style.height = `${parseInt(autosizedHeight) + 50}px`

    // Wait for the resize observer to detect the user resize.
    await waitFor(() => {
      expect(textarea.style.maxHeight).toBe('')
    })

    // Reset the form, which should re-enable autosize.
    form.dispatchEvent(new Event('reset', {bubbles: true}))

    expect(textarea.style.height).toBe('')
    expect(textarea.style.maxHeight).toBe('')

    // Subsequent input should grow the textarea again.
    textarea.value = 'line1\nline2\nline3\nline4\nline5'
    dispatchInput(textarea)

    expect(parseInt(textarea.style.height)).toBeGreaterThan(0)
  })
})

describe('unsubscribe cleanup', () => {
  it('stops resizing after unsubscribe is called', async () => {
    const {unsubscribe} = autosize(textarea)

    textarea.value = 'line1\nline2\nline3'
    dispatchInput(textarea)
    const heightBeforeUnsubscribe = textarea.style.height

    unsubscribe()

    // Changing content and dispatching input should have no effect.
    textarea.value = 'line1\nline2\nline3\nline4\nline5\nline6\nline7'
    dispatchInput(textarea)

    expect(textarea.style.height).toBe(heightBeforeUnsubscribe)
  })
})
