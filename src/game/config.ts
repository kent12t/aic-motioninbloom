export const GAME = {
  // Require initial detection before Play now and throughout countdown.
  requireCalibration: true,
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
  // Catch a short seated window if the readiness gate was bypassed.
  playingCalibrationMs: 150,
  playingCalibrationFrames: 4,
  // Debounce across consecutive inference frames, not a pause at either endpoint.
  holdMs: 80,
  lostMs: 800,
  smoothingMs: 60,
  // Visual reward only; these thresholds never confirm a repetition.
  bloomRise: { hips: 0.12, shoulders: 0.18, head: 0.24 },
  seatedGapRange: { min: -0.4, max: 0.6 },
  // Relative to the seated torso: larger upper-body thresholds ignore small nods.
  rise: { hips: 0.32, shoulders: 0.5, head: 0.6 },
  seatedTolerance: { hips: 0.22, shoulders: 0.28, head: 0.32 },
  centerDrift: 0.12,
  torsoScale: { min: 0.6, max: 1.65 },
} as const
