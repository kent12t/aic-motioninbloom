import { useCallback, useEffect, useRef, useState } from 'react'
import { GAME } from '../game/config'
import { SitStandTracker, type TrackingFeedback } from '../game/sitStandTracker'
import type { LandmarkPoint } from '../types/game'
import { usePoseCamera } from './usePoseCamera'

export type GameScreen = 'instructions' | 'countdown' | 'playing' | 'results'

export function useSitStandGame() {
  const tracker = useRef(new SitStandTracker())
  const screenRef = useRef<GameScreen>('instructions')
  const startedAt = useRef(0)
  const count = useRef(0)
  const [screen, setScreenState] = useState<GameScreen>('instructions')
  const [countdown, setCountdown] = useState<number>(GAME.countdown)
  const [secondsLeft, setSecondsLeft] = useState<number>(GAME.seconds)
  const [standCount, setStandCount] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [tracking, setTracking] = useState<TrackingFeedback>({
    ready: false, progress: 0, message: 'Sit inside the guide to set your starting position.',
    accepted: false, repetition: false,
  })

  const setScreen = useCallback((next: GameScreen) => {
    screenRef.current = next
    setScreenState(next)
  }, [])
  const finish = useCallback((now: number) => {
    setElapsedSeconds(Math.min(GAME.seconds, (now - startedAt.current) / 1000))
    setScreen('results')
  }, [setScreen])

  const onPose = useCallback((points: LandmarkPoint[] | null, now: number) => {
    if (screenRef.current === 'results') return false
    const playing = screenRef.current === 'playing'
    // Timeout wins over a repetition arriving after the deadline.
    if (playing && now - startedAt.current >= GAME.seconds * 1000) {
      finish(now)
      return false
    }
    const feedback = tracker.current.update(points, now, playing)
    setTracking(feedback)
    if (playing && feedback.repetition) {
      count.current = Math.min(GAME.target, count.current + 1)
      setStandCount(count.current)
      if (count.current === GAME.target) finish(now)
    }
    return feedback.accepted
  }, [finish])
  const camera = usePoseCamera(onPose)

  const restart = useCallback(() => {
    tracker.current.reset()
    count.current = 0
    setStandCount(0)
    setSecondsLeft(GAME.seconds)
    setElapsedSeconds(0)
    setTracking({ ready: false, progress: 0, accepted: false, repetition: false,
      message: 'Sit inside the guide to set your starting position.' })
    setScreen('instructions')
  }, [setScreen])

  const startGame = () => {
    if (camera.status !== 'ready' || !tracking.ready) return
    setCountdown(GAME.countdown)
    setScreen('countdown')
  }

  useEffect(() => {
    if (screen !== 'countdown') return
    const countdownEnd = performance.now() + GAME.countdown * 1000
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((countdownEnd - performance.now()) / 1000))
      setCountdown(remaining)
      if (!remaining) {
        startedAt.current = performance.now()
        setScreen('playing')
      }
    }, 100)
    return () => window.clearInterval(timer)
  }, [screen, setScreen])

  useEffect(() => {
    if (screen !== 'playing') return
    const timer = window.setInterval(() => {
      const now = performance.now()
      setSecondsLeft(Math.max(0, GAME.seconds - (now - startedAt.current) / 1000))
      if (now - startedAt.current >= GAME.seconds * 1000) finish(now)
    }, 100)
    return () => window.clearInterval(timer)
  }, [finish, screen])

  useEffect(() => {
    if (screen !== 'results') return
    const timer = window.setTimeout(restart, GAME.restartSeconds * 1000)
    return () => window.clearTimeout(timer)
  }, [restart, screen])

  const retryCamera = () => { restart(); camera.retry() }
  return { screen, countdown, secondsLeft, standCount, elapsedSeconds, tracking,
    camera, startGame, restart, retryCamera }
}
