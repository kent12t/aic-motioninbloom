import type { DetectedPose } from '../../game/sitStandTracker'

const poses = {
  sitting: { image: 'sitting', label: 'Sitting' },
  transition: { image: 'transition', label: 'Transition' },
  standing: { image: 'standing', label: 'Standing' },
  unknown: { image: 'sitting', label: 'Finding position' },
} as const

// Original asset dimensions: one shared viewBox gives every pose the same
// scale factor instead of stretching each image to fill the illustration area.
const imageSizes = {
  sitting: { width: 206, height: 554 },
  transition: { width: 194, height: 632 },
  standing: { width: 173, height: 693 },
} as const

export function PoseStatus({ pose, error, loading }: { pose: DetectedPose; error?: string; loading?: boolean }) {
  const state = poses[error || loading ? 'unknown' : pose]
  const size = imageSizes[state.image]
  return <div className={`pose-status ${pose === 'unknown' || error || loading ? 'pose-status-waiting' : ''}`}>
    <p className="pose-status-eyebrow">Detected Motion</p>
    <div className="pose-status-art">
      <svg viewBox="0 0 206 693" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        <image href={`/${state.image}.png`} width={size.width} height={size.height}
          x={(206 - size.width) / 2} y={693 - size.height} />
      </svg>
    </div>
    <div className="pose-status-copy" role="status" aria-live="polite" aria-atomic="true">
      <h2>{error ? 'Camera unavailable' : loading ? 'Getting ready' : state.label}</h2>
    </div>
  </div>
}
