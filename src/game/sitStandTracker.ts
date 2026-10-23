import { LANDMARK, type LandmarkPoint, type Posture } from '../types/game'
import { TRACKING } from './config'

type AnchorName = 'hips' | 'shoulders' | 'head'
interface Anchor { x: number; y: number }
type Anchors = Record<AnchorName, Anchor | null>
interface Measurement {
  anchors: Anchors
  torso: number | null
  gap: number | null
}
interface Baseline {
  anchors: Anchors
  torso: number
}
const anchorNames: AnchorName[] = ['hips', 'shoulders', 'head']

export interface TrackingFeedback {
  ready: boolean
  progress: number
  message: string
  repetition: boolean
  accepted: boolean
  stood: boolean
}

function measure(points: LandmarkPoint[], baseline: Baseline | null): Measurement | null {
  const { zone, visibility } = TRACKING
  const anchor = (indices: number[], name?: AnchorName): Anchor | null => {
    const joints = indices.map(i => points[i])
    if (joints.some(p => !p || !Number.isFinite(p.visibility) || p.visibility < visibility
      || !Number.isFinite(p.x) || !Number.isFinite(p.y)
      || p.x < zone.left + 0.025 || p.x > zone.right - 0.025
      || p.y < zone.top || p.y > zone.bottom)) return null
    const value = {
      x: joints.reduce((sum, p) => sum + p.x / joints.length, 0),
      y: joints.reduce((sum, p) => sum + p.y / joints.length, 0),
    }
    const base = name && baseline?.anchors[name]
    if (baseline && name && (!base || Math.abs(value.x - base.x) >= TRACKING.centerDrift)) return null
    return value
  }
  const hips = anchor([LANDMARK.LEFT_HIP, LANDMARK.RIGHT_HIP], 'hips')
  const shoulders = anchor([LANDMARK.LEFT_SHOULDER, LANDMARK.RIGHT_SHOULDER], 'shoulders')
  const head = anchor([LANDMARK.NOSE], 'head')
  if (!hips && !shoulders && !head) return null
  const torso = hips && shoulders ? hips.y - shoulders.y : null
  if (torso !== null && (torso < 0.08 || (baseline && (
    torso / baseline.torso <= TRACKING.torsoScale.min
    || torso / baseline.torso >= TRACKING.torsoScale.max)))) return null
  const knees = anchor([LANDMARK.LEFT_KNEE, LANDMARK.RIGHT_KNEE])
  return { anchors: { hips, shoulders, head }, torso,
    gap: knees && hips && torso ? (knees.y - hips.y) / torso : null }
}

export class SitStandTracker {
  private baseline: Baseline | null = null
  private samples: Measurement[] = []
  private calibrationSince = 0
  private smooth: Anchors = { hips: null, shoulders: null, head: null }
  private lastValid = 0
  private lastSample = 0
  private posture: Posture = 'unknown'
  private candidate: Posture = 'unknown'
  private candidateSince = 0
  private candidateFrames = 0
  private hasStood = false
  private raisedAnchors = new Set<AnchorName>()
  private riseSince: Partial<Record<AnchorName, number>> = {}

  reset() {
    this.baseline = null
    this.samples = []
    this.calibrationSince = 0
    this.lastValid = 0
    this.lastSample = 0
    this.clearCycle()
  }

  private clearCycle() {
    this.smooth = { hips: null, shoulders: null, head: null }
    this.posture = 'unknown'
    this.candidate = 'unknown'
    this.candidateSince = 0
    this.candidateFrames = 0
    this.hasStood = false
    this.raisedAnchors.clear()
    this.riseSince = {}
  }

  update(points: LandmarkPoint[] | null, now: number, playing: boolean): TrackingFeedback {
    const feedback = (message: string, accepted = false, repetition = false): TrackingFeedback => ({
      ready: this.baseline !== null && accepted,
      progress: this.baseline ? 1 : this.samples.length ? Math.min(1, (now - this.calibrationSince) / TRACKING.calibrationMs) : 0,
      message, accepted, repetition, stood: false,
    })
    const measured = points ? measure(points, this.baseline) : null
    if (!measured) {
      this.samples = []
      this.calibrationSince = now
      // Missing joints are never evidence of upward movement or a seated return.
      this.candidate = 'unknown'
      this.candidateSince = now
      this.candidateFrames = 0
      this.riseSince = {}
      this.smooth = { hips: null, shoulders: null, head: null }
      if (now - this.lastValid >= TRACKING.lostMs) {
        this.clearCycle()
        if (!playing) this.baseline = null
      }
      return feedback('Stay centred in the guide so we can see your movement.')
    }
    if (this.lastValid && now - this.lastValid >= TRACKING.lostMs) this.clearCycle()
    const dt = this.lastSample ? now - this.lastSample : 50
    this.lastSample = now
    this.lastValid = now
    if (!this.baseline) {
      const { hips, shoulders } = measured.anchors
      if (!hips || !shoulders || !measured.torso) {
        this.samples = []
        this.calibrationSince = now
        return feedback('Sit inside the guide with shoulders and hips visible.', true)
      }
      // Use knees when available for setup, but never make them a counting gate.
      if (measured.gap !== null && (measured.gap > TRACKING.seatedGapRange.max
        || measured.gap < TRACKING.seatedGapRange.min)) {
        this.samples = []
        this.calibrationSince = now
        return feedback('Sit fully in the chair to set your starting position.', true)
      }
      const first = this.samples[0]
      if (!first || anchorNames.some(name => {
        const a = first.anchors[name]
        const b = measured.anchors[name]
        return a && b && (Math.abs(a.y - b.y) > 0.025 || Math.abs(a.x - b.x) > 0.025)
      })) {
        this.samples = []
        this.calibrationSince = now
      }
      this.samples.push(measured)
      if (now - this.calibrationSince < TRACKING.calibrationMs || this.samples.length < 15) {
        return feedback('Sit still while we set your starting position…', true)
      }
      const anchors = { hips: null, shoulders: null, head: null } as Anchors
      for (const name of anchorNames) {
        const values = this.samples.map(p => p.anchors[name]).filter((p): p is Anchor => p !== null)
        if (values.length >= 15) anchors[name] = {
          x: values.reduce((sum, p) => sum + p.x / values.length, 0),
          y: values.reduce((sum, p) => sum + p.y / values.length, 0),
        }
      }
      this.baseline = { anchors,
        torso: this.samples.reduce((sum, p) => sum + p.torso! / this.samples.length, 0) }
      this.samples = []
      this.posture = 'sitting'
    }
    const base = this.baseline
    const alpha = 1 - Math.exp(-dt / TRACKING.smoothingMs)
    const rises: Partial<Record<AnchorName, number>> = {}
    for (const name of anchorNames) {
      const current = measured.anchors[name]
      const reference = base.anchors[name]
      const previous = this.smooth[name]
      this.smooth[name] = current && reference ? { ...current,
        y: previous ? previous.y + alpha * (current.y - previous.y) : current.y } : null
      const smoothed = this.smooth[name]
      if (smoothed && reference) rises[name] = (reference.y - smoothed.y) / base.torso
    }
    // Any calibrated anchor can confirm a rise. A previously risen anchor must
    // return to seated height (or lower); missing/unrelated anchors cannot score.
    const standing = anchorNames.some(name => (rises[name] ?? -Infinity) > TRACKING.rise[name])
    for (const name of anchorNames) {
      if ((rises[name] ?? -Infinity) > TRACKING.rise[name]) this.riseSince[name] ??= now
      else delete this.riseSince[name]
    }
    const confirmedAnchors = anchorNames.filter(name => this.riseSince[name] !== undefined
      && now - this.riseSince[name] >= TRACKING.holdMs)
    if (this.hasStood) for (const name of confirmedAnchors) this.raisedAnchors.add(name)
    const returned = (name: AnchorName) => rises[name] !== undefined
      && rises[name] < TRACKING.seatedTolerance[name]
    // Prefer hips, then shoulders, then head when available. A head nod while
    // the risen hips are still high must not complete/rearm another repetition.
    const returnAnchor = anchorNames.find(name => this.raisedAnchors.has(name) && rises[name] !== undefined)
    const sitting = this.hasStood ? returnAnchor !== undefined && returned(returnAnchor)
      : Object.keys(rises).length > 0 && anchorNames.every(name => rises[name] === undefined || returned(name))
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
      this.candidateFrames = 0
    }
    this.candidateFrames++
    let repetition = false
    let stood = false
    if (detected !== 'unknown' && detected !== this.posture && this.candidateFrames >= 2
      && now - this.candidateSince >= TRACKING.holdMs
      && (detected !== 'standing' || confirmedAnchors.length > 0)) {
      const previousPosture = this.posture
      this.posture = detected
      if (detected === 'standing' && previousPosture === 'sitting') {
        this.hasStood = true
        this.raisedAnchors = new Set(confirmedAnchors)
        stood = true
      }
      if (detected === 'sitting') {
        repetition = this.hasStood
        this.hasStood = false
        this.raisedAnchors.clear()
      }
    }
    const result = feedback(this.hasStood ? 'Sit back down.'
      : this.posture === 'unknown' ? 'Return to your seated starting position.'
        : 'Keep standing up and sitting down.', true, repetition)
    result.stood = stood
    return result
  }
}
