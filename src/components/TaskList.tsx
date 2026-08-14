import { type Phase, type TestDefinition } from '../types/game'

interface TaskListProps {
  tests: TestDefinition[]
  phase: Phase
  currentTestIndex: number
}

export function TaskList({ tests, phase, currentTestIndex }: TaskListProps) {
  return (
    <ul className="task-list">
      {tests.map((test, index) => {
        const state =
          index < currentTestIndex
            ? 'done'
            : index === currentTestIndex && phase === 'test'
              ? 'active'
              : 'pending'

        return (
          <li key={test.id} className={state}>
            <span>{index + 1}.</span>
            {test.name}
          </li>
        )
      })}
    </ul>
  )
}
