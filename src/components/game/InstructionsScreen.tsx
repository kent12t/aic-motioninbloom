import type { ReactNode } from 'react'
import { GAME } from '../../game/config'

interface InstructionsScreenProps {
  children: ReactNode
  ready: boolean
  loading: boolean
  onStart: () => void
  onRecalibrate: () => void
}

export function InstructionsScreen({ children, ready, loading, onStart, onRecalibrate }: InstructionsScreenProps) {
  return (
    <section className="intro-card">
      <p className="eyebrow">Motion in Bloom</p>
      <h1>Stand tall. Grow a garden.</h1>
      <p className="lead">Complete {GAME.target} slow stand-and-sit movements in {GAME.seconds} seconds.</p>
      <ol className="instructions">
        <li>Place a stable chair inside the guide, with shoulders, hips and knees visible.</li>
        <li>Sit fully with both feet on the floor. Hold still to set your starting position.</li>
        <li>Stand tall, pause briefly, then sit fully. Each complete pair grows one flower.</li>
      </ol>
      <div className="camera-preview">{children}</div>
      <button className="primary-button" onClick={onStart} disabled={!ready}>
        {loading ? 'Preparing camera…' : ready ? 'Begin' : 'Set your seated position'}
      </button>
      {!loading && <button className="recalibrate-button" onClick={onRecalibrate}>Reset seated position</button>}
    </section>
  )
}
