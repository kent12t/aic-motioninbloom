import { useCallback, useEffect, useRef, useState } from 'react'
import type { Flower } from '../../game/flowerRound'

// Remount per cycle, even when the random flower matches the previous cycle.
export function FlowerVideo({ flower, blooming, visible = true }: { flower: Flower; blooming: boolean; visible?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const shouldPlay = useRef(blooming)
  const [fallback, setFallback] = useState(false)
  const [ended, setEnded] = useState(false)
  const active = useRef(false)
  const frame = useRef(0)
  const play = useCallback(() => {
    const video = videoRef.current
    if (!video || !shouldPlay.current || active.current || video.ended
      || !Number.isFinite(video.duration) || video.duration <= 0) return
    active.current = true
    // Keep the opening motion readable; compress the lingering final fifth.
    const updateRate = () => {
      if (!shouldPlay.current || video.ended) return
      video.playbackRate = Math.min(16, Math.max(0.25,
        video.currentTime < video.duration * 0.8 ? video.duration * 0.8 / 2.6 : video.duration * 0.2 / 0.4))
      frame.current = requestAnimationFrame(updateRate)
    }
    updateRate()
    void video.play().catch(() => {
      cancelAnimationFrame(frame.current)
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
      active.current = false
      cancelAnimationFrame(frame.current)
      video?.pause()
    }
  }, [])

  return (
    <div className="flower-video" style={{ visibility: visible ? 'visible' : 'hidden' }}
      aria-hidden={!visible} aria-label={`${flower} flower ${blooming ? 'blooming' : 'ready to bloom'}`} role="img">
      <video ref={videoRef} src={`/videos/${flower}.webm`} poster={`/videos/${flower}-bud.png`}
        preload="auto" muted playsInline onCanPlay={play} onError={() => setFallback(true)}
        onEnded={() => { cancelAnimationFrame(frame.current); setEnded(true) }}
        hidden={fallback || ended} />
      {(fallback || ended) && <img src={`/videos/${flower}-${blooming ? 'bloom' : 'bud'}.png`} alt="" />}
      <img hidden src={`/videos/${flower}-bloom.png`} alt="" />
    </div>
  )
}
