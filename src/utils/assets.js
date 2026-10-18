import { useEffect, useState } from 'react'

// Optional files (tree.glb, bgm.mp3) may be missing. Dev servers and SPA hosts
// often answer a missing file with index.html, so an HTML response counts as "missing".
export async function assetExists(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-store' })
    if (!res.ok) return false
    const type = (res.headers.get('content-type') || '').toLowerCase()
    return !type.includes('text/html')
  } catch {
    return false
  }
}

// null while checking, then true/false.
export function useAssetExists(url) {
  const [exists, setExists] = useState(null)
  useEffect(() => {
    let alive = true
    assetExists(url).then((ok) => alive && setExists(ok))
    return () => {
      alive = false
    }
  }, [url])
  return exists
}
