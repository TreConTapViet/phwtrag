import { Fragment } from 'react'
import { motion } from 'framer-motion'
import { SakuraBranch, SakuraFlower } from './Sakura'

const NAME = 'Phương Trang'
const BODY =
  'Nhật Minh chúc Phương Trang 20/10 xynh đẹp, tuyệt dời và ngày càng xinh xắn. Tui hông biết gửi gắm tình yêu của tui sao hếc nên tui sẽ gửi lá thư này cho Phương Trang, tui biết nhìu lúc tui làm Phương Trang buồn, tủi thân nhưng mà tui rất thương và yêu Phương Trang nên nhân dịp này tui chúc Phương Trang 20/10 dui dẻ và tràn đầy sức khoẻ và hạnh phúcc nhó, yêu cục dàng'

// Every "Phương Trang" gets the artistic vintage script.
function withHerName(text) {
  return text.split(NAME).map((part, i, all) => (
    <Fragment key={i}>
      {part}
      {i < all.length - 1 && <span className="her-name font-art">{NAME}</span>}
    </Fragment>
  ))
}

export default function LetterCard({ onFold }) {
  return (
    <motion.article
      className="paper letter-shadow relative max-h-[calc(100dvh-5rem)] w-[min(92vw,680px)] sm:max-h-[86dvh] overflow-y-auto rounded-2xl px-7 py-9 sm:px-12 sm:py-12"
      initial={{ opacity: 0, y: 140, scale: 0.6, rotateX: 25 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
      exit={{ opacity: 0, y: 90, scale: 0.7, transition: { duration: 0.45 } }}
      transition={{ type: 'spring', stiffness: 90, damping: 16 }}
    >
      <SakuraBranch className="pointer-events-none absolute -top-1 -right-1 w-32 opacity-90 sm:w-44" />

      <motion.h2
        className="pr-16 text-center font-vintage text-[clamp(1.45rem,4.4vw,2.25rem)] leading-snug text-[#a3244f] italic sm:pr-20"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.7 }}
      >
        20/10 gửi nhiều yêu thương đến ghệ tui
      </motion.h2>

      <svg viewBox="0 0 240 20" className="mx-auto my-5 w-48" aria-hidden="true">
        <path d="M10 10H100M140 10H230" stroke="#f3a3bb" strokeWidth="1.5" strokeLinecap="round" />
        <SakuraFlower x={120} y={10} r={9} />
      </svg>

      <motion.p
        className="font-dancing text-[clamp(1.35rem,3.6vw,1.8rem)] leading-[1.75] text-[#5b2a3a]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.75, duration: 1.4 }}
      >
        {withHerName(BODY)}
      </motion.p>

      <motion.p
        className="mt-6 text-right font-hand text-[clamp(1.5rem,4vw,2rem)] font-bold text-[#a3244f]"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.6, duration: 0.7 }}
      >
        Nhật Minh ♡
      </motion.p>

      <div className="mt-8 flex justify-center">
        <button
          type="button"
          onClick={onFold}
          className="rounded-full border border-[#f3a3bb] bg-white/70 px-5 py-2 font-times text-[#a3244f] transition hover:bg-[#ffe3ec]"
        >
          Gấp thư lại
        </button>
      </div>
    </motion.article>
  )
}
