import { BloomFlower } from './BloomFlower'
import { TaskList } from './TaskList'
import { type Phase, type TestDefinition } from '../types/game'

interface MissionPanelProps {
  flowerStage: number
  tests: TestDefinition[]
  phase: Phase
  currentTestIndex: number
  taskName: string
  taskInstructions: string
  resultMessage: string
  buttonVisible: boolean
  buttonDisabled: boolean
  buttonLabel: string
  onPrimaryAction: () => void
}

export function MissionPanel({
  flowerStage,
  tests,
  phase,
  currentTestIndex,
  taskName,
  taskInstructions,
  resultMessage,
  buttonVisible,
  buttonDisabled,
  buttonLabel,
  onPrimaryAction,
}: MissionPanelProps) {
  return (
    <aside className="mission-card">
      <div className="flower-wrap">
        <BloomFlower stage={flowerStage} />
      </div>
      <h2>{taskName}</h2>
      <p id="task-instructions">{taskInstructions}</p>
      {buttonVisible ? (
        <button className="primary-button" onClick={onPrimaryAction} disabled={buttonDisabled}>
          {buttonLabel}
        </button>
      ) : null}
      <TaskList tests={tests} phase={phase} currentTestIndex={currentTestIndex} />
      <p className="result-message">{resultMessage}</p>
    </aside>
  )
}
