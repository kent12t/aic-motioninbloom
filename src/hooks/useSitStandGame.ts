import { useCallback, useEffect, useRef, useState } from 'react'
import { GAME } from '../game/config'
import { FlowerRound, resultOutcome } from '../game/flowerRound'
import { recordGameResult } from '../offlineTracking'
import { SitStandTracker, type TrackingFeedback } from '../game/sitStandTracker'
import type { LandmarkPoint } from '../types/game'
import { usePoseCamera } from './usePoseCamera'

export type GameScreen = 'safety' | 'instructions' | 'countdown' | 'playing' | 'results'
const initialTracking: TrackingFeedback = {
  pose: 'unknown',
  ready: false, progress: 0, message: 'Stay seated and centered. Keep your head or shoulders inside the guide.',
  accepted: false, repetition: false, stood: false, rising: false,
}

export function useSitStandGame() {
  const tracker = useRef(new SitStandTracker())
  const round = useRef(new FlowerRound())
  const screenRef = useRef<GameScreen>('safety')
  const trackingRef = useRef(initialTracking)
  const startedAt = useRef<string | null>(null)
  const [screen, setScreenState] = useState<GameScreen>('safety')
  const [acknowledgements, setAcknowledgements] = useState([false, false, false])
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [cameraRotated, setCameraRotated] = useState(false)
  const [countdown, setCountdown] = useState<number>(GAME.countdown)
  const [session, setSession] = useState(() => new FlowerRound().state)
  const [tracking, setTracking] = useState(initialTracking)

  const setScreen = useCallback((next: GameScreen) => {
    screenRef.current = next
    setScreenState(next)
  }, [])

  const recordInterruption = useCallback((reason: 'restart' | 'camera_retry' | 'page_exit') => {
    if (!startedAt.current) return
    const next = round.current.update(performance.now())
    recordGameResult({
      completedCycles: next.completed.length, targetCycles: GAME.target,
      outcome: resultOutcome(next.completed.length, next.elapsed),
      elapsedSeconds: next.elapsed, startedAt: startedAt.current,
      status: next.finished ? 'finished' : 'interrupted',
      interruptionReason: next.finished ? '' : reason,
    })
    startedAt.current = null
  }, [])

  useEffect(() => {
    const onPageExit = () => recordInterruption('page_exit')
    window.addEventListener('pagehide', onPageExit)
    return () => window.removeEventListener('pagehide', onPageExit)
  }, [recordInterruption])

  const updateRound = useCallback((now: number, event: 'tick' | 'rising' | 'stood' | 'completed' = 'tick') => {
    if (screenRef.current !== 'playing') return
    const next = round.current.update(now, event)
    setSession(next)
    if (next.finished) {
      setScreen('results')
      if (startedAt.current) {
        recordGameResult({
          completedCycles: next.completed.length, targetCycles: GAME.target,
          outcome: resultOutcome(next.completed.length, next.elapsed),
          elapsedSeconds: next.elapsed, startedAt: startedAt.current,
          status: 'finished', interruptionReason: '',
        })
        startedAt.current = null
      }
    }
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
  const camera = usePoseCamera(onPose, cameraEnabled && screen !== 'results', cameraRotated)
  const retry = camera.retry

  const restart = useCallback(() => {
    recordInterruption('restart')
    // Update the screen ref first so stale pose callbacks cannot change a reset round.
    setScreen('safety')
    startedAt.current = null
    setCameraEnabled(false)
    setAcknowledgements([false, false, false])
    tracker.current.reset()
    round.current = new FlowerRound()
    setSession(round.current.state)
    setCountdown(GAME.countdown)
    trackingRef.current = initialTracking
    setTracking(initialTracking)
    retry()
  }, [setScreen, retry, recordInterruption])

  const toggleAcknowledgement = (index: number) => {
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
        startedAt.current = new Date().toISOString()
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
    recordInterruption('camera_retry')
    tracker.current.reset()
    trackingRef.current = initialTracking
    setTracking(initialTracking)
    if (screenRef.current === 'playing' || screenRef.current === 'countdown') setScreen('instructions')
    camera.retry()
  }

  const rotateCamera = () => {
    if (screenRef.current !== 'safety' && screenRef.current !== 'instructions') return
    tracker.current.reset()
    trackingRef.current = initialTracking
    setTracking(initialTracking)
    setCameraRotated(value => !value)
  }

  return { screen, acknowledgements, cameraEnabled, cameraRotated, rotateCamera, countdown, session, tracking,
    enableCamera: () => setCameraEnabled(true),
    canStart: !GAME.requireCalibration || (camera.status === 'ready' && tracking.ready),
    camera, toggleAcknowledgement, showInstructions, startGame, restart, retryCamera }
}
