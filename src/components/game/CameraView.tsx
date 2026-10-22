import type { Ref } from 'react'

interface CameraViewProps {
  videoRef: Ref<HTMLVideoElement>
  overlayRef: Ref<HTMLCanvasElement>
  message: string
  calibrationProgress?: number
  error?: string
  onRetry: () => void
}

export function CameraView({ videoRef, overlayRef, message, calibrationProgress, error, onRetry }: CameraViewProps) {
  return (
    <section className="camera-panel" aria-label="Player camera">
      <div className="camera-stage">
        <video ref={videoRef} autoPlay playsInline muted />
        <canvas ref={overlayRef} />
      </div>
      <p className="camera-message" role="status">{error || message}</p>
      {calibrationProgress !== undefined && (
        <progress className="calibration-progress" value={calibrationProgress} max={1} aria-label="Seated calibration" />
      )}
      {error && <button onClick={onRetry}>Retry camera</button>}
    </section>
  )
}
