import { motion } from 'framer-motion'
import { useStage } from '../state/useStage'
import { isAudioUnlocked, unlockAudio } from '../audio/engine'

export default function SoundToggle() {
  const muted = useStage((s) => s.muted)
  const ready = useStage((s) => s.audioReady)
  const playing = ready && !muted

  const onClick = () => {
    if (!isAudioUnlocked()) {
      unlockAudio()
      useStage.getState().setMuted(false)
      return
    }
    useStage.getState().toggleMuted()
  }

  return (
    <motion.button
      data-sound-toggle
      onClick={onClick}
      aria-label={playing ? 'Tắt nhạc' : 'Bật nhạc'}
      title={playing ? 'Tắt nhạc' : 'Bật nhạc'}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.4 }}
      className="fixed top-4 right-4 z-30 grid h-12 w-12 place-items-center rounded-full border border-white/80 bg-white/60 text-[#c2185b] shadow-[0_8px_24px_rgba(214,51,108,0.25)] backdrop-blur-md"
    >
      {playing ? (
        <span className="flex h-5 items-end gap-[3px]" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <motion.span
              key={i}
              className="w-[3px] rounded-full bg-current"
              animate={{ height: ['30%', '100%', '45%', '80%', '30%'] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
            />
          ))}
        </span>
      ) : (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M9 18V5l11-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="17" cy="16" r="3" />
          {ready && <path d="M3 3l18 18" />}
        </svg>
      )}
    </motion.button>
  )
}
