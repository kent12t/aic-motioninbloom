import { GameButton } from './GameButton'

const instructions = [
  <>Start by sitting in the<br />middle of the chair</>,
  <>Cross your arms<br />or keep them over<br />your chest</>,
  <>Stand up fully and<br />sit down again</>,
  <>Repeat this<br />five times without<br />stopping and watch<br />the flowers bloom!</>,
]

export function InstructionsScreen({ ready, onStart }: { ready: boolean; onStart: () => void }) {
  return (
    <section className="screen instructions-screen" aria-labelledby="instructions-title">
      <h1 id="instructions-title"><span className="windsor">How Strong Are Your Legs?</span></h1>
      <p className="instructions-subtitle">Stand and sit as quickly as you can</p>
      <ol className="instruction-list">
        {instructions.map((copy, index) => (
          <li key={index}>
            <span className="instruction-number" aria-hidden="true"><span className="windsor">{index + 1}</span></span>
            <span className="instruction-copy">{copy}</span>
            <img src={`/instr${index + 1}.png`} alt="" />
          </li>
        ))}
      </ol>
      <p className="safety-reminder">Remember, be careful and<br />prioritise your safety</p>
      <GameButton className="play-now" disabled={!ready} onClick={onStart}>Play now</GameButton>
    </section>
  )
}
