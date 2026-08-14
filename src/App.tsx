import { CameraPanel } from './components/CameraPanel'
import { MissionPanel } from './components/MissionPanel'
import { useMotionInBloomGame } from './hooks/useMotionInBloomGame'

export function App() {
  const {
    videoRef,
    overlayRef,
    tests,
    phase,
    currentTestIndex,
    flowerStage,
    timerLabel,
    poseState,
    taskName,
    taskInstructions,
    resultMessage,
    buttonLabel,
    buttonVisible,
    buttonDisabled,
    handlePrimaryAction,
  } = useMotionInBloomGame()

  return (
    <main className="app-shell">
      <CameraPanel
        timerLabel={timerLabel}
        poseState={poseState}
        videoRef={videoRef}
        overlayRef={overlayRef}
      />
      <MissionPanel
        flowerStage={flowerStage}
        tests={tests}
        phase={phase}
        currentTestIndex={currentTestIndex}
        taskName={taskName}
        taskInstructions={taskInstructions}
        resultMessage={resultMessage}
        buttonVisible={buttonVisible}
        buttonDisabled={buttonDisabled}
        buttonLabel={buttonLabel}
        onPrimaryAction={handlePrimaryAction}
      />
    </main>
  )
}
