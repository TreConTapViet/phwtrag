import { mulberry32 } from '../utils/random'

// The landscape lives in an SVG whose viewBox is W × 1000 (W = 1000 × screen aspect),
// so 1 unit = innerHeight / 1000 CSS pixels and the left/right edges are 0 and W.

const cubicAt = (c, t) => {
  const u = 1 - t
  return [0, 1].map((k) => u * u * u * c[0][k] + 3 * u * u * t * c[1][k] + 3 * u * t * t * c[2][k] + t * t * t * c[3][k])
}

// Main hill: from the bottom-left corner rising to the right (as in the sketch).
export function hillCurve(W, portrait) {
  return portrait
    ? [[-20, 880], [W * 0.3, 800], [W * 0.62, 770], [W + 20, 728]]
    : [[-20, 990], [W * 0.22, 800], [W * 0.5, 645], [W + 20, 560]]
}

// A paler hill further back, for depth.
export function farHillCurve(W, portrait) {
  return portrait
    ? [[-20, 800], [W * 0.35, 690], [W * 0.7, 690], [W + 20, 640]]
    : [[-20, 860], [W * 0.3, 640], [W * 0.62, 520], [W + 20, 455]]
}

export const curveD = (c) => `M${c[0][0]} ${c[0][1]}C${c[1].join(' ')} ${c[2].join(' ')} ${c[3].join(' ')}`
export const hillFillD = (c, W) => `${curveD(c)}L${W + 20} 1030L-20 1030Z`

// y of the curve at a given x (x is monotonic along these curves).
export function makeYAt(c) {
  const samples = Array.from({ length: 161 }, (_, i) => cubicAt(c, i / 160))
  return (x) => {
    if (x <= samples[0][0]) return samples[0][1]
    for (let i = 1; i < samples.length; i++) {
      if (samples[i][0] >= x) {
        const [x0, y0] = samples[i - 1]
        const [x1, y1] = samples[i]
        return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1)
      }
    }
    return samples[samples.length - 1][1]
  }
}

// Fallen petals carpeting the hillside: small and squashed near the crest (far away),
// bigger toward the bottom of the screen. Sorted far → near for correct overlap;
// `rank` (generation order, i.e. random) lets lower quality tiers keep an even subset.
export function buildCarpet(W, yAt, count) {
  const rand = mulberry32(33)
  const out = []
  for (let i = 0; i < count; i++) {
    const x = rand() * (W + 40) - 20
    const top = yAt(x)
    const depth = Math.pow(rand(), 1.5)
    const size = 11 + depth * 17 + rand() * 5
    out.push({
      x,
      y: top + 5 + depth * (1010 - top),
      size,
      rot: Math.round(rand() * 360),
      squash: 0.45 + rand() * 0.35 + depth * 0.15,
      opacity: 0.82 + rand() * 0.18,
      interactive: i % 4 === 0,
      rank: i,
    })
  }
  return out.sort((a, b) => a.y - b.y)
}

// Sparse grass clumps, like the sketch.
export function buildTufts(W, yAt, count) {
  const rand = mulberry32(9)
  const out = []
  for (let i = 0; i < count; i++) {
    const x = 20 + rand() * (W - 40)
    const top = yAt(x)
    const depth = Math.pow(rand(), 1.2)
    const h = 18 + depth * 26
    const blades = []
    const n = 4 + Math.floor(rand() * 3)
    for (let k = 0; k < n; k++) {
      const lean = ((k / (n - 1)) - 0.5) * 1.1 + (rand() - 0.5) * 0.3
      const bh = h * (0.7 + rand() * 0.45)
      const w = 2.2 + depth * 1.6
      const tx = Math.sin(lean) * bh * 0.7
      blades.push(
        `M${-w} 0Q${(tx * 0.35 - w * 0.4).toFixed(1)} ${(-bh * 0.55).toFixed(1)} ${tx.toFixed(1)} ${(-bh).toFixed(1)}Q${(tx * 0.35 + w * 0.6).toFixed(1)} ${(-bh * 0.5).toFixed(1)} ${w} 0Z`,
      )
    }
    out.push({
      x,
      y: top + 8 + depth * (1000 - top - 20),
      d: blades.join(''),
      dur: (2.6 + rand() * 1.8).toFixed(2),
      delay: (-rand() * 3).toFixed(2),
      rank: i,
    })
  }
  return out.sort((a, b) => a.y - b.y)
}

// A few whole blossoms lying on the grass.
export function buildFallenFlowers(W, yAt, count) {
  const rand = mulberry32(51)
  return Array.from({ length: count }, () => {
    const x = 30 + rand() * (W - 60)
    const top = yAt(x)
    const depth = rand()
    return { x, y: top + 12 + depth * (1000 - top - 30), r: 9 + depth * 9, rot: Math.round(rand() * 360) }
  }).sort((a, b) => a.y - b.y)
}
