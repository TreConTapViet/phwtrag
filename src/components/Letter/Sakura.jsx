// Small SVG sakura pieces shared by the envelope and the letter.

export function SakuraFlower({ x = 0, y = 0, r = 12, rotate = 0, fill = '#ffb3c8', center = '#e23d6f' }) {
  const petal = `M0 0C${r * 0.5} ${-r * 0.15} ${r * 0.5} ${-r * 0.75} ${r * 0.15} ${-r}L0 ${-r * 0.85}L${-r * 0.15} ${-r}C${-r * 0.5} ${-r * 0.75} ${-r * 0.5} ${-r * 0.15} 0 0Z`
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <path key={a} d={petal} fill={fill} transform={`rotate(${a})`} />
      ))}
      <circle r={r * 0.18} fill={center} />
    </g>
  )
}

export function SakuraBranch({ className }) {
  return (
    <svg viewBox="0 0 220 160" className={className} aria-hidden="true">
      <path
        d="M215 8C170 18 140 40 118 66 96 92 70 104 40 112"
        fill="none"
        stroke="#7a4a3a"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path d="M150 38c-6 18-4 34 6 48" fill="none" stroke="#7a4a3a" strokeWidth="3" strokeLinecap="round" />
      <path d="M100 84c4 16 14 28 28 34" fill="none" stroke="#7a4a3a" strokeWidth="2.5" strokeLinecap="round" />
      <SakuraFlower x={196} y={18} r={15} rotate={10} />
      <SakuraFlower x={160} y={34} r={13} rotate={40} fill="#ffc6d5" />
      <SakuraFlower x={156} y={88} r={12} rotate={-20} fill="#ff9cb8" />
      <SakuraFlower x={118} y={66} r={14} rotate={25} />
      <SakuraFlower x={130} y={120} r={10} rotate={5} fill="#ffd5e0" />
      <SakuraFlower x={78} y={98} r={12} rotate={60} fill="#ffc6d5" />
      <SakuraFlower x={44} y={112} r={10} rotate={15} fill="#ff9cb8" />
      <circle cx="98" cy="112" r="4" fill="#ff9cb8" />
      <circle cx="182" cy="52" r="3.5" fill="#ffb3c8" />
    </svg>
  )
}
