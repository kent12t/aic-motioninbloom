import { useCallback, useEffect, useRef, useState } from 'react'
import type { Flower } from '../../game/flowerRound'

// Remount per cycle, even when the random flower matches the previous cycle.
export function FlowerVideo({ flower, blooming }: { flower: Flower; blooming: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const shouldPlay = useRef(blooming)
  const [fallback, setFallback] = useState(false)
  const play = useCallback(() => {
    const video = videoRef.current
    if (!video || !shouldPlay.current || video.ended) return
    void video.play().catch(() => {
      if (shouldPlay.current) setFallback(true)
    })
  }, [])

  useEffect(() => {
    shouldPlay.current = blooming
    if (blooming) play()
  }, [blooming, play])

  useEffect(() => {
    const video = videoRef.current
    return () => {
      shouldPlay.current = false
      video?.pause()
    }
  }, [])

  return (
    <div className="flower-video" aria-label={`${flower} flower ${blooming ? 'blooming' : 'ready to bloom'}`} role="img">
      <video ref={videoRef} src={`/videos/${flower}.webm`} poster={`/videos/${flower}-bud.png`}
        preload="auto" muted playsInline onCanPlay={play} onError={() => setFallback(true)}
        hidden={fallback} />
      {fallback && <img src={`/videos/${flower}-${blooming ? 'bloom' : 'bud'}.png`} alt="" />}
    </div>
  )
}
