import { LANDMARK, type LandmarkPoint, type Posture } from '../types/game'
import { TRACKING } from './config'

interface Measurement {
  gap: number
  hipY: number
  centerX: number
  torso: number
}

export interface TrackingFeedback {
  ready: boolean
  progress: number
  message: string
  repetition: boolean
  accepted: boolean
  stood: boolean
}

function measure(points: LandmarkPoint[]): Measurement | null {
  const indices = [LANDMARK.LEFT_SHOULDER, LANDMARK.RIGHT_SHOULDER, LANDMARK.LEFT_HIP,
    LANDMARK.RIGHT_HIP, LANDMARK.LEFT_KNEE, LANDMARK.RIGHT_KNEE]
  const { zone, visibility } = TRACKING
  if (indices.some((i) => {
    const p = points[i]
    return !p || !Number.isFinite(p.visibility) || p.visibility < visibility
      || !Number.isFinite(p.x) || !Number.isFinite(p.y)
      || p.x < zone.left + 0.025 || p.x > zone.right - 0.025 || p.y < zone.top || p.y > zone.bottom
  })) return null
  const hipY = (points[LANDMARK.LEFT_HIP].y + points[LANDMARK.RIGHT_HIP].y) / 2
  const shoulderY = (points[LANDMARK.LEFT_SHOULDER].y + points[LANDMARK.RIGHT_SHOULDER].y) / 2
  const torso = hipY - shoulderY
  if (torso < 0.08) return null
  return {
    gap: ((points[LANDMARK.LEFT_KNEE].y + points[LANDMARK.RIGHT_KNEE].y) / 2 - hipY) / torso,
    hipY,
    centerX: (points[LANDMARK.LEFT_HIP].x + points[LANDMARK.RIGHT_HIP].x) / 2,
    torso,
  }
}

export class SitStandTracker {
  private baseline: Measurement | null = null
  private samples: Measurement[] = []
  private calibrationSince = 0
  private smooth: Measurement | null = null
  private lastValid = 0
  private lastSample = 0
  private posture: Posture = 'unknown'
  private candidate: Posture = 'unknown'
  private candidateSince = 0
  private hasStood = false

  reset() {
    this.baseline = null
    this.samples = []
    this.calibrationSince = 0
    this.lastValid = 0
    this.lastSample = 0
    this.clearCycle()
  }

  private clearCycle() {
    this.smooth = null
    this.posture = 'unknown'
    this.candidate = 'unknown'
    this.candidateSince = 0
    this.hasStood = false
  }

  update(points: LandmarkPoint[] | null, now: number, playing: boolean): TrackingFeedback {
    const feedback = (message: string, accepted = false, repetition = false): TrackingFeedback => ({
      ready: this.baseline !== null && accepted,
      progress: this.baseline ? 1 : this.samples.length ? Math.min(1, (now - this.calibrationSince) / TRACKING.calibrationMs) : 0,
      message, accepted, repetition, stood: false,
    })
    const measured = points ? measure(points) : null
    const baseline = this.baseline
    const continuous = measured && (!baseline || (
      Math.abs(measured.centerX - baseline.centerX) < TRACKING.centerDrift
      && measured.torso / baseline.torso > TRACKING.torsoScale.min
      && measured.torso / baseline.torso < TRACKING.torsoScale.max
    ))
    if (!measured || !continuous) {
      this.samples = []
      this.calibrationSince = now
      // An occlusion must never contribute to a stable-pose hold.
      this.candidate = 'unknown'
      this.candidateSince = now
      if (now - this.lastValid >= TRACKING.lostMs) {
        this.clearCycle()
        if (!playing) this.baseline = null
      }
      return feedback('Stay inside the guide with shoulders, hips and knees visible.')
    }
    if (this.lastValid && now - this.lastValid >= TRACKING.lostMs) this.clearCycle()
    const dt = this.lastSample ? now - this.lastSample : 50
    this.lastSample = now
    this.lastValid = now
    if (!this.baseline) {
      // A standing participant must not be accepted as a seated baseline.
      if (measured.gap > TRACKING.seatedGapRange.max || measured.gap < TRACKING.seatedGapRange.min) {
        this.samples = []
        this.calibrationSince = now
        return feedback('Sit fully in the chair to set your starting position.', true)
      }
      const first = this.samples[0]
      if (!first || Math.abs(first.gap - measured.gap) > 0.12
        || Math.abs(first.hipY - measured.hipY) > 0.025
        || Math.abs(first.centerX - measured.centerX) > 0.025) {
        this.samples = []
        this.calibrationSince = now
      }
      this.samples.push(measured)
      if (now - this.calibrationSince < TRACKING.calibrationMs || this.samples.length < 15) {
        return feedback('Sit still while we set your starting position…', true)
      }
      this.baseline = this.samples.reduce((sum, p) => ({
        gap: sum.gap + p.gap / this.samples.length,
        hipY: sum.hipY + p.hipY / this.samples.length,
        centerX: sum.centerX + p.centerX / this.samples.length,
        torso: sum.torso + p.torso / this.samples.length,
      }), { gap: 0, hipY: 0, centerX: 0, torso: 0 })
      this.posture = 'sitting'
    }
    const base = this.baseline
    const alpha = 1 - Math.exp(-dt / TRACKING.smoothingMs)
    const previous = this.smooth ?? measured
    this.smooth = {
      ...measured,
      gap: previous.gap + alpha * (measured.gap - previous.gap),
      hipY: previous.hipY + alpha * (measured.hipY - previous.hipY),
    }
    const rise = (base.hipY - this.smooth.hipY) / base.torso
    const standing = this.smooth.gap > Math.max(TRACKING.standingGap, base.gap + TRACKING.standingGapDelta)
      && rise > TRACKING.standingRise
    const sitting = this.smooth.gap < base.gap + TRACKING.seatedGapDelta
      && Math.abs(rise) < TRACKING.seatedRiseTolerance
    if (!playing) {
      const result = feedback(sitting ? 'Starting position set. Stay seated and press Play now.'
        : 'Return to your seated starting position before beginning.', true)
      result.ready = sitting
      return result
    }
    const detected: Posture = standing ? 'standing' : sitting ? 'sitting' : 'unknown'
    if (detected !== this.candidate) {
      this.candidate = detected
      this.candidateSince = now
    }
    let repetition = false
    let stood = false
    if (detected !== 'unknown' && detected !== this.posture && now - this.candidateSince >= TRACKING.holdMs) {
      const previousPosture = this.posture
      this.posture = detected
      if (detected === 'standing' && previousPosture === 'sitting') {
        this.hasStood = true
        stood = true
      }
      if (detected === 'sitting') {
        repetition = this.hasStood
        this.hasStood = false
      }
    }
    const result = feedback(this.hasStood ? 'Sit back down fully.'
      : this.posture === 'unknown' ? 'Return to your seated starting position.'
        : 'Stand up fully, then sit back down.', true, repetition)
    result.stood = stood
    return result
  }
}
