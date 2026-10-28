import { useCallback, useEffect, useRef, useState } from 'react'
import { createPoseDetector, drawCameraGuide, maskCameraFrame } from '../game/poseCamera'
import { TRACKING } from '../game/config'
import { MainPlayer } from '../game/mainPlayer'
import type { LandmarkPoint } from '../types/game'

type PoseFrame = (points: LandmarkPoint[] | null, now: number) => boolean

export function usePoseCamera(onPose: PoseFrame, enabled = true) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const onPoseRef = useRef(onPose)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [generation, setGeneration] = useState(0)
  const [detectorGeneration, setDetectorGeneration] = useState(0)
  const detectorPromise = useRef<ReturnType<typeof createPoseDetector> | null>(null)
  const detectorFailed = useRef(false)

  // Initialize the actual WASM/model instance on load, without camera access.
  // This effect owns the detector; camera sessions only borrow it.
  useEffect(() => {
    let active = true
    let loaded: Awaited<ReturnType<typeof createPoseDetector>> | null = null
    detectorFailed.current = false
    const promise = createPoseDetector()
    detectorPromise.current = promise
    void promise.then(detector => {
      if (!active) detector.close()
      else loaded = detector
    }).catch(() => { if (active) detectorFailed.current = true }) // Report when camera is requested.
    return () => {
      active = false
      loaded?.close()
      if (detectorPromise.current === promise) detectorPromise.current = null
    }
  }, [detectorGeneration])

  useEffect(() => { onPoseRef.current = onPose }, [onPose])

  const attachVideo = useCallback((video: HTMLVideoElement | null) => {
    videoRef.current = video
    if (video && streamRef.current) {
      video.srcObject = streamRef.current
      void video.play().catch(() => undefined)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    let active = true
    let frame = 0
    let stream: MediaStream | null = null
    let detector: Awaited<ReturnType<typeof createPoseDetector>> | null = null
    let lastInference = -Infinity
    let lastVideoFrame = ''
    let lastMissingReport = -Infinity
    const input = document.createElement('canvas')
    const player = new MainPlayer()
    const fail = (cause: unknown) => {
      if (!active) return
      cancelAnimationFrame(frame)
      stream?.getTracks().forEach((track) => track.stop())
      detector = null
      streamRef.current = null
      setError(cause instanceof Error ? cause.message : 'Camera unavailable')
      setStatus('error')
      onPoseRef.current(null, performance.now())
    }
    const animate = (now: number) => {
      if (!active) return
      const video = videoRef.current
      // A live stream's media clock can advance without a new camera frame
      // (for example, a static canvas capture). Do not infer the same decoded
      // frame on every animation tick, especially with software-only WebGL.
      const decodedFrames = video?.getVideoPlaybackQuality?.().totalVideoFrames ?? 0
      const videoFrame = decodedFrames > 0 ? `frame:${decodedFrames}` : `time:${video?.currentTime}`
      if (video && detector && video.readyState >= 2 && video.videoWidth
        && now - lastInference >= 1000 / TRACKING.fps && videoFrame !== lastVideoFrame) {
        try {
          lastInference = now
          lastVideoFrame = videoFrame
          maskCameraFrame(video, input, player.zone)
          const result = detector.detectForVideo(input, now)
          const poses = result.landmarks.map(pose => pose.map(({ x, y, visibility }) => ({
            x, y, visibility: visibility ?? 0,
          })))
          const points = player.select(poses, now)
          const accepted = onPoseRef.current(points, now)
          if (overlayRef.current) drawCameraGuide(overlayRef.current, video, points, accepted, player.zone)
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
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera requires HTTPS or localhost. Open the game in a secure browser tab.')
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false, video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 1280 } },
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
        const prepared = await detectorPromise.current
        if (!active) return
        if (!prepared) throw new Error('Pose detector is not ready. Please retry.')
        detector = prepared
        setStatus('ready')
        frame = requestAnimationFrame(animate)
      } catch (cause) { fail(cause) }
    }
    void setup()
    return () => {
      active = false
      cancelAnimationFrame(frame)
      detector = null
      stream?.getTracks().forEach((track) => track.stop())
      if (streamRef.current === stream) streamRef.current = null
    }
  }, [enabled, generation])

  const retry = useCallback(() => {
    setStatus('loading')
    setError('')
    if (detectorFailed.current) setDetectorGeneration(value => value + 1)
    setGeneration((value) => value + 1)
  }, [])

  return { attachVideo, overlayRef, status, error, retry }
}
