import { BloomFlower } from '../BloomFlower'
import { GameQrCode } from '../GameQrCode'
import { GAME } from '../../game/config'

export function ResultsScreen({ standCount, elapsedSeconds, onRestart }: {
  standCount: number; elapsedSeconds: number; onRestart: () => void
}) {
  const success = standCount >= GAME.target
  return (
    <section className="results-card">
      <p className="eyebrow">Motion in Bloom</p>
      <h1>{success ? 'Garden complete!' : 'Keep growing!'}</h1>
      <div className="flower-gallery" aria-label={`${standCount} flowers grown`}>
        {Array.from({ length: standCount }, (_, index) => (
          <div className={`flower-frame flower-${index + 1}`} key={index}><BloomFlower stage={3} /></div>
        ))}
      </div>
      <p className="result-message">{success
        ? `Beautiful work. You completed all ${GAME.target} stands in ${elapsedSeconds.toFixed(1)} seconds.`
        : `You grew ${standCount} of ${GAME.target} flowers. Take a rest and try again when you’re ready.`}</p>
      <div className="qr-block"><GameQrCode /><p>Scan to visit Motion in Bloom</p></div>
      <button className="primary-button" onClick={onRestart}>Play again</button>
      <p className="auto-restart">This game will restart automatically in {GAME.restartSeconds} seconds.</p>
    </section>
  )
}
