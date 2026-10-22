import { resultOutcome, type RoundState } from '../../game/flowerRound'
import { GameQrCode } from '../GameQrCode'
import { GameButton } from './GameButton'

const messages = {
  fast: 'Getting up from a chair is one simple way to check how we are moving as we age. Regular frailty screening helps us pick up these changes easily.',
  standard: 'One activity doesn’t tell us everything about your health. Which is why regular screening is important.',
  incomplete: 'Everyone moves at a different pace. What matters is understanding how you are doing and taking steps to stay strong. Regular frailty screening helps us pick up changes early.',
}

export function ResultsScreen({ session, onRestart }: { session: RoundState; onRestart: () => void }) {
  const outcome = resultOutcome(session.completed.length, session.elapsed)
  return (
    <section className={`screen results-screen result-${outcome} ${session.completed.length > 3 ? 'gallery-two-rows' : ''}`} aria-labelledby="results-title">
      <header className="results-heading">
        <h1 id="results-title"><span className="windsor">{outcome === 'incomplete' ? 'KEEP MOVING!' : '5 STANDS COMPLETED!'}</span></h1>
        {outcome === 'fast' && <p className="bloomed-message">Your flower has bloomed!</p>}
        {outcome !== 'incomplete' && <p className="result-time">Your time: <span className="windsor">{session.elapsed.toFixed(1)} seconds</span></p>}
        {outcome === 'standard' && <p className="well-done">Well done! You’ve completed<br />the challenge!</p>}
        {outcome === 'incomplete' && <p className="completed-message">You have completed {session.completed.length} {session.completed.length === 1 ? 'set' : 'sets'}</p>}
      </header>
      <ol className="flower-gallery" aria-label={`${session.completed.length} flowers grown, in completion order`}>
        {session.completed.map((flower, index) => (
          <li className="flower-frame" key={index} aria-label={`Flower ${index + 1}: ${flower}`}>
            <img className="flower-pot" src="/flower-pots.png" alt="" />
            <img className="result-flower" src={`/videos/${flower}-flower.png`} alt="" />
            <img className="flower-pot flower-pot-front" src="/flower-pots.png" alt="" />
          </li>
        ))}
      </ol>
      <p className="result-message">{messages[outcome]}</p>
      <div className="qr-block"><GameQrCode /><p>Scan here<br />to read more</p></div>
      <GameButton className="play-again" onClick={onRestart}>Play again</GameButton>
    </section>
  )
}
