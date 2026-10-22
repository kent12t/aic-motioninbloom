import { useCallback, useEffect, useRef, useState } from 'react'
import { createPoseDetector, drawCameraGuide, maskCameraFrame } from '../game/poseCamera'
import { TRACKING } from '../game/config'
import type { LandmarkPoint } from '../types/game'

type PoseFrame = (points: LandmarkPoint[] | null, now: number) => boolean

export function usePoseCamera(onPose: PoseFrame) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const onPoseRef = useRef(onPose)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [generation, setGeneration] = useState(0)

  useEffect(() => { onPoseRef.current = onPose }, [onPose])

  const attachVideo = useCallback((video: HTMLVideoElement | null) => {
    videoRef.current = video
    if (video && streamRef.current) {
      video.srcObject = streamRef.current
      void video.play().catch(() => undefined)
    }
  }, [])

  useEffect(() => {
    let active = true
    let frame = 0
    let stream: MediaStream | null = null
    let detector: Awaited<ReturnType<typeof createPoseDetector>> | null = null
    let lastInference = -Infinity
    let lastVideoTime = -1
    let lastMissingReport = -Infinity
    const input = document.createElement('canvas')
    const fail = (cause: unknown) => {
      if (!active) return
      cancelAnimationFrame(frame)
      stream?.getTracks().forEach((track) => track.stop())
      detector?.close()
      detector = null
      streamRef.current = null
      setError(cause instanceof Error ? cause.message : 'Camera unavailable')
      setStatus('error')
      onPoseRef.current(null, performance.now())
    }
    const animate = (now: number) => {
      if (!active) return
      const video = videoRef.current
      if (video && detector && video.readyState >= 2 && video.videoWidth
        && now - lastInference >= 1000 / TRACKING.fps && video.currentTime !== lastVideoTime) {
        try {
          lastInference = now
          lastVideoTime = video.currentTime
          maskCameraFrame(video, input)
          const result = detector.detectForVideo(input, now)
          const points = result.landmarks[0]?.map(({ x, y, visibility }) => ({
            x, y, visibility: visibility ?? 0,
          })) ?? null
          const accepted = onPoseRef.current(points, now)
          if (overlayRef.current) drawCameraGuide(overlayRef.current, video, points, accepted)
        } catch (cause) {
          fail(cause)
          return
        }
      } else if (now - lastInference > TRACKING.lostMs && now - lastMissingReport >= 100) {
        lastMissingReport = now
        onPoseRef.current(null, now)
      }
      frame = requestAnimationFrame(animate)
    }
    const setup = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false, video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        if (!active) { stream.getTracks().forEach((track) => track.stop()); return }
        streamRef.current = stream
        for (const track of stream.getVideoTracks()) {
          track.addEventListener('ended', () => fail(new Error('Camera disconnected. Reconnect it and retry.')))
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        if (!active) return
        detector = await createPoseDetector()
        if (!active) { detector.close(); detector = null; return }
        setStatus('ready')
        frame = requestAnimationFrame(animate)
      } catch (cause) { fail(cause) }
    }
    void setup()
    return () => {
      active = false
      cancelAnimationFrame(frame)
      detector?.close()
      stream?.getTracks().forEach((track) => track.stop())
      if (streamRef.current === stream) streamRef.current = null
    }
  }, [generation])

  const retry = useCallback(() => {
    setStatus('loading')
    setError('')
    setGeneration((value) => value + 1)
  }, [])

  return { attachVideo, overlayRef, status, error, retry }
}
