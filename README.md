# Motion in Bloom

A browser-based booth game: complete five slow seated → standing → seated cycles within 40 seconds to grow a garden. React/TypeScript/Vite power the UI; MediaPipe Pose Landmarker runs locally in the browser.

## Development

```sh
npm ci
npm run dev
```

Open the Vite localhost URL and allow camera access. `predev` and `prebuild` prepare local pose assets automatically:
- WASM is copied from the installed `@mediapipe/tasks-vision` package.
- The version-1 lite pose model is downloaded once into `public/mediapipe/pose_landmarker_lite.task` if absent.
- `npm run prepare:pose` can also be run explicitly. Initial preparation needs internet if the model is missing; inference does not.

Fonts are still loaded by the existing stylesheet; local font/design integration is pending.

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
- Sit still for 1.5 seconds to establish a seated baseline, then press Begin. Use **Reset seated position** after moving the chair or camera.
- Detection runs at up to 20 FPS on a 640-pixel-wide input. The timer runs independently of inference.
- Confidence filtering, time-based smoothing, two movement signals (hip/knee gap and hip rise relative to the seated torso), and 350 ms posture holds reject jitter and incomplete movement.
- A repetition requires a confirmed sitting → standing → sitting sequence. Tracking loss of 800 ms discards the pending repetition; return to sitting to resume. The 40-second timer continues during loss.
- Position/body-scale continuity checks reject obvious player changes. This is not biometric identity tracking: a person directly crossing or replacing the player inside the zone can still interfere. Keep that physical area clear.
- Tune zone/thresholds in `src/game/config.ts` and `src/game/sitStandTracker.ts` using the actual camera and representative participants. Automated tests exercise synthetic poses, not real-world detection accuracy.

Before booth use, manually check permission/setup, seated calibration, countdown, five slow complete repetitions, partial movements, passersby, occlusion/re-entry, timeout, camera reconnect/retry, manual restart, and automatic restart after 45 seconds. Run an extended session on the final hardware.

## Code boundaries

- `src/App.tsx`: screen composition; presentational screens in `src/components/game/`.
- `src/hooks/useSitStandGame.ts`: game state and timing.
- `src/hooks/usePoseCamera.ts`: camera/model lifecycle, throttled inference, retries.
- `src/game/poseCamera.ts`: local model setup, image masking, overlay drawing.
- `src/game/sitStandTracker.ts`: pure calibration and repetition state machine.
- `src/game/config.ts`: game settings and tracking configuration.

`useMotionInBloomGame`, `CameraPanel`, and `MissionPanel`/`TaskList` are remnants of the older three-task flow, not the active application. Shared MediaPipe landmark indices remain in `src/types/game.ts`.
