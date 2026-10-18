// Helpers for smooth, hand-drawn-looking SVG shapes.

const r1 = (v) => Math.round(v * 10) / 10

// Points sampled along a Catmull-Rom spline through `points` ([x, y] pairs).
export function catmull(points, perSegment) {
  const out = []
  const last = points.length - 1
  for (let i = 0; i < last; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(last, i + 2)]
    for (let s = 0; s < perSegment; s++) {
      const t = s / perSegment
      const t2 = t * t
      const t3 = t2 * t
      const at = (k) =>
        0.5 *
        (2 * p1[k] +
          (-p0[k] + p2[k]) * t +
          (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 +
          (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)
      out.push([at(0), at(1)])
    }
  }
  out.push([...points[last]])
  return out
}

// Point at fraction t (0–1) along a sampled polyline.
export function pointAt(pts, t) {
  const f = Math.min(0.9999, Math.max(0, t)) * (pts.length - 1)
  const i = Math.floor(f)
  const k = f - i
  return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]
}

// Cubic "C" segments of a smooth curve through pts (the path must already be at pts[0]).
export function smoothThrough(pts) {
  let d = ''
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    d += `C${r1(p1[0] + (p2[0] - p0[0]) / 6)} ${r1(p1[1] + (p2[1] - p0[1]) / 6)} ${r1(p2[0] - (p3[0] - p1[0]) / 6)} ${r1(p2[1] - (p3[1] - p1[1]) / 6)} ${r1(p2[0])} ${r1(p2[1])}`
  }
  return d
}

export const openPath = (pts) => `M${r1(pts[0][0])} ${r1(pts[0][1])}${smoothThrough(pts)}`

// A tapered stroke drawn as a filled outline: smooth on both sides with a rounded tip.
export function ribbon(pts, w0, w1) {
  const n = pts.length
  const left = []
  const right = []
  let tx = 0
  let ty = 0
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)]
    const b = pts[Math.min(n - 1, i + 1)]
    tx = b[0] - a[0]
    ty = b[1] - a[1]
    const len = Math.hypot(tx, ty) || 1
    tx /= len
    ty /= len
    const w = (w0 + (w1 - w0) * Math.pow(i / (n - 1), 0.85)) / 2
    left.push([pts[i][0] - ty * w, pts[i][1] + tx * w])
    right.push([pts[i][0] + ty * w, pts[i][1] - tx * w])
  }
  const tip = pts[n - 1]
  const cap = [tip[0] + tx * w1 * 0.9, tip[1] + ty * w1 * 0.9]
  const back = right.reverse()
  return `${openPath(left)}Q${r1(cap[0])} ${r1(cap[1])} ${r1(back[0][0])} ${r1(back[0][1])}${smoothThrough(back)}Z`
}
