import { GAME } from './config'

export const FLOWERS = ['pink', 'purple', 'violet', 'orange', 'yellow'] as const
export type Flower = typeof FLOWERS[number]
export type Outcome = 'fast' | 'standard' | 'incomplete'

export interface RoundState {
  flowers: Flower[]
  completed: Flower[]
  blooming: boolean
  elapsed: number
  finished: boolean
}

export function resultOutcome(count: number, elapsed: number): Outcome {
  if (count < GAME.target || elapsed >= GAME.seconds) return 'incomplete'
  return elapsed < 12 ? 'fast' : 'standard'
}

// A single clock and ordered list are shared by pose callbacks and the HUD timer.
export class FlowerRound {
  private startedAt: number | null = null
  state: RoundState = { flowers: [], completed: [], blooming: false, elapsed: 0, finished: false }

  start(now: number, random: () => number = Math.random) {
    this.startedAt = now
    const remaining = [...FLOWERS]
    this.state = {
      flowers: Array.from({ length: GAME.target }, () => remaining.splice(Math.floor(random() * remaining.length), 1)[0]),
      completed: [], blooming: false, elapsed: 0, finished: false,
    }
    return this.state
  }

  update(now: number, event: 'tick' | 'rising' | 'stood' | 'completed' = 'tick') {
    if (this.startedAt === null || this.state.finished) return this.state
    const elapsed = Math.max(0, Math.min(GAME.seconds, (now - this.startedAt) / 1000))
    if (elapsed >= GAME.seconds) {
      this.state = { ...this.state, elapsed, finished: true }
      return this.state
    }
    let { completed, blooming } = this.state
    if (event === 'rising' || event === 'stood') blooming = true
    if (event === 'completed' && blooming) {
      completed = [...completed, this.state.flowers[completed.length]]
      blooming = false
    }
    this.state = { ...this.state, elapsed, completed, blooming, finished: completed.length === GAME.target }
    return this.state
  }
}
