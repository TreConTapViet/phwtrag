import { useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useStage } from './state/useStage'
import { startPointerTracking } from './utils/pointer'
import { preloadMusic, unlockAudio } from './audio/engine'
import Landscape from './scene2d/Landscape'
import Scene from './three/Scene'
import PetalOverlay from './components/PetalOverlay'
import IntroPanel from './components/IntroPanel'
import SoundToggle from './components/SoundToggle'
import LetterStage from './components/Letter/LetterStage'

export default function App() {
  const stage = useStage((s) => s.stage)
  const showLetter = stage === 'scatter' || stage === 'letter'

  useEffect(() => {
    startPointerTracking()
    preloadMusic()
    // Audio may only start after a user gesture: the first click / key press anywhere.
    // The sound button handles its own click so it doesn't unlock-then-mute in one tap.
    const unlock = (e) => {
      if (e.target?.closest?.('[data-sound-toggle]')) return
      unlockAudio()
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  return (
    <>
      <Landscape />
      <Scene />
      <PetalOverlay />
      <AnimatePresence>{stage === 'intro' && <IntroPanel key="intro" />}</AnimatePresence>
      <AnimatePresence>{showLetter && <LetterStage key="letter" />}</AnimatePresence>
      <SoundToggle />
    </>
  )
}
