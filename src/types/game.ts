export type Phase = 'intro' | 'calibrating' | 'test' | 'results'
export type TestId = 'stand-sit' | 'walk-turn' | 'one-leg-balance'
export type Posture = 'unknown' | 'standing' | 'sitting'

export interface TestDefinition {
  id: TestId
  name: string
  durationSec: number
  instructions: string
}

export interface TestResult {
  id: TestId
  completion: number
  quality: number
  endurance: number
}

export interface LandmarkPoint {
  x: number
  y: number
  visibility: number
}

export const TESTS: TestDefinition[] = [
  {
    id: 'stand-sit',
    name: 'Stand and Sit',
    durationSec: 25,
    instructions:
      'Begin seated, stand up with control, then return to the chair. Repeat at a safe pace.',
  },
  {
    id: 'walk-turn',
    name: 'Walk and Turn',
    durationSec: 20,
    instructions:
      'Step away from the chair, turn smoothly, and return to your starting point while facing the camera.',
  },
  {
    id: 'one-leg-balance',
    name: 'Balance on One Leg',
    durationSec: 20,
    instructions: 'Lift one foot and hold steady. Switch feet if needed during the timer.',
  },
]

export const LANDMARK = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const
