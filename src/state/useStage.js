import { create } from 'zustand'
import { detectTier, forcedTier, prefersReducedMotion, TIER_ORDER } from '../utils/quality'

// intro   → name form, tree and hillside
// shake   → form gone, tree shakes gently and sheds more petals
// fade    → camera zooms in while the tree and the ground fade away
// swirl   → only pink sky + petals: a full-screen vortex that closes into the centre
// scatter → the petal ball bursts outward and the envelope appears
// letter  → pink sky, gently falling petals, the letter
export const TIMELINE = prefersReducedMotion()
  ? { shake: 0.6, fade: 1.0, swirl: 2.0, scatter: 0.8 }
  : { shake: 1.4, fade: 1.8, swirl: 3.6, scatter: 1.3 }

const now = () => performance.now() / 1000

export const useStage = create((set, get) => ({
  stage: 'intro',
  stageAt: now(),
  tier: detectTier(),
  tierLocked: forcedTier() !== null,
  muted: false,
  audioReady: false,

  setStage: (stage) => set({ stage, stageAt: now() }),

  startJourney: () => {
    if (get().stage !== 'intro') return
    const { shake, fade, swirl, scatter } = TIMELINE
    const at = (stage, seconds) => setTimeout(() => get().setStage(stage), seconds * 1000)
    get().setStage('shake')
    at('fade', shake)
    at('swirl', shake + fade)
    at('scatter', shake + fade + swirl)
    at('letter', shake + fade + swirl + scatter)
  },

  stepTier: (dir) => {
    const { tier, tierLocked } = get()
    if (tierLocked) return
    const i = Math.min(TIER_ORDER.length - 1, Math.max(0, TIER_ORDER.indexOf(tier) + dir))
    if (TIER_ORDER[i] !== tier) set({ tier: TIER_ORDER[i] })
  },
  lockTier: () => set({ tierLocked: true }),

  setMuted: (muted) => set({ muted }),
  toggleMuted: () => set({ muted: !get().muted }),
  setAudioReady: (audioReady) => set({ audioReady }),
}))
