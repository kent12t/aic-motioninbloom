import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'
import { TRACKING } from './config'
import type { LandmarkPoint } from '../types/game'

export async function createPoseDetector() {
  const base = `${import.meta.env.BASE_URL}mediapipe/`
  const vision = await FilesetResolver.forVisionTasks(`${base}wasm`)
  const options = {
    runningMode: 'VIDEO' as const,
    numPoses: 1,
    minPoseDetectionConfidence: 0.6,
    minPosePresenceConfidence: 0.6,
    minTrackingConfidence: 0.6,
  }
  try {
    return await PoseLandmarker.createFromOptions(vision, {
      ...options, baseOptions: { modelAssetPath: `${base}pose_landmarker_lite.task`, delegate: 'GPU' },
    })
  } catch {
    return PoseLandmarker.createFromOptions(vision, {
      ...options, baseOptions: { modelAssetPath: `${base}pose_landmarker_lite.task`, delegate: 'CPU' },
    })
  }
}

// The detector receives the masked image, not the original webcam frame.
export function maskCameraFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
  if (canvas.width !== 640) canvas.width = 640
  const height = Math.round(640 * video.videoHeight / video.videoWidth)
  if (canvas.height !== height) canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not create camera processing canvas.')
  const { left, right, top, bottom } = TRACKING.zone
  context.fillStyle = '#000'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(video,
    left * video.videoWidth, top * video.videoHeight,
    (right - left) * video.videoWidth, (bottom - top) * video.videoHeight,
    left * canvas.width, top * canvas.height,
    (right - left) * canvas.width, (bottom - top) * canvas.height)
}

export function drawCameraGuide(canvas: HTMLCanvasElement, video: HTMLVideoElement,
  points: LandmarkPoint[] | null, accepted: boolean) {
  if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth
  if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight
  const context = canvas.getContext('2d')
  if (!context) return
  const { width: w, height: h } = canvas
  const { left, right, top, bottom } = TRACKING.zone
  context.clearRect(0, 0, w, h)
  context.fillStyle = 'rgba(0,0,0,.7)'
  context.fillRect(0, 0, w, h)
  context.clearRect(left * w, top * h, (right - left) * w, (bottom - top) * h)
  context.strokeStyle = accepted ? '#95e3a4' : '#f8d65c'
  context.lineWidth = 4
  context.strokeRect(left * w, top * h, (right - left) * w, (bottom - top) * h)
  if (!accepted || !points) return
  context.fillStyle = '#95e3a4'
  for (const p of points) {
    if (p.visibility < TRACKING.visibility || p.x < left || p.x > right || p.y < top || p.y > bottom) continue
    context.beginPath()
    context.arc(p.x * w, p.y * h, 4, 0, Math.PI * 2)
    context.fill()
  }
}
