import { useEffect, useRef } from 'react'
import { useStage } from '../state/useStage'
import { MAX, TIERS } from '../utils/quality'

const PETAL_URL = '/textures/petal.png'
const PETAL_ASPECT = 347 / 512

// Lightweight 2D petals (the same artwork) drifting left → right out of the deep-pink
// top-left corner.
export default function PetalOverlay() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.src = PETAL_URL
    let w = 0
    let h = 0
    let raf = 0
    let last = performance.now()

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const reset = (p, initial) => {
      p.x = -40 + Math.random() * w * 0.25
      p.y = -40 - Math.random() * 90
      if (initial) {
        const k = Math.random()
        p.x += k * w * 0.8
        p.y += k * h * 0.9
      }
      p.vx = 35 + Math.random() * 45
      p.vy = 26 + Math.random() * 30
      p.size = 14 + Math.random() * 14
      p.rot = Math.random() * Math.PI * 2
      p.spin = (Math.random() - 0.5) * 2.4
      p.phase = Math.random() * 100
      p.alpha = 0.7 + Math.random() * 0.3
      return p
    }
    const petals = Array.from({ length: MAX.overlay }, () => reset({}, true))

    const frame = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const t = now / 1000
      const count = TIERS[useStage.getState().tier].overlay
      ctx.clearRect(0, 0, w, h)
      if (img.complete && img.naturalWidth) {
        for (let i = 0; i < count; i++) {
          const p = petals[i]
          p.x += (p.vx + Math.sin(t * 1.2 + p.phase) * 22) * dt
          p.y += (p.vy + Math.cos(t * 0.9 + p.phase) * 8) * dt
          p.rot += p.spin * dt
          if (p.x > w + 40 || p.y > h + 40) reset(p, false)
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate(p.rot)
          ctx.scale(Math.cos(t * 2.2 + p.phase), 1) // flips like a tumbling petal
          ctx.globalAlpha = p.alpha
          ctx.drawImage(img, (-p.size * PETAL_ASPECT) / 2, -p.size / 2, p.size * PETAL_ASPECT, p.size)
          ctx.restore()
        }
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-10 h-full w-full" />
}
