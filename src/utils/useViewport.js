import { useEffect, useState } from 'react'

const read = () => ({ w: window.innerWidth, h: window.innerHeight })

// Window size in CSS pixels, updated (debounced) on resize / rotation.
export function useViewport() {
  const [size, setSize] = useState(read)
  useEffect(() => {
    let id = 0
    const onResize = () => {
      clearTimeout(id)
      id = setTimeout(() => setSize(read()), 120)
    }
    window.addEventListener('resize', onResize)
    return () => {
      clearTimeout(id)
      window.removeEventListener('resize', onResize)
    }
  }, [])
  return size
}
