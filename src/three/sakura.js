import { useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

// The petal artwork (public/textures/petal.png): base at the bottom, notch at the top.
export const PETAL_URL = '/textures/petal.png'
export const PETAL_ASPECT = 347 / 512
export const PETAL_TINTS = ['#ffeef3', '#ffe2eb', '#ffd5e2', '#ffc8d9', '#fff4f7']

export function usePetalTexture() {
  const petal = useTexture(PETAL_URL)
  return useMemo(() => {
    petal.colorSpace = THREE.SRGBColorSpace
    petal.anisotropy = 4
    return petal
  }, [petal])
}

// A petal-shaped plane, cupped and curled so it reads as 3D when it tumbles.
export function createPetalGeometry() {
  const g = new THREE.PlaneGeometry(PETAL_ASPECT, 1, 4, 6)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / (PETAL_ASPECT / 2) // -1..1 across
    const y = p.getY(i) + 0.5 // 0 at the base, 1 at the notch
    p.setZ(i, x * x * 0.12 + y * y * 0.1 - 0.06)
  }
  g.computeVertexNormals()
  return g
}
