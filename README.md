# Motion in Bloom

A portrait browser-based booth game: complete five seated → standing → seated cycles within 40 seconds to grow a garden. React/TypeScript/Vite power the UI; MediaPipe Pose Landmarker runs locally in the browser. Read [STYLE_GUIDE.md](STYLE_GUIDE.md) before changing the design or interaction.

## Development

```sh
npm ci
npm run dev
```

Open the Vite localhost URL and allow camera access. `predev` and `prebuild` prepare local pose assets automatically:
- WASM is copied from the installed `@mediapipe/tasks-vision` package.
- The version-1 lite pose model is downloaded once into `public/mediapipe/pose_landmarker_lite.task` if absent.
- `npm run prepare:pose` can also be run explicitly. Initial preparation needs internet if the model is missing; inference does not.

Fonts, artwork, flower WebMs, and derived stills are served locally from `public/`. The centered 9:16 stage fits the viewport with light-yellow space around it. Windsor labels/headings use 80% horizontal scaling.

## Player flow

**Temporary screen-debugging mode:** `GAME.requireCalibration` is currently `false` in `src/game/config.ts`. “Play now” and countdown can proceed without a working camera or completed calibration. Set it back to `true` to restore the readiness gates described below. Calibration and real repetition detection remain active; the bypass does not create synthetic repetitions.

1. Start seated and check the three safety acknowledgements. The first checked box starts the camera and background seated calibration; all three are required to continue.
2. Read the four illustrated instructions. Use **Check camera** for framing guidance or camera retry. **Play now** enables once the camera and seated baseline are ready.
3. Remain seated during the three-second countdown. Losing the starting position returns to instructions for setup.
4. Stand fully to play the current flower's transparent animation. Sit fully to complete the cycle and present the next paused flower. Five videos are selected randomly with repeats allowed; results preserve the actual completed order.
5. Five complete cycles under 12 seconds show the purple result; completion from 12 seconds before the deadline shows green. At 40 seconds, an unfinished round shows the encouraging orange result with only completed flowers.
6. **Play again** or the small top-left home button returns to safety and clears acknowledgements, calibration, timers, and flower state. Results remain until the player restarts.

## Verification and deployment

```sh
npm run lint
npm run test:tracking
npm run build
npm run preview
```

Serve the generated `dist/` directory with a local static server for the booth. It includes the model and WASM; no inference server is required. Keep a consistent localhost origin/browser profile for camera permission. Preview checks the production build locally.

The QR currently links to the current URL, so a localhost booth URL will not open the game on a visitor's phone.

## Tracking and booth setup

- Center the chair and camera. Frame the participant's shoulders, hips, and knees while both seated and standing, leaving headroom for standing.
- The central 60% of the image is the safe zone. Pixels outside it are blacked out **before inference**, not just hidden in the preview. A guide shows the same boundary.
- Sit still for 1.5 seconds to establish a seated baseline, then press **Play now** after reading the instructions. Return home and recheck the safety options to recalibrate after moving the chair or camera.
- Detection runs at up to 20 FPS on a 640-pixel-wide input. The timer runs independently of inference.
- Confidence filtering, time-based smoothing, two movement signals (hip/knee gap and hip rise relative to the seated torso), and 350 ms posture holds reject jitter and incomplete movement.
- A repetition requires a confirmed sitting → standing → sitting sequence. Tracking loss of 800 ms discards the pending repetition; return to sitting to resume. The 40-second timer continues during loss.
- Position/body-scale continuity checks reject obvious player changes. This is not biometric identity tracking: a person directly crossing or replacing the player inside the zone can still interfere. Keep that physical area clear.
- Tune zone/thresholds in `src/game/config.ts` and `src/game/sitStandTracker.ts` using the actual camera and representative participants. Automated tests exercise synthetic poses, not real-world detection accuracy.

Before booth use, manually check permission/setup, seated calibration, countdown, five complete repetitions, partial movements, passersby, occlusion/re-entry, timeout, camera reconnect/retry, video transparency/playback, and home/play-again restart. Automated checks use synthetic poses; run an extended session with representative participants on the final hardware.

## Code boundaries

- `src/App.tsx`: screen composition; presentational screens in `src/components/game/`.
- `src/hooks/useSitStandGame.ts`: game state and timing.
- `src/hooks/usePoseCamera.ts`: camera/model lifecycle, throttled inference, retries.
- `src/game/poseCamera.ts`: local model setup, image masking, overlay drawing.
- `src/game/sitStandTracker.ts`: pure calibration and repetition state machine.
- `src/game/flowerRound.ts`: clock, flower sequence/order, and result classification; timeout wins at the exact deadline.
- `src/components/game/FlowerVideo.tsx`: paused first frame, stand-triggered playback, and still-image fallback.
- `src/game/config.ts`: game settings and tracking configuration.

`useMotionInBloomGame`, `CameraPanel`, and `MissionPanel`/`TaskList` are remnants of the older three-task flow, not the active application. Shared MediaPipe landmark indices remain in `src/types/game.ts`.

The `public/videos/*-bud.png` and `*-bloom.png` files are transparent first/last-frame stills decoded from the matching WebM with FFmpeg's `libvpx-vp9` decoder. `*-flower.png` is the cropped, 600-pixel-high bloom used in result pots. Keep these derivatives in sync when replacing a video; they support failed-playback fallback and stable, consistently fitted result flowers.
