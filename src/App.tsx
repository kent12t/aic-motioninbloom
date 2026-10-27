import { useState } from 'react'
import { CameraView } from './components/game/CameraView'
import { CountdownScreen } from './components/game/CountdownScreen'
import { InstructionsScreen } from './components/game/InstructionsScreen'
import { PlayingScreen } from './components/game/PlayingScreen'
import { ResultsScreen } from './components/game/ResultsScreen'
import { SafetyScreen } from './components/game/SafetyScreen'
import { useSitStandGame } from './hooks/useSitStandGame'

export function App() {
  const game = useSitStandGame()
  const [showSetup, setShowSetup] = useState(false)
  const { screen, camera, tracking, cameraEnabled } = game
  const preparing = screen === 'safety' || screen === 'instructions'
  const ready = camera.status === 'ready' && tracking.ready
  const restart = () => { setShowSetup(false); game.restart() }
  const cameraMessage = camera.status === 'loading' ? 'Preparing camera… Stay seated.' : tracking.message

  return (
    <main className={`portrait-stage stage-${screen}`}>
      {screen !== 'playing' && <img className={`floral-border ${screen === 'countdown' || screen === 'results' ? 'floral-muted' : ''}`} src="/bg-flower.png" alt="" />}
      {screen === 'safety' && <SafetyScreen acknowledgements={game.acknowledgements}
        onToggle={game.toggleAcknowledgement} onContinue={() => { setShowSetup(false); game.showInstructions() }} />}
      {screen === 'instructions' && <InstructionsScreen ready={game.canStart} onStart={() => { setShowSetup(false); game.startGame() }} />}
      {screen === 'countdown' && <CountdownScreen countdown={game.countdown} />}
      {screen === 'playing' && <PlayingScreen session={game.session} />}
      {screen === 'results' && <ResultsScreen session={game.session} onRestart={restart} />}

      {/* Keep the video attached while calibrating in the background and between screens. */}
      <CameraView videoRef={camera.attachVideo} overlayRef={camera.overlayRef} pose={tracking.pose} loading={camera.status === 'loading'}
        hidden={!cameraEnabled || screen === 'results' || (preparing && !showSetup)} setup={preparing}
        message={cameraMessage} calibrationProgress={preparing ? tracking.progress : undefined}
        error={camera.error} onRetry={game.retryCamera} onClose={() => setShowSetup(false)} ready={ready} />

      {preparing && cameraEnabled && <div className="setup-status">
        <p role="status">{camera.error ? 'Camera needs attention.' : ready ? 'Seated position ready.' : cameraMessage}</p>
        <button onClick={() => setShowSetup(true)} aria-haspopup="dialog" aria-controls="setup-camera-dialog" aria-expanded={showSetup}>
          {camera.error ? 'Set up camera' : 'Check camera'}
        </button>
      </div>}
      {screen !== 'safety' && <button className="home-button" onClick={restart} aria-label="Return to safety check" title="Return to safety check">
        <img src="/home.svg" alt="" />
      </button>}
    </main>
  )
}
