import { useEffect, useRef, useState, type Ref } from 'react'
import { PoseStatus } from './PoseStatus'
import type { DetectedPose } from '../../game/sitStandTracker'

interface CameraViewProps {
  videoRef: Ref<HTMLVideoElement>
  overlayRef: Ref<HTMLCanvasElement>
  pose: DetectedPose
  loading?: boolean
  message: string
  calibrationProgress?: number
  error?: string
  onRetry: () => void
  onClose: () => void
  ready: boolean
  hidden?: boolean
  setup?: boolean
  rotated?: boolean
  onRotate?: () => void
}

export function CameraView({ videoRef, overlayRef, pose, loading, calibrationProgress, error, onRetry, onClose, ready, hidden, setup, rotated, onRotate }: CameraViewProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [wideFeed, setWideFeed] = useState(true)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (setup && !hidden) {
      if (!dialog.open) dialog.showModal()
    } else if (dialog.open) {
      dialog.close()
    }
  }, [setup, hidden])

  return (
    <section className={`camera-panel ${hidden ? 'camera-hidden' : ''} ${setup ? 'camera-setup' : 'camera-pose'}`} aria-label={setup ? 'Player camera' : 'Detected movement'} aria-hidden={hidden || undefined}>
      <dialog ref={dialogRef} id="setup-camera-dialog" className="camera-dialog"
        aria-labelledby={setup ? 'camera-dialog-title' : undefined}
        aria-describedby={setup ? 'camera-dialog-guidance' : undefined}
        onKeyDown={(event) => {
          if (event.key !== 'Tab' || !setup) return
          const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
          const first = buttons[0]
          const last = buttons[buttons.length - 1]
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last?.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first?.focus()
          }
        }}
        onCancel={(event) => { event.preventDefault(); onClose() }}>
        {setup && <header className="camera-dialog-header">
          <div>
            <p className="camera-dialog-eyebrow">GET COMFORTABLE</p>
            <h2 id="camera-dialog-title"><span className="windsor">Check your camera</span></h2>
          </div>
          <button className="camera-dialog-close" onClick={onClose} aria-label="Close camera check" autoFocus>
            <img src="/close-camera.svg" alt="" />
          </button>
        </header>}
        <div className="camera-stage">
          <video ref={videoRef} autoPlay playsInline muted style={{ objectFit: wideFeed ? 'cover' : 'contain', transform: rotated ? 'scaleX(-1) rotate(180deg)' : 'scaleX(-1)' }}
            onLoadedMetadata={event => setWideFeed(event.currentTarget.videoWidth / event.currentTarget.videoHeight >= 1.5)} />
          <canvas ref={overlayRef} className="camera-guide" style={{ objectFit: wideFeed ? 'cover' : 'contain' }} />
          {setup && error && <div className="camera-unavailable" aria-hidden="true">
            <img src="/camera-unavailable.svg" alt="" />
            <span>Let’s get you connected</span>
          </div>}
        </div>
        {!setup && <PoseStatus pose={pose} error={error} loading={loading} />}
        {setup ? <>
          <div className={`camera-dialog-status ${error ? 'camera-status-error' : ready ? 'camera-status-ready' : ''}`}>
            <p role={hidden ? undefined : 'status'}><span className="camera-status-dot" aria-hidden="true" />{error ? 'Camera needs attention' : ready ? 'You’re in position!' : 'Finding your seated position'}</p>
            {!error && calibrationProgress !== undefined && <progress className="calibration-progress" value={calibrationProgress} max={1} aria-label="Seated calibration" />}
          </div>
          <p id="camera-dialog-guidance" className="camera-dialog-guidance">Stay seated and centered. Keep your head or shoulders inside the guide.</p>
          {error && <p className="camera-dialog-feedback">{error}</p>}
          <div className="camera-dialog-actions">
            {onRotate && <button className="camera-retry-button" onClick={onRotate} aria-pressed={!!rotated}>Rotate 180°</button>}
            {error && <button className="camera-retry-button" onClick={onRetry}>Retry camera</button>}
            <button className="primary-button camera-done-button" onClick={onClose}><span className="windsor">Done</span></button>
          </div>
        </> : <>
          {error && !hidden && <button className="retry-camera" onClick={onRetry}>Retry camera</button>}
        </>}
      </dialog>
    </section>
  )
}
