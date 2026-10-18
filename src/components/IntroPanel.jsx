import { useState } from 'react'
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import { useStage } from '../state/useStage'
import { checkName } from '../utils/validateName'
import { playSfx, unlockAudio } from '../audio/engine'

const TITLE = 'Ai dị?'
const WRONG = ['Hông phải ghệ tui rồi 😝', 'Sai gòi, thử lại nha 🙈', 'Ê, ai dị? Hông quen nha 😤']
const FORMAT_HINT = 'Gần đúng rồi! Ghi đủ dấu và viết hoa chữ cái đầu nha 🥺'
const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

export default function IntroPanel() {
  const [name, setName] = useState('')
  const [error, setError] = useState(null)
  const [tries, setTries] = useState(0)
  const shake = useAnimationControls()
  const startJourney = useStage((s) => s.startJourney)
  const lowTier = useStage((s) => s.tier === 'low')

  const onSubmit = (e) => {
    e.preventDefault()
    unlockAudio()
    const result = checkName(name)
    if (result === 'ok') {
      setError(null)
      startJourney()
      return
    }
    if (result === 'format') {
      setError(FORMAT_HINT)
    } else {
      setError(WRONG[tries % WRONG.length])
      setTries((n) => n + 1)
    }
    playSfx('oops')
    shake.start({ x: [0, -14, 12, -9, 7, -4, 0], transition: { duration: 0.5 } })
  }

  return (
    <motion.section
      className="pointer-events-none fixed inset-0 z-20 flex items-start md:items-center"
      exit={{ opacity: 0, x: -70, filter: 'blur(10px)', transition: { duration: 0.9, ease: 'easeIn' } }}
    >
      <div className="pointer-events-auto w-full px-6 pt-[11vh] text-center md:w-auto md:pt-0 md:pl-[8vw] md:text-left">
        <motion.h1
          aria-label={TITLE}
          className="title-glow font-title text-[clamp(3.8rem,10vw,8rem)] leading-[1.15] text-[#c2185b]"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          {Array.from(TITLE).map((ch, i) => (
            <motion.span
              key={i}
              aria-hidden="true"
              className="inline-block"
              initial={{ y: 50, opacity: 0, rotate: -14 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              transition={{ delay: 0.3 + i * 0.09, type: 'spring', stiffness: 220, damping: 13 }}
            >
              {ch === ' ' ? ' ' : ch}
            </motion.span>
          ))}
        </motion.h1>

        <motion.p
          className="mt-2 font-times text-lg text-[#8a2f52] md:text-xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95, duration: 0.6 }}
        >
          Nhập đầy đủ họ và tên, có dấu và viết hoa chữ cái đầu nha ✿
        </motion.p>

        <motion.form
          onSubmit={onSubmit}
          className="mt-6 flex items-center justify-center gap-3 md:justify-start"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.15, duration: 0.6 }}
        >
          <motion.div animate={shake}>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (error) setError(null)
              }}
              placeholder="Họ và tên..."
              aria-label="Họ và tên"
              aria-invalid={error ? 'true' : 'false'}
              autoFocus={!isTouch}
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="go"
              className={`w-[min(70vw,360px)] rounded-full border-2 border-white/80 px-6 py-3.5 font-times text-lg text-[#6d1b3d] shadow-[0_10px_30px_rgba(214,51,108,0.2)] outline-none transition placeholder:text-[#d77a9c] focus:border-[#f48fb1] focus:ring-4 focus:ring-pink-300/50 ${
                lowTier ? 'bg-white/80' : 'bg-white/55 backdrop-blur-md'
              } ${error ? 'border-[#ff6f91]' : ''}`}
            />
          </motion.div>
          <motion.button
            type="submit"
            aria-label="Gửi"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#ff8fb1] to-[#d6336c] text-white shadow-[0_10px_25px_rgba(214,51,108,0.4)]"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
              <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.4h2c.7-1.2 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" />
            </svg>
          </motion.button>
        </motion.form>

        <div className="mt-3 h-7" aria-live="polite">
          <AnimatePresence mode="wait">
            {error && (
              <motion.p
                key={error}
                className="soft-pill font-times text-lg text-[#c2185b]"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <motion.p
          className="mt-5 hidden md:block"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
        >
          <span className="soft-pill font-times text-sm text-[#a2486c]">✿ di chuột qua lại để ngắm vườn hoa nhé</span>
        </motion.p>
      </div>
    </motion.section>
  )
}
