import { useCallback, useEffect, useRef, useState } from 'react'
import { GAME } from '../game/config'
import { FlowerRound } from '../game/flowerRound'
import { SitStandTracker, type TrackingFeedback } from '../game/sitStandTracker'
import type { LandmarkPoint } from '../types/game'
import { usePoseCamera } from './usePoseCamera'

export type GameScreen = 'safety' | 'instructions' | 'countdown' | 'playing' | 'results'
const initialTracking: TrackingFeedback = {
  ready: false, progress: 0, message: 'Sit inside the guide with shoulders and hips visible.',
  accepted: false, repetition: false, stood: false, rising: false,
}

export function useSitStandGame() {
  const tracker = useRef(new SitStandTracker())
  const round = useRef(new FlowerRound())
  const screenRef = useRef<GameScreen>('safety')
  const trackingRef = useRef(initialTracking)
  const [screen, setScreenState] = useState<GameScreen>('safety')
  const [acknowledgements, setAcknowledgements] = useState([false, false, false])
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [countdown, setCountdown] = useState<number>(GAME.countdown)
  const [session, setSession] = useState(() => new FlowerRound().state)
  const [tracking, setTracking] = useState(initialTracking)

  const setScreen = useCallback((next: GameScreen) => {
    screenRef.current = next
    setScreenState(next)
  }, [])

  const updateRound = useCallback((now: number, event: 'tick' | 'rising' | 'stood' | 'completed' = 'tick') => {
    if (screenRef.current !== 'playing') return
    const next = round.current.update(now, event)
    setSession(next)
    if (next.finished) setScreen('results')
  }, [setScreen])

  const onPose = useCallback((points: LandmarkPoint[] | null, now: number) => {
    if (screenRef.current === 'results') return false
    const playing = screenRef.current === 'playing'
    // The deadline is checked before accepting any new movement.
    if (playing && round.current.update(now).finished) {
      updateRound(now)
      return false
    }
    const feedback = tracker.current.update(points, now, playing)
    trackingRef.current = feedback
    setTracking(feedback)
    if (playing && feedback.rising) updateRound(now, 'rising')
    if (playing && feedback.stood) updateRound(now, 'stood')
    if (playing && feedback.repetition) updateRound(now, 'completed')
    return feedback.accepted
  }, [updateRound])
  const camera = usePoseCamera(onPose, cameraEnabled && screen !== 'results')
  const retry = camera.retry

  const restart = useCallback(() => {
    // Update the screen ref first so stale pose callbacks cannot change a reset round.
    setScreen('safety')
    setCameraEnabled(false)
    setAcknowledgements([false, false, false])
    tracker.current.reset()
    round.current = new FlowerRound()
    setSession(round.current.state)
    setCountdown(GAME.countdown)
    trackingRef.current = initialTracking
    setTracking(initialTracking)
    retry()
  }, [setScreen, retry])

  const toggleAcknowledgement = (index: number) => {
    if (!acknowledgements[index]) setCameraEnabled(true)
    setAcknowledgements((values) => values.map((value, i) => i === index ? !value : value))
  }
  const showInstructions = () => {
    if (screenRef.current === 'safety' && acknowledgements.every(Boolean)) setScreen('instructions')
  }
  const startGame = () => {
    if (screenRef.current !== 'instructions') return
    if (GAME.requireCalibration && (camera.status !== 'ready' || !trackingRef.current.ready)) return
    setCountdown(GAME.countdown)
    setScreen('countdown')
  }

  useEffect(() => {
    if (screen !== 'countdown') return
    const countdownEnd = performance.now() + GAME.countdown * 1000
    const timer = window.setInterval(() => {
      if (screenRef.current !== 'countdown') return
      // A lost seated position returns to setup instead of starting an uncalibrated round.
      if (GAME.requireCalibration && !trackingRef.current.ready) {
        setScreen('instructions')
        return
      }
      const now = performance.now()
      const remaining = Math.max(0, Math.ceil((countdownEnd - now) / 1000))
      setCountdown(remaining)
      if (!remaining) {
        setSession(round.current.start(now))
        setScreen('playing')
      }
    }, 50)
    return () => window.clearInterval(timer)
  }, [screen, setScreen])

  useEffect(() => {
    if (screen !== 'playing') return
    const timer = window.setInterval(() => updateRound(performance.now()), 50)
    return () => window.clearInterval(timer)
  }, [screen, updateRound])

  const retryCamera = () => {
    tracker.current.reset()
    trackingRef.current = initialTracking
    setTracking(initialTracking)
    if (screenRef.current === 'playing' || screenRef.current === 'countdown') setScreen('instructions')
    camera.retry()
  }

  return { screen, acknowledgements, cameraEnabled, countdown, session, tracking,
    canStart: !GAME.requireCalibration || (camera.status === 'ready' && tracking.ready),
    camera, toggleAcknowledgement, showInstructions, startGame, restart, retryCamera }
}
