// Graphics tiers. Switching tiers only changes how many things are drawn (and the pixel
// ratio), so it never rebuilds the scene mid-animation.
//   petals    – flying 3D petals (also the full-screen swirl)
//   flowers2d – blossoms covering the SVG bonsai
//   carpet2d  – fallen petals on the SVG hillside
//   tufts2d   – grass clumps
//   sway      – each limb sways on its own (otherwise the whole tree sways, cheaper)
//   push      – grass and petals react to the cursor
export const TIERS = {
  high: { petals: 2600, flowers2d: 950, carpet2d: 460, tufts2d: 34, sway: true, push: true, dpr: [1, 2], overlay: 40 },
  medium: { petals: 1400, flowers2d: 700, carpet2d: 320, tufts2d: 26, sway: false, push: true, dpr: [1, 1.5], overlay: 28 },
  low: { petals: 650, flowers2d: 430, carpet2d: 190, tufts2d: 16, sway: false, push: false, dpr: [1, 1], overlay: 14 },
}

export const MAX = TIERS.high
export const TIER_ORDER = ['low', 'medium', 'high']

// `?q=low|medium|high` forces a tier (handy for testing on a strong machine).
export function forcedTier() {
  const q = new URLSearchParams(window.location.search).get('q')
  return TIERS[q] ? q : null
}

export function detectTier() {
  const forced = forcedTier()
  if (forced) return forced
  const cores = navigator.hardwareConcurrency || 4
  const memory = navigator.deviceMemory || 4
  const mobile =
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    window.matchMedia?.('(pointer: coarse)').matches
  if (cores <= 2 || memory <= 2) return 'low'
  if (mobile || cores <= 4 || memory <= 4) return 'medium'
  return 'high'
}

export const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
