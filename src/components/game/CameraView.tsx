import { useEffect, useRef, type Ref } from 'react'

interface CameraViewProps {
  videoRef: Ref<HTMLVideoElement>
  overlayRef: Ref<HTMLCanvasElement>
  message: string
  calibrationProgress?: number
  error?: string
  onRetry: () => void
  onClose: () => void
  ready: boolean
  hidden?: boolean
  setup?: boolean
  showMessage?: boolean
}

export function CameraView({ videoRef, overlayRef, message, calibrationProgress, error, onRetry, onClose, ready, hidden, setup, showMessage }: CameraViewProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

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
    <section className={`camera-panel ${hidden ? 'camera-hidden' : ''} ${setup ? 'camera-setup' : ''}`} aria-label="Player camera" aria-hidden={hidden || undefined}>
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
          <video ref={videoRef} autoPlay playsInline muted />
          <canvas ref={overlayRef} />
          {setup && error && <div className="camera-unavailable" aria-hidden="true">
            <img src="/camera-unavailable.svg" alt="" />
            <span>Let’s get you connected</span>
          </div>}
        </div>
        {setup ? <>
          <div className={`camera-dialog-status ${error ? 'camera-status-error' : ready ? 'camera-status-ready' : ''}`}>
            <p role={hidden ? undefined : 'status'}><span className="camera-status-dot" aria-hidden="true" />{error ? 'Camera needs attention' : ready ? 'You’re in position!' : 'Finding your seated position'}</p>
            {!error && calibrationProgress !== undefined && <progress className="calibration-progress" value={calibrationProgress} max={1} aria-label="Seated calibration" />}
          </div>
          <p id="camera-dialog-guidance" className="camera-dialog-guidance">Stay seated and keep your shoulders and hips inside the guide.</p>
          <p className="camera-dialog-feedback">{error || (ready ? 'All set. We’ll keep the camera ready while you continue.' : message)}</p>
          <div className="camera-dialog-actions">
            {error && <button className="camera-retry-button" onClick={onRetry}>Retry camera</button>}
            <button className="primary-button camera-done-button" onClick={onClose}><span className="windsor">Done</span></button>
          </div>
        </> : <>
          {(showMessage || error) && <p className="camera-message" role={hidden ? undefined : 'status'}>{error || message}</p>}
          {error && !hidden && <button className="retry-camera" onClick={onRetry}>Retry camera</button>}
        </>}
      </dialog>
    </section>
  )
}
