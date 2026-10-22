import type { ReactNode } from 'react'
import { BloomFlower } from '../BloomFlower'
import { GAME } from '../../game/config'

export function PlayingScreen({ secondsLeft, standCount, children }: {
  secondsLeft: number; standCount: number; children: ReactNode
}) {
  return (
    <>
      <header className="game-header">
        <div><span>Time</span><strong>{Math.ceil(secondsLeft)}s</strong></div>
        <p>Motion in Bloom</p>
        <div><span>Stands</span><strong>{standCount} / {GAME.target}</strong></div>
      </header>
      <section className="bloom-stage" aria-live="polite">
        <div className="bloom-video" key={standCount}><BloomFlower stage={standCount > 0 ? 3 : 0} /></div>
        <h2>{standCount > 0 ? `Flower ${standCount} bloomed!` : 'Your garden is ready'}</h2>
      </section>
      {children}
    </>
  )
}
