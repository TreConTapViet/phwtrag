// Shared mutable pointer state, read inside animation loops without re-rendering React.
// tilt*: drives the camera parallax (mouse position, or accumulated swipe on touch).
// ndc*:  where the finger/cursor actually is, used to push grass and flowers.
export const pointer = { tiltX: 0, tiltY: 0, ndcX: 0, ndcY: 0, has: false }

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))
let started = false

export function startPointerTracking() {
  if (started) return
  started = true

  const setNdc = (x, y) => {
    pointer.ndcX = (x / window.innerWidth) * 2 - 1
    pointer.ndcY = -((y / window.innerHeight) * 2 - 1)
    pointer.has = true
  }

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType === 'touch') return
      setNdc(e.clientX, e.clientY)
      pointer.tiltX = pointer.ndcX
      pointer.tiltY = pointer.ndcY
    },
    { passive: true },
  )

  let lastX = 0
  let lastY = 0
  window.addEventListener(
    'touchstart',
    (e) => {
      const t = e.touches[0]
      lastX = t.clientX
      lastY = t.clientY
      setNdc(t.clientX, t.clientY)
    },
    { passive: true },
  )
  window.addEventListener(
    'touchmove',
    (e) => {
      const t = e.touches[0]
      pointer.tiltX = clamp(pointer.tiltX + ((t.clientX - lastX) / window.innerWidth) * 2.4, -1, 1)
      pointer.tiltY = clamp(pointer.tiltY - ((t.clientY - lastY) / window.innerHeight) * 1.2, -1, 1)
      lastX = t.clientX
      lastY = t.clientY
      setNdc(t.clientX, t.clientY)
    },
    { passive: true },
  )
  window.addEventListener('touchend', () => (pointer.has = false), { passive: true })
}
