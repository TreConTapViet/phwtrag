import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { useStage } from '../state/useStage'
import { TIERS } from '../utils/quality'
import { useLayout } from './layout'
import CameraRig from './CameraRig'
import Petals from './Petals'

// Adaptive quality: below ~30 fps for a while → drop a tier; steady above 55 → try one up.
// After 3 flip-flops the tier is locked so it can't keep oscillating.
// (The 2D landscape shares the main thread, so its cost is measured here too.)
const fpsBounds = () => [30, 55]

// Transparent WebGL layer above the 2D landscape: just the 3D petals.
export default function Scene() {
  const tier = useStage((s) => s.tier)
  const stepTier = useStage((s) => s.stepTier)
  const lockTier = useStage((s) => s.lockTier)

  return (
    <div className="pointer-events-none fixed inset-0 z-[1]">
      <Canvas
        dpr={TIERS[tier].dpr}
        gl={{ antialias: tier !== 'low', alpha: true, powerPreference: 'high-performance' }}
        camera={{ fov: 40, near: 0.1, far: 80, position: [0, 2.2, 12.5] }}
      >
        <PerformanceMonitor
          bounds={fpsBounds}
          flipflops={3}
          onDecline={() => stepTier(-1)}
          onIncline={() => stepTier(1)}
          onFallback={lockTier}
        />
        <Suspense fallback={null}>
          <World />
        </Suspense>
      </Canvas>
    </div>
  )
}

function World() {
  const layout = useLayout()
  return (
    <>
      <hemisphereLight args={['#fff0f5', '#e7a9bd', 1.25]} />
      <directionalLight position={[-6, 9, 6]} intensity={1.6} color="#fff3f6" />
      <CameraRig layout={layout} />
      <Petals layout={layout} />
    </>
  )
}
