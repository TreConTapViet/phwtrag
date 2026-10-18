import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStage } from '../state/useStage'
import { pointer } from '../utils/pointer'
import { cameraTarget } from './layout'

const UP = new THREE.Vector3(0, 1, 0)
const { damp } = THREE.MathUtils

// A gentle parallax on the petals that matches the 2D landscape layers; it settles back to
// centre for the vortex so the swirl stays exactly in the middle of the screen.
export default function CameraRig({ layout }) {
  const layoutRef = useRef(layout)
  const st = useMemo(
    () => ({ pos: new THREE.Vector3(), look: new THREE.Vector3(), off: new THREE.Vector3(), tiltX: 0, tiltY: 0, init: false }),
    [],
  )

  useEffect(() => {
    layoutRef.current = layout
  }, [layout])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const cam = state.camera
    const { stage } = useStage.getState()
    cameraTarget(layoutRef.current, stage, st.pos, st.look)

    const amount = stage === 'intro' || stage === 'shake' ? 1 : 0
    st.tiltX = damp(st.tiltX, pointer.tiltX * amount, 2.5, dt)
    st.tiltY = damp(st.tiltY, pointer.tiltY * amount, 2.5, dt)
    st.off.subVectors(st.pos, st.look).applyAxisAngle(UP, st.tiltX * 0.06)
    st.off.y += st.tiltY * 0.3
    st.pos.addVectors(st.look, st.off)

    if (!st.init) {
      cam.position.copy(st.pos)
      st.init = true
    }
    cam.position.set(damp(cam.position.x, st.pos.x, 3, dt), damp(cam.position.y, st.pos.y, 3, dt), damp(cam.position.z, st.pos.z, 3, dt))
    cam.lookAt(st.look)
  })

  return null
}
