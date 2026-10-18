import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { SakuraFlower } from './Sakura'

// 2D SVG envelope. Layers (back → front): back panel, letter paper, front pocket, top flap.
// Opening: the flap flips up, drops behind the paper, then the paper slides out.
export default function Envelope({ opening, onOpen }) {
  const [flapBehind, setFlapBehind] = useState(false)

  useEffect(() => {
    if (!opening) return
    const id = setTimeout(() => setFlapBehind(true), 350)
    return () => clearTimeout(id)
  }, [opening])

  return (
    <motion.div
      className="flex flex-col items-center"
      initial={{ scale: 0.3, opacity: 0, y: 40, rotate: -10 }}
      animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
      exit={{ y: 160, opacity: 0, scale: 0.85, transition: { duration: 0.6, ease: 'easeIn' } }}
      transition={{ type: 'spring', stiffness: 110, damping: 14, delay: 0.25 }}
    >
      <motion.button
        type="button"
        onClick={onOpen}
        disabled={opening}
        aria-label="Mở thư"
        className="envelope-shadow relative block aspect-[3/2] w-[min(86vw,560px)] cursor-pointer disabled:cursor-default"
        style={{ perspective: 1400 }}
        animate={opening ? { y: 90 } : { y: [0, -8, 0] }}
        transition={opening ? { duration: 0.8, ease: 'easeOut' } : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        whileHover={opening ? undefined : { scale: 1.03, rotate: -1 }}
      >
        {/* back panel (its upper part is the envelope's inside) */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 600 400" aria-hidden="true">
          <defs>
            <linearGradient id="env-inside" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#e98aa8" />
              <stop offset="0.6" stopColor="#f6b3c7" />
            </linearGradient>
          </defs>
          <rect width="600" height="400" rx="18" fill="url(#env-inside)" />
        </svg>

        {/* letter paper peeking out */}
        <motion.div
          className="paper absolute top-[5%] right-[7%] left-[7%] h-[86%] rounded-md px-[6%] pt-[5%]"
          style={{ zIndex: 1 }}
          animate={{ y: opening ? '-56%' : '0%' }}
          transition={{ delay: opening ? 0.65 : 0, duration: 0.9, ease: [0.3, 0.9, 0.4, 1] }}
        >
          <p className="text-center font-vintage text-[clamp(0.7rem,2.4vw,1.05rem)] text-[#a3244f] italic">
            20/10 gửi nhiều yêu thương đến ghệ tui
          </p>
          <div className="mt-[4%] space-y-[3.5%]">
            {[92, 80, 88, 70, 84].map((w, i) => (
              <div key={i} className="h-[2px] rounded bg-[#f3b6c8]" style={{ width: `${w}%` }} />
            ))}
          </div>
        </motion.div>

        {/* front pocket */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ zIndex: 2 }} viewBox="0 0 600 400" aria-hidden="true">
          <defs>
            <clipPath id="env-clip">
              <rect width="600" height="400" rx="18" />
            </clipPath>
            <linearGradient id="env-bottom" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffd9e3" />
              <stop offset="1" stopColor="#ffc3d3" />
            </linearGradient>
          </defs>
          <g clipPath="url(#env-clip)">
            <path d="M0 0L300 222L0 400Z" fill="#ffc9d7" />
            <path d="M600 0L300 222L600 400Z" fill="#ffbfd0" />
            <path d="M0 400L300 200L600 400Z" fill="url(#env-bottom)" />
            <path d="M0 400L300 200L600 400" fill="none" stroke="#f3a3bb" strokeWidth="2" />
            <path d="M0 0L300 222L600 0" fill="none" stroke="#f3a3bb" strokeWidth="1.5" opacity="0.6" />
            <SakuraFlower x={58} y={342} r={18} rotate={12} />
            <SakuraFlower x={100} y={368} r={12} rotate={40} fill="#ff9cb8" />
            <SakuraFlower x={32} y={300} r={10} rotate={-20} fill="#ffe1ea" />
          </g>
        </svg>

        {/* sender, bottom-right */}
        <span
          className="pointer-events-none absolute right-[7%] bottom-[7%] font-hand text-[clamp(1.4rem,5vw,2.4rem)] font-bold text-[#8e2a50]"
          style={{ zIndex: 3 }}
        >
          Nhật Minh
        </span>

        {/* top flap */}
        <motion.div
          className="absolute inset-x-0 top-0 h-[59%] origin-top"
          style={{ zIndex: flapBehind ? 0 : 4, transformStyle: 'preserve-3d' }}
          animate={{ rotateX: opening ? 180 : 0 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
        >
          <svg className="absolute inset-0 h-full w-full [backface-visibility:hidden]" viewBox="0 0 600 236" aria-hidden="true">
            <defs>
              <linearGradient id="env-flap" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ffc2d2" />
                <stop offset="1" stopColor="#f9a9c0" />
              </linearGradient>
            </defs>
            <path d="M18 0H582Q600 0 590 10L312 230Q300 240 288 230L10 10Q0 0 18 0Z" fill="url(#env-flap)" />
            <circle cx="300" cy="212" r="28" fill="#d6336c" />
            <circle cx="300" cy="212" r="22" fill="none" stroke="#f78fb0" strokeWidth="2" strokeDasharray="4 3" />
            <path
              d="M300 224s-13-8-13-17c0-5 4-8 8-8 2.5 0 4 1.4 5 3 1-1.6 2.5-3 5-3 4 0 8 3 8 8 0 9-13 17-13 17z"
              fill="#ffe3ec"
            />
          </svg>
          <svg
            className="absolute inset-0 h-full w-full [backface-visibility:hidden] [transform:rotateX(180deg)]"
            viewBox="0 0 600 236"
            aria-hidden="true"
          >
            <path d="M18 0H582Q600 0 590 10L312 230Q300 240 288 230L10 10Q0 0 18 0Z" fill="#f6b6c8" />
          </svg>
        </motion.div>
      </motion.button>

      <motion.p
        className="soft-pill mt-6 font-dancing text-2xl text-[#a3244f]"
        animate={{ opacity: opening ? 0 : [0.55, 1, 0.55] }}
        transition={opening ? { duration: 0.3 } : { duration: 2.4, repeat: Infinity }}
      >
        Bấm vào thư để mở nha ♡
      </motion.p>
    </motion.div>
  )
}
