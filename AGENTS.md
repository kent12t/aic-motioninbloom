# Repository guidance

## Commands and verification
- Use npm with `package-lock.json`: `npm ci`, then `npm run dev`.
- Checks: `npm run lint` and `npm run build`. Build runs `tsc` (no emit, all of `src`) before Vite; even unused legacy source must typecheck. Output is ignored `dist/`.
- Focused checks: `npx eslint src/path/to/file.tsx`; typecheck only with `npx tsc --noEmit`.
- `npm run test:tracking` runs synthetic tracker tests with Node's built-in test runner. Browser checks are still needed for camera initialization, calibration, countdown, repetitions, tracking loss, timeout/results, and restart.

## Active architecture
- Entry flow: `index.html` → `src/main.tsx` → `src/App.tsx` → `src/hooks/useSitStandGame.ts`. Global styles are imported by `main.tsx` from `src/style.css`.
- The active game is five complete sit/stand cycles within 40 seconds. `useSitStandGame` orchestrates screens/timing; `usePoseCamera` owns camera/detector lifecycle; `src/game/sitStandTracker.ts` is the pure calibration/repetition engine. Screens live in `src/components/game/`.
- Tracking thresholds, 20 FPS inference, and the symmetric safe zone live in `src/game/config.ts`. The image is masked before inference; the overlay alone is not the exclusion mechanism. Keep overlay/video letterboxing aligned.
- Detection uses MediaPipe `PoseLandmarker` from `@mediapipe/tasks-vision`; the landmark indices are not interchangeable with MoveNet.
- `useMotionInBloomGame.ts`, `CameraPanel`, and `MissionPanel`/`TaskList` belong to the older flow and are not wired into the current app. Shared landmark indices and types remain in `src/types/game.ts`.

## Camera and runtime gotchas
- `predev`/`prebuild` run `scripts/prepare-pose-assets.mjs`: copy matching installed MediaPipe WASM into ignored `public/mediapipe/wasm/` and download the version-1 lite model only if absent. The model is kept in `public/mediapipe/`; built detection has no CDN dependency. GPU initialization falls back to CPU.
- Browser verification needs camera permission and a secure context (localhost or HTTPS). Keep shoulders, hips, and knees visible for the active detector.
- `main.tsx` enables React StrictMode. Preserve effect cleanup for camera tracks, detector instances, animation frames, and timers.
- Camera views remount across screens; `usePoseCamera.attachVideo` reattaches the existing stream. Preserve cancellation cleanup for asynchronous detector creation under StrictMode.
- `GameQrCode` encodes `window.location.href`, not session results or a separate share endpoint; a localhost URL will also appear in its QR code.
- Keep outcome feedback encouraging; raw performance grades are not part of the player UI.
