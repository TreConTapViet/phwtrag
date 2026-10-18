import { TIMELINE } from '../state/useStage'

// What the 2D landscape tells the 3D petals, all in CSS pixels of the viewport:
//   emitters – points inside the blossom canopy (where petals leave the tree)
//   center   – middle of the canopy
//   hillY    – (x) => y of the hill's crest line at screen x
//   zoom     – current zoom of the landscape during the fade (scale about cx, cy)
export const sceneInfo = {
  emitters: [],
  center: { x: 0, y: 0 },
  hillY: null,
  zoom: { s: 1, cx: 0, cy: 0 },
}

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// 0 while the landscape is fully there, 1 once it has zoomed away. Tied to the stage
// clock so it's guaranteed gone before the swirl starts.
export function fadeProgress(stage, stageAt) {
  if (stage === 'intro' || stage === 'shake') return 0
  if (stage !== 'fade') return 1
  return smoothstep(0, 0.9, (performance.now() / 1000 - stageAt) / TIMELINE.fade)
}
