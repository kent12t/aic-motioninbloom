import { GAME } from '../../game/config'
import type { RoundState } from '../../game/flowerRound'
import { FlowerVideo } from './FlowerVideo'

export function PlayingScreen({ session }: { session: RoundState }) {
  const seconds = Math.ceil(Math.max(0, GAME.seconds - session.elapsed))
  const time = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
  const flower = session.flowers[session.completed.length]
  const nextFlower = session.flowers[session.completed.length + 1]
  const previousFlower = session.completed.at(-1)
  return (
    <section className="screen playing-screen" aria-label="Stand and sit to bloom flowers">
      <header className="game-header">
        <div><span>Time</span><strong role="timer" aria-label={`${seconds} seconds remaining`}>{time}</strong></div>
        <div><span>Score</span><strong aria-live="polite" aria-label={`${session.completed.length} of ${GAME.target} sets complete`}>{session.completed.length}</strong></div>
      </header>
      <h1 className="encouragement"><span className="windsor">Keep Going!</span></h1>
      {flower && <FlowerVideo key={session.completed.length} flower={flower} blooming={session.blooming} />}
      {previousFlower && <div key={previousFlower} className="flower-video flower-handoff" aria-hidden="true">
        <img src={`/videos/${previousFlower}-bloom.png`} alt="" />
      </div>}
      {nextFlower && <div hidden aria-hidden="true">
        <video key={nextFlower} src={`/videos/${nextFlower}.webm`} preload="auto" muted playsInline />
        <img src={`/videos/${nextFlower}-bud.png`} alt="" />
        <img src={`/videos/${nextFlower}-bloom.png`} alt="" />
      </div>}
    </section>
  )
}
