import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { TIMELINE, useStage } from '../state/useStage'
import { MAX, TIERS } from '../utils/quality'
import { createPetalGeometry, PETAL_TINTS, usePetalTexture } from './sakura'
import { cameraTarget } from './layout'
import { sceneInfo } from '../scene2d/sceneInfo'

// Flying sakura petals (the petal artwork on a curled plane), simulated on the CPU and
// drawn as one InstancedMesh over the 2D landscape. Each stage has its own motion:
//   intro/shake – leave the 2D tree's canopy, drift right → left in the wind, land on the hill
//   fade        – the canopy releases its blossoms as the landscape zooms away
//   swirl       – a vortex filling the whole screen, closing into a ball at the centre
//   scatter     – the ball bursts outward (the envelope appears)
//   letter      – petals falling gently across the sky

const N = MAX.petals
const ACTIVE_SHARE = { intro: 0.28, shake: 0.6, fade: 1, swirl: 1, scatter: 1, letter: 0.4 }
const SWIRL_DISTANCE = 6
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const clamp01 = (v) => Math.min(1, Math.max(0, v))

const UP = new THREE.Vector3(0, 1, 0)
const tmpPos = new THREE.Vector3()
const tmpLook = new THREE.Vector3()
const ray = new THREE.Vector3()
const hit = new THREE.Vector3()
const centre = new THREE.Vector3()
const proj = new THREE.Vector3()

// A screen point (CSS px) → the world point on the plane z = zPlane under that pixel.
function screenToWorld(px, py, zPlane, cam, out) {
  ray.set((px / window.innerWidth) * 2 - 1, -(py / window.innerHeight) * 2 + 1, 0.5).unproject(cam)
  ray.sub(cam.position).normalize()
  return out.copy(cam.position).addScaledVector(ray, (zPlane - cam.position.z) / ray.z)
}

function createSim() {
  return {
    pos: new Float32Array(N * 3),
    vel: new Float32Array(N * 3),
    rot: new Float32Array(N * 3),
    spin: new Float32Array(N * 3),
    seed: new Float32Array(N),
    size: new Float32Array(N),
    alive: new Uint8Array(N),
    r0: new Float32Array(N),
    th: new Float32Array(N),
    d0: new Float32Array(N),
    stage: null,
    seeded: false,
    center: new THREE.Vector3(),
    axR: new THREE.Vector3(),
    axU: new THREE.Vector3(),
    axF: new THREE.Vector3(),
    camR: new THREE.Vector3(),
    camU: new THREE.Vector3(),
    camF: new THREE.Vector3(),
  }
}

function setSpin(sim, i, amount) {
  for (let k = 0; k < 3; k++) sim.spin[i * 3 + k] = (Math.random() - 0.5) * amount
}

function randomRotation(sim, i) {
  for (let k = 0; k < 3; k++) sim.rot[i * 3 + k] = Math.random() * Math.PI * 2
}

// kind: 'gentle' (intro), 'gust' (shake), 'release' (canopy letting go during the zoom)
function spawnFromTree(sim, i, kind, cam) {
  const em = sceneInfo.emitters
  if (!em.length) return
  const i3 = i * 3
  const z = sceneInfo.zoom
  const e = em[(Math.random() * em.length) | 0]
  const px = z.cx + (e.x - z.cx) * z.s + (Math.random() - 0.5) * 24
  const py = z.cy + (e.y - z.cy) * z.s + (Math.random() - 0.5) * 18
  const zPlane = (Math.random() - 0.5) * 2.4
  screenToWorld(px, py, zPlane, cam, hit)
  sim.pos[i3] = hit.x
  sim.pos[i3 + 1] = hit.y
  sim.pos[i3 + 2] = hit.z
  if (kind === 'release') {
    screenToWorld(z.cx, z.cy, zPlane, cam, centre)
    let dx = hit.x - centre.x
    let dy = hit.y - centre.y
    const len = Math.hypot(dx, dy) || 1
    const speed = 0.8 + Math.random() * 1.8
    sim.vel[i3] = (dx / len) * speed - 0.5
    sim.vel[i3 + 1] = (dy / len) * speed + 0.3
    sim.vel[i3 + 2] = 0.4 + Math.random() * 0.8
    setSpin(sim, i, 6)
  } else {
    const gust = kind === 'gust'
    sim.vel[i3] = -(gust ? 0.6 + Math.random() * 0.7 : 0.15 + Math.random() * 0.2)
    sim.vel[i3 + 1] = gust ? 0.1 - Math.random() * 0.4 : -0.1 - Math.random() * 0.12
    sim.vel[i3 + 2] = (Math.random() - 0.3) * (gust ? 0.5 : 0.2)
    setSpin(sim, i, gust ? 5 : 2.6)
  }
  randomRotation(sim, i)
  sim.alive[i] = 1
}

// Letter stage: from just above the visible sky, wherever the camera is looking.
function spawnFromSky(sim, i, cam, aspect) {
  const i3 = i * 3
  const dist = 5 + Math.random() * 8
  const halfH = Math.tan((cam.fov * Math.PI) / 360) * dist
  const x = (Math.random() * 2.4 - 1.4) * halfH * aspect
  const y = halfH + 0.3 + Math.random() * 1.5
  for (let k = 0; k < 3; k++) {
    const axis = k === 0 ? 'x' : k === 1 ? 'y' : 'z'
    sim.pos[i3 + k] = cam.position[axis] + sim.camF[axis] * dist + sim.camR[axis] * x + sim.camU[axis] * y
  }
  sim.vel[i3] = 0.3 + Math.random() * 0.3
  sim.vel[i3 + 1] = -0.3 - Math.random() * 0.2
  sim.vel[i3 + 2] = 0.05
  randomRotation(sim, i)
  setSpin(sim, i, 2.6)
  sim.alive[i] = 1
}

function enterStage(sim, stage, count, L) {
  sim.stage = stage
  if (stage === 'swirl') {
    // A vortex in a plane facing the camera, centred on the middle of the screen, wide
    // enough to overflow its edges.
    cameraTarget(L, 'swirl', tmpPos, tmpLook)
    const forward = tmpLook.sub(tmpPos).normalize()
    sim.center.copy(tmpPos).addScaledVector(forward, SWIRL_DISTANCE)
    sim.axR.crossVectors(forward, UP).normalize()
    sim.axU.crossVectors(sim.axR, forward)
    sim.axF.copy(forward).negate() // toward the camera
    // Just past the screen corners at the vortex distance (narrow on phones, wide on desktop).
    const halfH = Math.tan((20 * Math.PI) / 180) * SWIRL_DISTANCE
    const reach = 1.35 * Math.hypot(halfH, halfH * L.aspect)
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const r0 = 0.3 + Math.sqrt(Math.random()) * reach
      sim.r0[i] = r0
      // Most petals line up along four spiral arms, the rest fill the gaps.
      sim.th[i] =
        i % 5 < 3 ? (i % 4) * (Math.PI / 2) + (r0 / reach) * 5.4 + (Math.random() - 0.5) * 0.5 : Math.random() * Math.PI * 2
      sim.d0[i] = (Math.random() - 0.55) * 4.2
      if (!sim.alive[i]) {
        // Late arrivals fly in from beyond the screen edge.
        const a = Math.random() * Math.PI * 2
        const r = reach * 1.1 + Math.random() * 3
        for (let k = 0; k < 3; k++) {
          const axis = k === 0 ? 'x' : k === 1 ? 'y' : 'z'
          sim.pos[i3 + k] = sim.center[axis] + sim.axR[axis] * Math.cos(a) * r + sim.axU[axis] * Math.sin(a) * r
        }
        randomRotation(sim, i)
        sim.alive[i] = 1
      }
      setSpin(sim, i, 7)
    }
  } else if (stage === 'scatter') {
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      let dx = sim.pos[i3] - sim.center.x + (Math.random() - 0.5) * 0.5
      let dy = sim.pos[i3 + 1] - sim.center.y + (Math.random() - 0.5) * 0.5
      let dz = sim.pos[i3 + 2] - sim.center.z + (Math.random() - 0.5) * 0.5
      const len = Math.hypot(dx, dy, dz) || 1
      const speed = 5 + Math.random() * 8
      sim.vel[i3] = (dx / len) * speed
      sim.vel[i3 + 1] = (dy / len) * speed + 0.8
      sim.vel[i3 + 2] = (dz / len) * speed
    }
  } else if (stage === 'letter') {
    for (let i = 0; i < count; i++) setSpin(sim, i, 2.6)
  }
}

export default function Petals({ layout }) {
  const petal = usePetalTexture()
  const mesh = useRef(null)
  const layoutRef = useRef(layout)
  const sim = useMemo(() => createSim(), [])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const geometry = useMemo(() => createPetalGeometry(), [])
  const material = useMemo(
    () =>
      // The petal's own colours also drive the emissive term, so back-lit petals stay pink.
      new THREE.MeshLambertMaterial({
        map: petal,
        emissiveMap: petal,
        emissive: '#ffffff',
        emissiveIntensity: 0.5,
        alphaTest: 0.45,
        side: THREE.DoubleSide,
      }),
    [petal],
  )

  useEffect(() => {
    layoutRef.current = layout
  }, [layout])

  useEffect(() => {
    const m = mesh.current
    const color = new THREE.Color()
    for (let i = 0; i < N; i++) {
      sim.seed[i] = Math.random()
      sim.size[i] = 0.1 + Math.random() * 0.07
      m.setColorAt(i, color.set(PETAL_TINTS[(Math.random() * PETAL_TINTS.length) | 0]))
    }
    m.instanceColor.needsUpdate = true
  }, [sim])

  useFrame((state, delta) => {
    const m = mesh.current
    if (!m) return
    const dt = Math.min(delta, 1 / 30)
    const cam = state.camera
    const { stage, stageAt, tier } = useStage.getState()
    const count = Math.min(N, TIERS[tier].petals)
    const active = Math.floor(count * ACTIVE_SHARE[stage])
    const t = state.clock.elapsedTime
    const since = performance.now() / 1000 - stageAt
    const L = layoutRef.current
    const { pos, vel, rot, spin, seed, alive } = sim
    const sw = window.innerWidth
    const sh = window.innerHeight

    sim.camR.set(1, 0, 0).applyQuaternion(cam.quaternion)
    sim.camU.set(0, 1, 0).applyQuaternion(cam.quaternion)
    sim.camF.set(0, 0, -1).applyQuaternion(cam.quaternion)
    if (sim.stage !== stage) enterStage(sim, stage, count, L)

    // First intro petals start spread along their path, not all bunched in the canopy.
    if (!sim.seeded && sceneInfo.emitters.length) {
      sim.seeded = true
      for (let i = 0; i < active; i++) {
        spawnFromTree(sim, i, 'gentle', cam)
        const k = Math.random()
        pos[i * 3] -= k * 3
        pos[i * 3 + 1] -= k * 2.5
      }
    }

    const p = clamp01(since / TIMELINE.swirl)
    const close = smoothstep(0.45, 0.86, p) // vortex starts closing in on the centre
    const spinMul = stage === 'swirl' ? 2.2 : 1
    // With fewer petals (weaker devices) each one is drawn larger so the vortex still fills the screen.
    const fill = Math.min(1.8, Math.sqrt(N / count))
    const sizeMul = stage === 'swirl' ? 1.5 * fill : stage === 'scatter' ? 1.3 * fill : 1
    const camX = cam.position.x
    const camY = cam.position.y
    const camZ = cam.position.z

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      if (!alive[i] && i < active) {
        if (stage === 'intro' && sim.seeded && Math.random() < dt * 0.7) spawnFromTree(sim, i, 'gentle', cam)
        else if (stage === 'shake' && Math.random() < dt * 2.5) spawnFromTree(sim, i, 'gust', cam)
        else if (stage === 'fade' && Math.random() < dt * 3) spawnFromTree(sim, i, 'release', cam)
        else if (stage === 'letter' && Math.random() < dt * 0.9) spawnFromSky(sim, i, cam, L.aspect)
      }
      if (!alive[i]) {
        dummy.scale.setScalar(0)
        dummy.updateMatrix()
        m.setMatrixAt(i, dummy.matrix)
        continue
      }

      const s = seed[i]
      if (stage === 'swirl') {
        const radius = sim.r0[i] * Math.pow(1 - close, 1.25) + close * (0.1 + 0.3 * s) * (1 + 0.15 * Math.sin(t * 8 + s * 20))
        // Inner petals circle faster, like a real whirlwind; everything speeds up as it closes.
        sim.th[i] += (0.9 + 3 / (0.7 + radius)) * (1 + 1.5 * close) * dt
        const th = sim.th[i]
        const depth = sim.d0[i] * (1 - close) + Math.sin(th * 2 + s * 6.28) * 0.3 * (1 - close)
        const cr = Math.cos(th) * radius
        const sr = Math.sin(th) * radius
        const a = 1 - Math.exp(-dt * (1.8 + 7 * p))
        pos[i3] += (sim.center.x + sim.axR.x * cr + sim.axU.x * sr + sim.axF.x * depth - pos[i3]) * a
        pos[i3 + 1] += (sim.center.y + sim.axR.y * cr + sim.axU.y * sr + sim.axF.y * depth - pos[i3 + 1]) * a
        pos[i3 + 2] += (sim.center.z + sim.axR.z * cr + sim.axU.z * sr + sim.axF.z * depth - pos[i3 + 2]) * a
      } else if (stage === 'scatter' || stage === 'fade') {
        const scatter = stage === 'scatter'
        const drag = Math.exp(-dt * (scatter ? 1.2 : 0.6))
        vel[i3] = vel[i3] * drag - 0.4 * dt + Math.sin(t * 2.3 + s * 20 + pos[i3 + 1]) * dt * 1.2
        vel[i3 + 1] = vel[i3 + 1] * drag - (scatter ? 0.4 : 0.6) * dt
        vel[i3 + 2] = vel[i3 + 2] * drag + Math.cos(t * 2 + s * 13 + pos[i3]) * dt * 0.8
        pos[i3] += vel[i3] * dt
        pos[i3 + 1] += vel[i3 + 1] * dt
        pos[i3 + 2] += vel[i3 + 2] * dt
        if (Math.hypot(pos[i3] - camX, pos[i3 + 1] - camY, pos[i3 + 2] - camZ) > 30 || pos[i3 + 1] < camY - 14) alive[i] = 0
      } else {
        // intro / shake: from the tree, right → left. letter: across the sky, left → right.
        const letter = stage === 'letter'
        const gust = stage === 'shake'
        const terminal = (letter ? 0.35 : 0.24) + s * 0.25
        const windX = letter ? 0.35 : gust ? -0.9 : -0.32
        const e = 1 - Math.exp(-dt * 1.2)
        vel[i3] += (windX + Math.sin(t * 0.9 + s * 40) * (gust ? 0.5 : 0.32) - vel[i3]) * e
        vel[i3 + 1] += (-terminal - vel[i3 + 1]) * e
        vel[i3 + 2] += (0.05 + Math.cos(t * 0.7 + s * 30) * 0.18 - vel[i3 + 2]) * e
        pos[i3] += vel[i3] * dt
        pos[i3 + 1] += vel[i3 + 1] * dt
        pos[i3 + 2] += vel[i3 + 2] * dt
        let gone = pos[i3 + 1] < camY - 14 || Math.abs(pos[i3] - camX) > 22
        if (!letter && sceneInfo.hillY) {
          // Land somewhere on the 2D hillside: below its crest line, spread by the seed.
          proj.set(pos[i3], pos[i3 + 1], pos[i3 + 2]).project(cam)
          const sx = ((proj.x + 1) / 2) * sw
          const sy = ((1 - proj.y) / 2) * sh
          const crest = sceneInfo.hillY(sx)
          if (sy > crest + (sh - crest) * 0.75 * s + 2 || sx < -60) gone = true
        }
        if (gone) alive[i] = 0
      }

      rot[i3] += spin[i3] * dt * spinMul
      rot[i3 + 1] += spin[i3 + 1] * dt * spinMul
      rot[i3 + 2] += spin[i3 + 2] * dt * spinMul
      dummy.position.set(pos[i3], pos[i3 + 1], pos[i3 + 2])
      dummy.rotation.set(rot[i3], rot[i3 + 1], rot[i3 + 2])
      dummy.scale.setScalar(sim.size[i] * sizeMul)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }

    m.count = count
    m.instanceMatrix.needsUpdate = true
  })

  return <instancedMesh ref={mesh} args={[geometry, material, N]} frustumCulled={false} />
}
