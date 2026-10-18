import { useEffect, useMemo, useRef } from 'react'
import { useStage } from '../state/useStage'
import { MAX, TIERS } from '../utils/quality'
import { pointer } from '../utils/pointer'
import { useViewport } from '../utils/useViewport'
import { generateBonsai } from './bonsai'
import { buildCarpet, buildFallenFlowers, buildTufts, curveD, farHillCurve, hillCurve, hillFillD, makeYAt } from './terrain'
import { fadeProgress, sceneInfo } from './sceneInfo'
import SvgDefs from './SvgDefs'

const PETAL_URL = '/textures/petal.png'
const PETAL_ASPECT = 347 / 512
const BLOSSOM_IDS = ['#sakura-deep', '#sakura-mid', '#sakura-light']
// How far each layer drifts with the cursor (px) — nearer layers move more (2.5D depth).
const PARALLAX = { far: [5, 2], ground: [10, 4], tree: [17, 6], front: [24, 8] }
const PUSH_RADIUS = 120

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

// The hand-drawn 2D world (SVG): far hill, petal-carpeted hillside, the bonsai cherry tree
// and a foreground of grass tufts and petals that react to the cursor. The 3D petals
// (WebGL canvas above) spawn from this tree's canopy and land on this hill.
export default function Landscape() {
  const tier = useStage((s) => s.tier)
  const stage = useStage((s) => s.stage)
  const cfg = TIERS[tier]
  const { w, h } = useViewport()
  const portrait = w / h < 0.85
  const W = Math.round((1000 * w) / h)
  const k = h / 1000 // SVG unit → CSS px

  const hill = useMemo(() => hillCurve(W, portrait), [W, portrait])
  const far = useMemo(() => farHillCurve(W, portrait), [W, portrait])
  const yAt = useMemo(() => makeYAt(hill), [hill])
  const tree = useMemo(() => generateBonsai(11, MAX.flowers2d), [])
  const carpet = useMemo(() => buildCarpet(W, yAt, MAX.carpet2d), [W, yAt])
  const tufts = useMemo(() => buildTufts(W, yAt, MAX.tufts2d), [W, yAt])
  const fallen = useMemo(() => buildFallenFlowers(W, yAt, 14), [W, yAt])

  // Tree placement in landscape units: on the hill, right side (lower-middle on phones).
  const place = useMemo(() => {
    const bx = W * (portrait ? 0.62 : 0.79)
    return { bx, by: yAt(bx) + 6, s: portrait ? Math.min(0.72, W / 830) : 1.05 }
  }, [W, portrait, yAt])
  const { minX, maxX, minY, maxY } = tree.bounds
  const treeBox = {
    left: (place.bx + minX * place.s) * k,
    top: (place.by + minY * place.s) * k,
    width: (maxX - minX) * place.s * k,
    height: (maxY - minY) * place.s * k,
  }
  const cx = (place.bx + tree.canopy[0] * place.s) * k
  const cy = (place.by + tree.canopy[1] * place.s) * k

  const wrapRef = useRef(null)
  const farRef = useRef(null)
  const groundRef = useRef(null)
  const treeRef = useRef(null)
  const frontRef = useRef(null)

  // Tell the 3D petals where the canopy and the hill are on screen.
  useEffect(() => {
    sceneInfo.hillY = (x) => yAt(x / k) * k
    sceneInfo.emitters = tree.emitters.map(([x, y]) => ({ x: (place.bx + x * place.s) * k, y: (place.by + y * place.s) * k }))
    sceneInfo.center = { x: cx, y: cy }
  }, [tree, place, yAt, k, cx, cy])

  const treeContent = useMemo(() => renderTree(tree, cfg), [tree, cfg])
  const groundContent = useMemo(
    () => renderGround({ W, hill, carpet, count: cfg.carpet2d, place, tree }),
    [W, hill, carpet, cfg.carpet2d, place, tree],
  )
  const frontContent = useMemo(
    () => renderFront({ carpet, tufts, fallen, carpetCount: cfg.carpet2d, tuftCount: cfg.tufts2d }),
    [carpet, tufts, fallen, cfg.carpet2d, cfg.tufts2d],
  )

  // One animation loop: zoom/fade during the transition, parallax, cursor push.
  useEffect(() => {
    const layers = { far: farRef.current, ground: groundRef.current, tree: treeRef.current, front: frontRef.current }
    const items = Array.from(layers.front.querySelectorAll('[data-push]')).map((el, i) => ({
      el,
      i,
      x: +el.dataset.x,
      y: +el.dataset.y,
      kind: el.dataset.push,
      cur: 0,
    }))
    const st = { tiltX: 0, tiltY: 0 }
    let raf = 0
    let last = performance.now()

    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const { stage: s, stageAt, tier: t } = useStage.getState()
      const wrap = wrapRef.current
      const p = fadeProgress(s, stageAt)
      if (p >= 1) {
        if (wrap.style.visibility !== 'hidden') wrap.style.visibility = 'hidden'
        sceneInfo.zoom.s = 1
        return
      }
      // Zoom into the canopy while everything fades out.
      const zoom = 1 + 1.5 * easeInOut(p)
      wrap.style.visibility = 'visible'
      wrap.style.transform = `scale(${zoom})`
      wrap.style.opacity = String(1 - smoothstep(0.1, 0.95, p))
      sceneInfo.zoom = { s: zoom, cx, cy }

      const ease = 1 - Math.exp(-dt * 2.5)
      st.tiltX += (pointer.tiltX - st.tiltX) * ease
      st.tiltY += (pointer.tiltY - st.tiltY) * ease
      for (const [name, [ax, ay]] of Object.entries(PARALLAX)) {
        layers[name].style.transform = `translate3d(${(-st.tiltX * ax).toFixed(2)}px, ${(st.tiltY * ay).toFixed(2)}px, 0)`
      }

      if (s !== 'intro' || !TIERS[t].push) return
      const px = ((pointer.ndcX + 1) / 2) * window.innerWidth + st.tiltX * PARALLAX.front[0]
      const py = ((1 - pointer.ndcY) / 2) * window.innerHeight - st.tiltY * PARALLAX.front[1]
      for (const it of items) {
        const dx = it.x * k - px
        const dy = it.y * k - py
        const d = Math.hypot(dx, dy)
        const target = pointer.has && d < PUSH_RADIUS ? 1 - d / PUSH_RADIUS : 0
        const next = it.cur + (target - it.cur) * Math.min(1, dt * 8)
        if (Math.abs(next - it.cur) < 0.002 && target === 0 && it.cur < 0.002) continue
        it.cur = next
        if (it.kind === 'tuft') {
          // lean away from the cursor
          it.el.setAttribute('transform', `rotate(${(Math.sign(dx) * it.cur * 26).toFixed(2)})`)
        } else {
          const wiggle = Math.sin(now / 90 + it.i) * it.cur * 22
          it.el.setAttribute('transform', `translate(0 ${(-it.cur * 10).toFixed(2)}) rotate(${wiggle.toFixed(2)})`)
        }
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [frontContent, k, cx, cy])

  const viewBox = `0 0 ${W} 1000`
  const treeClass = stage === 'shake' ? 'tree-shake' : 'tree-breeze'

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ transformOrigin: `${cx}px ${cy}px`, willChange: 'transform, opacity' }}
    >
      <SvgDefs />
      <div ref={farRef} className="absolute inset-0">
        <svg viewBox={viewBox} preserveAspectRatio="none" className="h-full w-full" overflow="visible">
          <path d={hillFillD(far, W)} fill="url(#far-hill)" opacity="0.45" />
        </svg>
      </div>
      <div ref={groundRef} className="absolute inset-0">
        <svg viewBox={viewBox} preserveAspectRatio="none" className="h-full w-full" overflow="visible">
          {groundContent}
        </svg>
      </div>
      <div ref={treeRef} className="absolute" style={treeBox}>
        <svg
          viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
          className={`h-full w-full ${treeClass}`}
          overflow="visible"
          style={{ transformOrigin: `${(-minX / (maxX - minX)) * 100}% ${(-minY / (maxY - minY)) * 100}%` }}
        >
          {treeContent}
        </svg>
      </div>
      <div ref={frontRef} className="absolute inset-0">
        <svg viewBox={viewBox} preserveAspectRatio="none" className="h-full w-full" overflow="visible">
          {frontContent}
        </svg>
      </div>
    </div>
  )
}

function renderGround({ W, hill, carpet, count, place, tree }) {
  return (
    <>
      <path d={hillFillD(hill, W)} fill="url(#hill-fill)" />
      <path d={curveD(hill)} fill="none" stroke="#ffe3ec" strokeWidth="3.5" opacity="0.55" />
      <ellipse
        cx={place.bx + tree.canopy[0] * place.s * 0.4}
        cy={place.by + 6}
        rx={260 * place.s}
        ry={34 * place.s}
        fill="url(#tree-shadow)"
      />
      {carpet
        .filter((c) => !c.interactive && c.rank < count)
        .map((c, i) => (
          <PetalImage key={i} c={c} />
        ))}
    </>
  )
}

function PetalImage({ c }) {
  const pw = c.size * PETAL_ASPECT
  return (
    <image
      href={PETAL_URL}
      x={-pw / 2}
      y={-c.size / 2}
      width={pw}
      height={c.size}
      opacity={c.opacity}
      transform={`translate(${c.x.toFixed(1)} ${c.y.toFixed(1)}) scale(1 ${c.squash.toFixed(2)}) rotate(${c.rot})`}
    />
  )
}

function renderFront({ carpet, tufts, fallen, carpetCount, tuftCount }) {
  return (
    <>
      {fallen.map((f, i) => (
        <use
          key={`f${i}`}
          href="#sakura-light"
          x={-f.r}
          y={-f.r}
          width={f.r * 2}
          height={f.r * 2}
          transform={`translate(${f.x.toFixed(1)} ${f.y.toFixed(1)}) scale(1 0.6) rotate(${f.rot})`}
        />
      ))}
      {carpet
        .filter((c) => c.interactive && c.rank < carpetCount)
        .map((c, i) => (
          <g key={`p${i}`} transform={`translate(${c.x.toFixed(1)} ${c.y.toFixed(1)})`}>
            <g data-push="petal" data-x={c.x} data-y={c.y}>
              <PetalImage c={{ ...c, x: 0, y: 0 }} />
            </g>
          </g>
        ))}
      {tufts
        .filter((t) => t.rank < tuftCount)
        .map((t, i) => (
          <g key={`t${i}`} transform={`translate(${t.x.toFixed(1)} ${t.y.toFixed(1)})`}>
            <g className="tuft" style={{ animationDuration: `${t.dur}s`, animationDelay: `${t.delay}s` }}>
              <g data-push="tuft" data-x={t.x} data-y={t.y}>
                <path d={t.d} fill="url(#grass)" />
              </g>
            </g>
          </g>
        ))}
    </>
  )
}

function renderTree(tree, cfg) {
  const n = Math.min(tree.flowers.length, cfg.flowers2d)
  // Fewer blossoms (weaker devices) are drawn bigger so the branches stay covered.
  const grow = Math.min(1.45, Math.sqrt(tree.flowers.length / n))
  const groups = [0, 1, 2].map(() => tree.limbs.map(() => []))
  for (const f of tree.flowers.slice(0, n)) groups[f.layer][f.limb].push(f)

  // Each limb sways around the point where it leaves the trunk (high tier only;
  // otherwise the whole tree sways via CSS, which is much cheaper).
  const sway = (limb, li) =>
    cfg.sway ? (
      <animateTransform
        attributeName="transform"
        type="rotate"
        values={`-0.9 ${limb.origin[0]} ${limb.origin[1]};0.9 ${limb.origin[0]} ${limb.origin[1]};-0.9 ${limb.origin[0]} ${limb.origin[1]}`}
        keyTimes="0;0.5;1"
        calcMode="spline"
        keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
        dur={`${limb.period}s`}
        begin={`${-li * 0.7}s`}
        repeatCount="indefinite"
      />
    ) : null

  return (
    <>
      {tree.roots.map((d, i) => (
        <path key={`r${i}`} d={d} fill="url(#bark-limb)" />
      ))}
      {tree.limbs.map((limb, li) => (
        <g key={`b${li}`}>
          {sway(limb, li)}
          {limb.ribbons.map((d, i) => (
            <path key={i} d={d} fill="url(#bark-limb)" />
          ))}
        </g>
      ))}
      <path d={tree.trunk} fill="url(#bark-trunk)" />
      {tree.barkLines.map((d, i) => (
        <path key={`l${i}`} d={d} fill="none" stroke="#2f1912" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
      ))}
      {groups.map((byLimb, layer) =>
        byLimb.map((flowers, li) => (
          <g key={`${layer}-${li}`}>
            {sway(tree.limbs[li], li)}
            {layer === 0 &&
              tree.limbs[li].pads.map((p, i) => (
                <ellipse key={`g${i}`} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} fill="url(#pad-glow)" />
              ))}
            {flowers.map((f, i) => {
              const r = f.r * grow
              return (
                <use
                  key={i}
                  href={BLOSSOM_IDS[layer]}
                  x={f.x - r}
                  y={f.y - r}
                  width={r * 2}
                  height={r * 2}
                  transform={`rotate(${f.rot} ${f.x.toFixed(1)} ${f.y.toFixed(1)})`}
                />
              )
            })}
          </g>
        )),
      )}
    </>
  )
}
