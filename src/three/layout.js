import { useThree } from '@react-three/fiber'
import { useMemo } from 'react'

// The 3D layer only carries the flying petals now (the tree and hill are 2D SVG), so the
// camera simply looks straight ahead; only the cursor parallax moves it.
export function computeLayout(aspect) {
  const portrait = aspect < 0.85
  return { portrait, aspect, cam: [0, 2.2, portrait ? 14 : 12.5], look: [0, 2.2, 0] }
}

export function useLayout() {
  const aspect = useThree((s) => s.size.width / s.size.height)
  return useMemo(() => computeLayout(aspect), [aspect])
}

export function cameraTarget(L, stage, outPos, outLook) {
  outPos.set(...L.cam)
  outLook.set(...L.look)
}
