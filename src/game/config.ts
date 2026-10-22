export const GAME = {
  // TEMPORARY: allow screen debugging without a camera/seated baseline.
  // Restore to true to gate Play now and countdown on successful calibration.
  requireCalibration: false,
  target: 5,
  seconds: 40,
  countdown: 3,
} as const

// Coordinates refer to the unmirrored camera image. Keep the zone symmetric.
export const TRACKING = {
  fps: 20,
  zone: { left: 0.2, right: 0.8, top: 0.03, bottom: 0.97 },
  visibility: 0.6,
  calibrationMs: 1500,
  holdMs: 350,
  lostMs: 800,
  smoothingMs: 140,
  seatedGapRange: { min: -0.4, max: 0.6 },
  standingGap: 0.72,
  standingGapDelta: 0.35,
  standingRise: 0.3,
  seatedGapDelta: 0.18,
  seatedRiseTolerance: 0.22,
  centerDrift: 0.12,
  torsoScale: { min: 0.6, max: 1.65 },
} as const
