import type { RefObject } from 'react'

interface CameraPanelProps {
  timerLabel: string
  poseState: string
  videoRef: RefObject<HTMLVideoElement | null>
  overlayRef: RefObject<HTMLCanvasElement | null>
}

export function CameraPanel({ timerLabel, poseState, videoRef, overlayRef }: CameraPanelProps) {
  return (
    <section className="camera-card">
      <div className="camera-title-row">
        <div>
          <p className="eyebrow">Motion in Bloom</p>
          <h1>Bloom Through Movement</h1>
        </div>
        <div className="timer-pill">{timerLabel}</div>
      </div>
      <div className="camera-stage">
        <video ref={videoRef} autoPlay playsInline muted />
        <canvas ref={overlayRef} />
      </div>
      <p className="pose-state">{poseState}</p>
    </section>
  )
}
