import { TRACKING } from './config'
import type { LandmarkPoint } from '../types/game'

const pairs = [[11, 12], [23, 24], [7, 8]] as const
type Anchor = { x: number; y: number; width: number }

function anchors(points: LandmarkPoint[]): (Anchor | null)[] {
  return pairs.map(([left, right]) => {
    const a = points[left]
    const b = points[right]
    const visible = (p: LandmarkPoint | undefined): p is LandmarkPoint => !!p
      && Number.isFinite(p.x) && Number.isFinite(p.y)
      && p.visibility >= TRACKING.visibility
      && p.x >= TRACKING.zone.left && p.x <= TRACKING.zone.right
      && p.y >= TRACKING.zone.top && p.y <= TRACKING.zone.bottom
    if (!visible(a) || !visible(b)) return null
    const width = Math.abs(a.x - b.x)
    return width >= 0.015 ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, width } : null
  })
}

// Geometric continuity, not face recognition. Keep the original size/location
// reference: slowly replacing it could let a background person inherit the lock.
export class MainPlayer {
  private reference: (Anchor | null)[] | null = null
  private pending: { anchors: (Anchor | null)[]; since: number; frames: number } | null = null

  get zone(): { left: number; right: number; top: number; bottom: number } {
    // Keep the broad mask/guide fixed; player acquisition must never narrow it.
    return { ...TRACKING.zone }
  }

  select(poses: LandmarkPoint[][], now: number): LandmarkPoint[] | null {
    const candidates = poses.map(points => ({ points, anchors: anchors(points) }))
    const distance = (current: (Anchor | null)[], reference: (Anchor | null)[]) => {
      let matches = 0
      let total = 0
      for (let i = 0; i < reference.length; i++) {
        const a = current[i]
        const b = reference[i]
        if (!a || !b) continue
        const scale = a.width / b.width
        const dx = Math.abs(a.x - b.x)
        // Vertical travel is the game action; lateral travel/size changes are not.
        if (scale < TRACKING.playerWidthScale.min || scale > TRACKING.playerWidthScale.max
          || dx > 0.1 || Math.abs(a.y - b.y) > 0.45) return Infinity
        total += dx + Math.abs(Math.log(scale)) * 0.15
        matches++
      }
      return matches ? total / matches : Infinity
    }
    if (this.reference) {
      const ranked = candidates.map(c => ({ ...c, distance: distance(c.anchors, this.reference!) }))
        .filter(c => Number.isFinite(c.distance)).sort((a, b) => a.distance - b.distance)
      // When two people are indistinguishable, missing evidence is safer than a switch.
      if (ranked[1] && ranked[1].distance - ranked[0].distance < 0.025) return null
      return ranked[0]?.points ?? null
    }

    const ranked = candidates.flatMap(c => {
      const [shoulders, , head] = c.anchors
      // A close, centred shoulder or head pair is enough. Never acquire from
      // one isolated point: a pair supplies both position and apparent size.
      const primary = shoulders ?? head
      if (!primary || primary.width < (shoulders ? 0.08 : 0.075)
        || Math.abs(primary.x - 0.5) > 0.12) return []
      const width = shoulders ? primary.width : primary.width * 2.2
      return [{ ...c, score: width - Math.abs(primary.x - 0.5) }]
    }).sort((a, b) => b.score - a.score)
    const best = ranked[0]
    if (!best || (ranked[1] && best.score - ranked[1].score < 0.025)) {
      this.pending = null
      return null
    }
    if (!this.pending || distance(best.anchors, this.pending.anchors) > 0.03) {
      this.pending = { anchors: best.anchors, since: now, frames: 1 }
      return null
    }
    this.pending.frames++
    if (now - this.pending.since < 150 || this.pending.frames < 4) return null
    this.reference = best.anchors
    return best.points
  }
}
