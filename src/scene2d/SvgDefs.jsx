// Shared SVG gradients and the sakura blossom symbols (referenced by id from every
// landscape layer). Kept in a 0×0 SVG that stays rendered: gradients inside a
// display:none SVG stop working in some browsers.

const PETAL_D = 'M0 0C17-5 24-30 10-46L0-39-10-46C-24-30-17-5 0 0Z'
const DOTS_D = Array.from({ length: 6 }, (_, i) => {
  const a = (i / 6) * Math.PI * 2 + 0.3
  const x = (Math.cos(a) * 10).toFixed(1)
  const y = (Math.sin(a) * 10).toFixed(1)
  return `M${x} ${y}m-1.7 0a1.7 1.7 0 1 0 3.4 0a1.7 1.7 0 1 0-3.4 0`
}).join('')

// [id, centre colour, middle, petal tips]
const BLOSSOMS = [
  ['deep', '#c93a6c', '#ef7aa1', '#ffc0d3'],
  ['mid', '#e0457b', '#ff98b9', '#ffe0ea'],
  ['light', '#ec6593', '#ffc0d3', '#fff6f9'],
]

export default function SvgDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="hill-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f9c3d3" />
          <stop offset="0.45" stopColor="#f2a5bc" />
          <stop offset="1" stopColor="#e7849f" />
        </linearGradient>
        <linearGradient id="far-hill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fcd3de" />
          <stop offset="1" stopColor="#f3aac0" />
        </linearGradient>
        <linearGradient id="bark-trunk" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3e2118" />
          <stop offset="0.4" stopColor="#6b3f2d" />
          <stop offset="0.58" stopColor="#8c573f" />
          <stop offset="0.82" stopColor="#5a3324" />
          <stop offset="1" stopColor="#3b1f16" />
        </linearGradient>
        <linearGradient id="bark-limb" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8c573f" />
          <stop offset="0.5" stopColor="#6b3f2d" />
          <stop offset="1" stopColor="#3e2118" />
        </linearGradient>
        <radialGradient id="pad-glow">
          <stop offset="0" stopColor="#ffaac6" stopOpacity="0.85" />
          <stop offset="0.6" stopColor="#ffb6ce" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffbed2" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="tree-shadow">
          <stop offset="0" stopColor="#962855" stopOpacity="0.38" />
          <stop offset="1" stopColor="#962855" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="grass" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#2f7a3a" />
          <stop offset="1" stopColor="#92d47c" />
        </linearGradient>

        {BLOSSOMS.map(([id, c0, c1, c2]) => (
          <radialGradient key={id} id={`sk-${id}`} gradientUnits="userSpaceOnUse" cx="0" cy="0" r="46">
            <stop offset="0" stopColor={c0} />
            <stop offset="0.32" stopColor={c1} />
            <stop offset="1" stopColor={c2} />
          </radialGradient>
        ))}
        {BLOSSOMS.map(([id]) => (
          <symbol key={id} id={`sakura-${id}`} viewBox="-50 -50 100 100" overflow="visible">
            <g fill={`url(#sk-${id})`}>
              {[0, 72, 144, 216, 288].map((a) => (
                <path key={a} d={PETAL_D} transform={`rotate(${a})`} />
              ))}
            </g>
            <circle r="5" fill="#ffd27a" />
            <path d={DOTS_D} fill="#e8507f" />
          </symbol>
        ))}
      </defs>
    </svg>
  )
}
