import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'
import { useEffect, useMemo, useRef, useState } from 'react'
import { clamp, formatTimer, scoreToMessage } from '../lib/game-utils'
import { LANDMARK, TESTS, type LandmarkPoint, type Phase, type Posture, type TestId, type TestResult } from '../types/game'

interface EngineState {
  phase: Phase
  currentTestIndex: number
  testStartTime: number
  lastFrameTime: number
  calibrationProgress: number
  standPosture: Posture
  sitDetected: boolean
  standSitReps: number
  standSitRangeAccumulator: number
  standSitSamples: number
  walkMinShoulder: number
  walkMaxShoulder: number
  walkDirection: number
  walkTurnSignals: number
  walkSamples: number
  balanceHoldMs: number
  balanceBestHoldMs: number
  balanceSway: number
  balanceLastNoseX: number | null
  results: TestResult[]
}

function createInitialEngineState(): EngineState {
  return {
    phase: 'intro',
    currentTestIndex: -1,
    testStartTime: 0,
    lastFrameTime: 0,
    calibrationProgress: 0,
    standPosture: 'unknown',
    sitDetected: false,
    standSitReps: 0,
    standSitRangeAccumulator: 0,
    standSitSamples: 0,
    walkMinShoulder: Number.POSITIVE_INFINITY,
    walkMaxShoulder: 0,
    walkDirection: 0,
    walkTurnSignals: 0,
    walkSamples: 0,
    balanceHoldMs: 0,
    balanceBestHoldMs: 0,
    balanceSway: 0,
    balanceLastNoseX: null,
    results: [],
  }
}

function getPoint(landmarks: LandmarkPoint[], index: number): LandmarkPoint | null {
  const point = landmarks[index]
  if (!point || point.visibility < 0.35) {
    return null
  }
  return point
}

function averagePoint(
  landmarks: LandmarkPoint[],
  keypointA: number,
  keypointB: number,
): { x: number; y: number } | null {
  const first = getPoint(landmarks, keypointA)
  const second = getPoint(landmarks, keypointB)
  if (!first || !second) {
    return null
  }
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 }
}

export function useMotionInBloomGame() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const detectorRef = useRef<PoseLandmarker | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const engineRef = useRef<EngineState>(createInitialEngineState())

  const [phase, setPhase] = useState<Phase>('intro')
  const [currentTestIndex, setCurrentTestIndex] = useState(-1)
  const [completedTests, setCompletedTests] = useState(0)
  const [timerLabel, setTimerLabel] = useState('00:00')
  const [poseState, setPoseState] = useState('Preparing camera...')
  const [taskName, setTaskName] = useState('Welcome')
  const [taskInstructions, setTaskInstructions] = useState(
    'Your flower blooms as you complete each movement task. We will keep feedback positive and encouraging.',
  )
  const [resultMessage, setResultMessage] = useState('')
  const [buttonLabel, setButtonLabel] = useState('Start Calibration')
  const [buttonVisible, setButtonVisible] = useState(true)
  const [buttonDisabled, setButtonDisabled] = useState(false)

  const flowerStage = useMemo(() => Math.min(3, Math.max(0, completedTests)), [completedTests])

  const resetTestState = (testId: TestId): void => {
    const state = engineRef.current
    if (testId === 'stand-sit') {
      state.standPosture = 'unknown'
      state.sitDetected = false
      state.standSitReps = 0
      state.standSitRangeAccumulator = 0
      state.standSitSamples = 0
      return
    }

    if (testId === 'walk-turn') {
      state.walkMinShoulder = Number.POSITIVE_INFINITY
      state.walkMaxShoulder = 0
      state.walkDirection = 0
      state.walkTurnSignals = 0
      state.walkSamples = 0
      return
    }

    state.balanceHoldMs = 0
    state.balanceBestHoldMs = 0
    state.balanceSway = 0
    state.balanceLastNoseX = null
  }

  const calculateResultForCurrentTest = (durationMs: number): TestResult => {
    const state = engineRef.current
    const currentTest = TESTS[state.currentTestIndex]
    if (!currentTest) {
      throw new Error('No active test.')
    }

    if (currentTest.id === 'stand-sit') {
      const completion = clamp(state.standSitReps / 6, 0, 1)
      const quality =
        state.standSitSamples > 0
          ? clamp(state.standSitRangeAccumulator / state.standSitSamples, 0, 1)
          : 0
      return { id: currentTest.id, completion, quality, endurance: clamp(durationMs / 25000, 0, 1) }
    }

    if (currentTest.id === 'walk-turn') {
      const travelRange =
        state.walkMaxShoulder > 0
          ? (state.walkMaxShoulder - state.walkMinShoulder) / state.walkMaxShoulder
          : 0
      const completion = clamp(travelRange * 3, 0, 1)
      const quality = clamp(state.walkTurnSignals / 2, 0, 1)
      return { id: currentTest.id, completion, quality, endurance: clamp(durationMs / 20000, 0, 1) }
    }

    const completion = clamp(state.balanceBestHoldMs / 12000, 0, 1)
    const quality = clamp(1 - state.balanceSway / 300, 0, 1)
    return { id: currentTest.id, completion, quality, endurance: clamp(durationMs / 20000, 0, 1) }
  }

  const evaluateStandSit = (landmarks: LandmarkPoint[]): void => {
    const state = engineRef.current
    const hipMid = averagePoint(landmarks, LANDMARK.LEFT_HIP, LANDMARK.RIGHT_HIP)
    const kneeMid = averagePoint(landmarks, LANDMARK.LEFT_KNEE, LANDMARK.RIGHT_KNEE)
    if (!hipMid || !kneeMid) {
      return
    }

    const hipAboveKnee = kneeMid.y - hipMid.y
    const posture: Posture =
      hipAboveKnee > 0.14 ? 'standing' : hipAboveKnee < 0.08 ? 'sitting' : state.standPosture

    if (posture === 'sitting') {
      state.sitDetected = true
    }

    if (posture === 'standing' && state.standPosture === 'sitting' && state.sitDetected) {
      state.standSitReps += 1
      state.sitDetected = false
    }

    state.standPosture = posture
    state.standSitRangeAccumulator += clamp((hipAboveKnee - 0.06) / 0.11, 0, 1)
    state.standSitSamples += 1
  }

  const evaluateWalkTurn = (landmarks: LandmarkPoint[]): void => {
    const state = engineRef.current
    const leftShoulder = getPoint(landmarks, LANDMARK.LEFT_SHOULDER)
    const rightShoulder = getPoint(landmarks, LANDMARK.RIGHT_SHOULDER)
    if (!leftShoulder || !rightShoulder) {
      return
    }

    const shoulderDistance = Math.hypot(
      leftShoulder.x - rightShoulder.x,
      leftShoulder.y - rightShoulder.y,
    )
    state.walkMinShoulder = Math.min(state.walkMinShoulder, shoulderDistance)
    state.walkMaxShoulder = Math.max(state.walkMaxShoulder, shoulderDistance)

    if (state.walkSamples > 0) {
      const delta = shoulderDistance - (state.walkMaxShoulder + state.walkMinShoulder) / 2
      const nextDirection = Math.abs(delta) > 0.005 ? Math.sign(delta) : state.walkDirection
      if (state.walkDirection !== 0 && nextDirection !== state.walkDirection) {
        state.walkTurnSignals += 1
      }
      state.walkDirection = nextDirection
    }

    state.walkSamples += 1
  }

  const evaluateOneLegBalance = (landmarks: LandmarkPoint[], deltaMs: number): void => {
    const state = engineRef.current
    const leftAnkle = getPoint(landmarks, LANDMARK.LEFT_ANKLE)
    const rightAnkle = getPoint(landmarks, LANDMARK.RIGHT_ANKLE)
    const nose = getPoint(landmarks, LANDMARK.NOSE)
    if (!leftAnkle || !rightAnkle) {
      state.balanceHoldMs = 0
      return
    }

    const ankleHeightGap = Math.abs(leftAnkle.y - rightAnkle.y)
    if (ankleHeightGap > 0.08) {
      state.balanceHoldMs += deltaMs
      state.balanceBestHoldMs = Math.max(state.balanceBestHoldMs, state.balanceHoldMs)
      if (nose) {
        if (state.balanceLastNoseX !== null) {
          state.balanceSway += Math.abs(state.balanceLastNoseX - nose.x) * 3
        }
        state.balanceLastNoseX = nose.x
      }
      return
    }

    state.balanceHoldMs = Math.max(0, state.balanceHoldMs - deltaMs * 1.6)
    state.balanceLastNoseX = null
  }

  const drawPose = (landmarks: LandmarkPoint[] | null): void => {
    const overlay = overlayRef.current
    const video = videoRef.current
    if (!overlay || !video) {
      return
    }

    const context = overlay.getContext('2d')
    if (!context) {
      return
    }

    overlay.width = video.videoWidth
    overlay.height = video.videoHeight
    context.clearRect(0, 0, overlay.width, overlay.height)

    if (!landmarks) {
      return
    }

    context.fillStyle = 'rgba(255, 236, 168, 0.9)'
    for (const point of landmarks) {
      if (point.visibility < 0.35) {
        continue
      }
      context.beginPath()
      context.arc(point.x * overlay.width, point.y * overlay.height, 4, 0, Math.PI * 2)
      context.fill()
    }
  }

  const beginTest = (now: number): void => {
    const state = engineRef.current
    const currentTest = TESTS[state.currentTestIndex]
    if (!currentTest) {
      return
    }

    resetTestState(currentTest.id)
    state.phase = 'test'
    state.testStartTime = now
    state.lastFrameTime = now

    setPhase('test')
    setCurrentTestIndex(state.currentTestIndex)
    setTaskName(currentTest.name)
    setTaskInstructions(currentTest.instructions)
    setButtonVisible(false)
  }

  const finishTest = (now: number): void => {
    const state = engineRef.current
    const elapsed = now - state.testStartTime
    state.results.push(calculateResultForCurrentTest(elapsed))
    setCompletedTests(state.results.length)

    state.currentTestIndex += 1
    if (state.currentTestIndex >= TESTS.length) {
      state.phase = 'results'
      const averageScore =
        state.results.reduce((total, result) => {
          return total + result.completion * 0.5 + result.quality * 0.35 + result.endurance * 0.15
        }, 0) / state.results.length

      setPhase('results')
      setCurrentTestIndex(state.currentTestIndex)
      setTaskName('Session Complete')
      setTaskInstructions(
        'Your flower reached full bloom. Keep this rhythm and return whenever you want a fresh session.',
      )
      setResultMessage(scoreToMessage(averageScore))
      setTimerLabel('Done')
      setButtonVisible(true)
      setButtonLabel('Restart Session')
      return
    }

    const nextTest = TESTS[state.currentTestIndex]
    state.phase = 'intro'

    setPhase('intro')
    setCurrentTestIndex(state.currentTestIndex)
    setTaskName(`${nextTest.name} Ready`)
    setTaskInstructions(nextTest.instructions)
    setResultMessage('')
    setTimerLabel(formatTimer(nextTest.durationSec))
    setButtonVisible(true)
    setButtonLabel('Start Next Task')
  }

  const startCalibration = (): void => {
    const state = engineRef.current
    state.phase = 'calibrating'
    state.currentTestIndex = 0
    state.calibrationProgress = 0
    state.results = []

    setPhase('calibrating')
    setCurrentTestIndex(0)
    setCompletedTests(0)
    setTaskName('Calibrating')
    setTaskInstructions('Stand where your full body is visible. Hold still for a few seconds to begin.')
    setResultMessage('')
    setTimerLabel('00:03')
    setButtonVisible(false)
  }

  const updateCalibration = (landmarks: LandmarkPoint[] | null, deltaMs: number): void => {
    const state = engineRef.current
    const video = videoRef.current
    if (!landmarks || !video || video.videoWidth === 0 || video.videoHeight === 0) {
      state.calibrationProgress = 0
      return
    }

    const nose = getPoint(landmarks, LANDMARK.NOSE)
    const leftAnkle = getPoint(landmarks, LANDMARK.LEFT_ANKLE)
    const rightAnkle = getPoint(landmarks, LANDMARK.RIGHT_ANKLE)
    if (!nose || !leftAnkle || !rightAnkle) {
      state.calibrationProgress = 0
      return
    }

    const centered = Math.abs(nose.x - 0.5) < 0.22
    const fullBody = leftAnkle.y < 0.96 && rightAnkle.y < 0.96
    if (!centered || !fullBody) {
      state.calibrationProgress = 0
      setPoseState('Step back until your full body appears and stay centered.')
      return
    }

    state.calibrationProgress += deltaMs
    const remaining = clamp((3000 - state.calibrationProgress) / 1000, 0, 3)
    setTimerLabel(formatTimer(remaining))
    setPoseState('Great positioning. Hold steady...')

    if (state.calibrationProgress >= 3000) {
      beginTest(performance.now())
    }
  }

  const setupCamera = async (): Promise<void> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera API unavailable in this browser.')
    }
    const video = videoRef.current
    if (!video) {
      throw new Error('Camera element missing.')
    }

    mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    })

    video.srcObject = mediaStreamRef.current
    await video.play()
  }

  const setupDetector = async (): Promise<void> => {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
    )
    detectorRef.current = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.45,
      minPosePresenceConfidence: 0.45,
      minTrackingConfidence: 0.45,
    })
  }

  const animate = async (now: number): Promise<void> => {
    const detector = detectorRef.current
    const video = videoRef.current
    if (!detector || !video || video.readyState < 2) {
      rafRef.current = requestAnimationFrame((nextNow) => {
        void animate(nextNow)
      })
      return
    }

    const poseResult = detector.detectForVideo(video, now)
    const landmarks: LandmarkPoint[] | null =
      poseResult.landmarks[0]?.map((point) => ({
        x: point.x,
        y: point.y,
        visibility: point.visibility ?? 0,
      })) ?? null

    drawPose(landmarks)
    setPoseState(landmarks ? 'Pose tracked. Keep moving naturally.' : 'No pose detected. Step into frame and face the camera.')

    const state = engineRef.current
    if (state.phase === 'calibrating') {
      const deltaMs = state.lastFrameTime > 0 ? now - state.lastFrameTime : 0
      state.lastFrameTime = now
      updateCalibration(landmarks, deltaMs)
    }

    if (state.phase === 'test') {
      const currentTest = TESTS[state.currentTestIndex]
      if (currentTest && landmarks) {
        const deltaMs = state.lastFrameTime > 0 ? now - state.lastFrameTime : 0
        if (currentTest.id === 'stand-sit') {
          evaluateStandSit(landmarks)
        } else if (currentTest.id === 'walk-turn') {
          evaluateWalkTurn(landmarks)
        } else {
          evaluateOneLegBalance(landmarks, deltaMs)
        }

        state.lastFrameTime = now
        const elapsedSec = (now - state.testStartTime) / 1000
        const remaining = Math.max(0, currentTest.durationSec - elapsedSec)
        setTimerLabel(formatTimer(remaining))
        if (remaining <= 0) {
          finishTest(now)
        }
      }
    }

    rafRef.current = requestAnimationFrame((nextNow) => {
      void animate(nextNow)
    })
  }

  const handlePrimaryAction = (): void => {
    const state = engineRef.current
    if (state.phase === 'results') {
      startCalibration()
      return
    }

    if (state.phase === 'intro') {
      if (state.currentTestIndex < 0) {
        startCalibration()
        return
      }
      beginTest(performance.now())
    }
  }

  useEffect(() => {
    let active = true

    const bootstrap = async (): Promise<void> => {
      try {
        await setupCamera()
        await setupDetector()
        if (!active) {
          return
        }
        setPoseState('Camera connected. Place a chair at the starting point and press Start Calibration.')
        rafRef.current = requestAnimationFrame((now) => {
          void animate(now)
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown setup error'
        setPoseState(`Unable to initialize camera or pose model: ${message}`)
        setButtonDisabled(true)
      }
    }

    void bootstrap()

    return () => {
      active = false
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      if (mediaStreamRef.current) {
        for (const track of mediaStreamRef.current.getTracks()) {
          track.stop()
        }
      }
      detectorRef.current?.close()
    }
  }, [])

  return {
    videoRef,
    overlayRef,
    tests: TESTS,
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
  }
}
