import type { Ref } from 'react'

interface CameraViewProps {
  videoRef: Ref<HTMLVideoElement>
  overlayRef: Ref<HTMLCanvasElement>
  message: string
  calibrationProgress?: number
  error?: string
  onRetry: () => void
  hidden?: boolean
  setup?: boolean
  showMessage?: boolean
}

export function CameraView({ videoRef, overlayRef, message, calibrationProgress, error, onRetry, hidden, setup, showMessage }: CameraViewProps) {
  return (
    <section className={`camera-panel ${hidden ? 'camera-hidden' : ''} ${setup ? 'camera-setup' : ''}`} aria-label="Player camera" aria-hidden={hidden || undefined}>
      <div className="camera-stage">
        <video ref={videoRef} autoPlay playsInline muted />
        <canvas ref={overlayRef} />
      </div>
      {(setup || showMessage || error) && <p className="camera-message" role={hidden ? undefined : 'status'}>{error || message}</p>}
      {calibrationProgress !== undefined && (
        <progress className="calibration-progress" value={calibrationProgress} max={1} aria-label="Seated calibration" />
      )}
      {error && !hidden && <button className="retry-camera" onClick={onRetry}>Retry camera</button>}
    </section>
  )
}
