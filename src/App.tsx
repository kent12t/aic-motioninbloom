import { CameraView } from './components/game/CameraView'
import { CountdownScreen } from './components/game/CountdownScreen'
import { InstructionsScreen } from './components/game/InstructionsScreen'
import { PlayingScreen } from './components/game/PlayingScreen'
import { ResultsScreen } from './components/game/ResultsScreen'
import { useSitStandGame } from './hooks/useSitStandGame'

export function App() {
  const game = useSitStandGame()
  const { screen, camera, tracking } = game
  const cameraView = (
    <CameraView videoRef={camera.attachVideo} overlayRef={camera.overlayRef}
      message={camera.status === 'loading' ? 'Preparing camera…' : tracking.message}
      calibrationProgress={screen === 'instructions' ? tracking.progress : undefined}
      error={camera.error} onRetry={game.retryCamera} />
  )
  const className = screen === 'playing' ? 'page game-page'
    : screen === 'countdown' ? 'page countdown-page' : 'page centered-page'
  return (
    <main className={className}>
      {screen === 'instructions' && (
        <InstructionsScreen ready={camera.status === 'ready' && tracking.ready}
          loading={camera.status === 'loading'} onStart={game.startGame}
          onRecalibrate={game.restart}>{cameraView}</InstructionsScreen>
      )}
      {screen === 'countdown' && <CountdownScreen countdown={game.countdown}>{cameraView}</CountdownScreen>}
      {screen === 'playing' && (
        <PlayingScreen secondsLeft={game.secondsLeft} standCount={game.standCount}>{cameraView}</PlayingScreen>
      )}
      {screen === 'results' && <ResultsScreen standCount={game.standCount}
        elapsedSeconds={game.elapsedSeconds} onRestart={game.restart} />}
    </main>
  )
}
