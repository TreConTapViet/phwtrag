import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { playSfx } from '../../audio/engine'
import Envelope from './Envelope'
import LetterCard from './LetterCard'

// closed → opening (flap flips, paper slides out) → reading (full letter)
export default function LetterStage() {
  const [phase, setPhase] = useState('closed')

  useEffect(() => {
    if (phase !== 'opening') return
    const id = setTimeout(() => setPhase('reading'), 1800)
    return () => clearTimeout(id)
  }, [phase])

  const open = () => {
    if (phase !== 'closed') return
    playSfx('paper')
    setPhase('opening')
  }

  return (
    <motion.div
      className="fixed inset-0 z-20 flex items-center justify-center px-4 pt-16 pb-4 sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <AnimatePresence mode="wait">
        {phase === 'reading' ? (
          <LetterCard key="card" onFold={() => setPhase('closed')} />
        ) : (
          <Envelope key="envelope" opening={phase === 'opening'} onOpen={open} />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
