import { mulberry32, shuffle } from '../utils/random'
import { catmull, openPath, pointAt, ribbon } from './geometry'

// 2D bonsai cherry tree (SVG), following the sketch: twisting S-shaped trunk, long
// near-horizontal limbs spreading into a wide umbrella (longest to the left), every
// branch buried under clusters of blossoms so only the trunk shows brown.
// Local coordinates: trunk base at (0, 0), y grows downward (SVG), so "up" is negative.

// Main limbs: where on the trunk they start (0–1), heading, length, sway period (s).
const LIMBS = [
  { t: 0.5, dir: [-1, -0.1], len: 360, period: 5.2 },
  { t: 0.66, dir: [-0.82, -0.58], len: 250, period: 4.6 },
  { t: 0.74, dir: [0.95, -0.32], len: 215, period: 4.9 },
  { t: 0.58, dir: [0.75, -0.05], len: 140, period: 5.6 },
  { t: 0.86, dir: [0.42, -0.9], len: 170, period: 4.3 },
  { t: 1.0, dir: [-0.28, -0.96], len: 150, period: 4.0 },
]

const norm = ([x, y]) => {
  const l = Math.hypot(x, y) || 1
  return [x / l, y / l]
}
const rotate = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]

export function generateBonsai(seed = 11, flowerTotal = 900) {
  const rand = mulberry32(seed)
  const jitter = (s) => [(rand() - 0.5) * s, (rand() - 0.5) * s]

  const trunkPts = catmull(
    [
      [0, 6],
      [28, -70],
      [-10, -150],
      [20, -228],
      [4, -300],
    ],
    6,
  )
  const trunk = ribbon(trunkPts, 76, 26)

  // Roots gripping the hill: [end x, end y, base width]
  const roots = [
    [-135, 8, 30],
    [-78, 12, 24],
    [72, 10, 26],
    [122, 6, 22],
    [18, 14, 18],
  ].map(([x, y, w]) =>
    ribbon(
      catmull(
        [
          [0, -36],
          [x * 0.45, -10],
          [x, y],
        ],
        6,
      ),
      w,
      3,
    ),
  )

  // Bark grain: thin curves following the trunk.
  const barkLines = [-17, -7, 6, 16].map((o, j) =>
    openPath(
      trunkPts.slice(2, trunkPts.length - 4).map(([x, y], i, all) => [
        x + o * (1 - (i / all.length) * 0.55) + Math.sin(i * 0.9 + j) * 2,
        y,
      ]),
    ),
  )

  const limbs = LIMBS.map((l) => ({ ribbons: [], pads: [], period: l.period, origin: null }))

  const branch = (start, dir, len, width, depth, limb) => {
    const j1 = jitter(0.1 * len)
    const j2 = jitter(0.1 * len)
    const p1 = [start[0] + dir[0] * len * 0.35 + j1[0], start[1] + dir[1] * len * 0.35 + 0.07 * len + j1[1]]
    const p2 = [start[0] + dir[0] * len * 0.7 + j2[0], start[1] + dir[1] * len * 0.7 + 0.02 * len + j2[1]]
    const end = [start[0] + dir[0] * len, start[1] + dir[1] * len - 0.1 * len]
    const pts = catmull([start, p1, p2, end], 5)
    limbs[limb].ribbons.push(ribbon(pts, width, width * 0.35))

    // Blossom clusters along the branch (all of it, except the inner part of main limbs).
    const from = depth === 0 ? 0.45 : 0.2
    const steps = depth === 0 ? 3 : 2
    const size = Math.min(115, Math.max(58, 60 + len * 0.18)) * (depth === 0 ? 1 : 0.85)
    for (let k = 0; k <= steps; k++) {
      const [x, y] = pointAt(pts, from + ((1 - from) * k) / steps)
      limbs[limb].pads.push({
        cx: x,
        cy: y - size * 0.22,
        rx: size * (0.95 + rand() * 0.2),
        ry: size * (0.55 + rand() * 0.13),
      })
    }

    if (depth >= 2) return
    const n = depth === 0 ? 4 : 2
    for (let k = 0; k < n; k++) {
      const side = k % 2 ? 1 : -1
      const child = norm(rotate(dir, side * (0.5 + rand() * 0.5)).map((v, i) => (i === 1 ? v - 0.2 : v)))
      branch(pointAt(pts, 0.3 + (k / n) * 0.6), child, len * (0.38 + rand() * 0.14), width * 0.55, depth + 1, limb)
    }
  }

  LIMBS.forEach((l, i) => {
    const start = pointAt(trunkPts, l.t)
    limbs[i].origin = start
    branch(start, norm(l.dir), l.len, (76 + (26 - 76) * l.t) * 0.55, 0, i)
  })

  // Blossoms: spread over the clusters by area, in three depth layers.
  const pads = limbs.flatMap((l, li) => l.pads.map((p) => ({ ...p, limb: li })))
  const total = pads.reduce((a, p) => a + p.rx * p.ry, 0)
  const flowers = []
  for (const p of pads) {
    const n = Math.max(5, Math.round((flowerTotal * p.rx * p.ry) / total))
    for (let k = 0; k < n; k++) {
      const a = rand() * Math.PI * 2
      const rr = Math.pow(rand(), 0.6)
      const z = rand()
      // back = deeper pink, front = lightest; the tops of clusters catch more light
      let layer = z < 0.3 ? 0 : z < 0.72 ? 1 : 2
      if (layer === 0 && Math.sin(a) < -0.3 && rand() < 0.5) layer = 1
      flowers.push({
        x: p.cx + Math.cos(a) * p.rx * rr,
        y: p.cy + Math.sin(a) * p.ry * rr,
        r: 10 + rand() * 7 + (layer === 0 ? 2 : 0),
        rot: Math.round(rand() * 360),
        layer,
        limb: p.limb,
      })
    }
  }
  // Shuffled, so drawing only the first N (weaker devices) thins out evenly.
  shuffle(flowers, rand)

  const emitters = flowers.filter((f) => f.layer > 0).slice(0, 220).map((f) => [f.x, f.y])

  let minX = -150
  let maxX = 150
  let minY = -320
  for (const p of pads) {
    minX = Math.min(minX, p.cx - p.rx - 20)
    maxX = Math.max(maxX, p.cx + p.rx + 20)
    minY = Math.min(minY, p.cy - p.ry - 20)
  }
  const canopy = pads.reduce((acc, p) => [acc[0] + p.cx / pads.length, acc[1] + p.cy / pads.length], [0, 0])

  return {
    trunk,
    roots,
    barkLines,
    limbs,
    flowers,
    emitters,
    canopy,
    bounds: { minX, maxX, minY, maxY: 30 },
  }
}
