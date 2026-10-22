import { GameButton } from './GameButton'

const options = [
  'I feel physically fit to do this activity',
  'I can sit and stand without using my arms or any support',
  'I can do this activity without feeling any pain or discomfort',
]

export function SafetyScreen({ acknowledgements, onToggle, onContinue }: {
  acknowledgements: boolean[]; onToggle: (index: number) => void; onContinue: () => void
}) {
  return (
    <section className="screen safety-screen" aria-labelledby="safety-title">
      <h1 id="safety-title" className="safety-title"><span className="windsor">SAFETY CHECK<br />BEFORE YOU BEGIN</span></h1>
      <p className="safety-introduction">This activity involves sitting down and standing up five times from a chair placed against a wall, without using your arms or armrests for support.</p>
      <p className="safety-prompt">Check the boxes below<br />if you’re up for it.</p>
      <fieldset className="safety-options">
        <legend className="visually-hidden">Confirm you are ready for this activity</legend>
        {options.map((option, index) => (
          <label className="safety-option" key={option}>
            <input type="checkbox" checked={acknowledgements[index]} onChange={() => onToggle(index)} />
            <span>{option}</span>
          </label>
        ))}
      </fieldset>
      <GameButton className="safety-continue" disabled={!acknowledgements.every(Boolean)} onClick={onContinue}>I am ready to start</GameButton>
    </section>
  )
}
