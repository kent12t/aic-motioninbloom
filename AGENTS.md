# Repository guidance

## Required style guide workflow
- Read [STYLE_GUIDE.md](STYLE_GUIDE.md) before every task, and check applicable requirements before completing changes. It is the shared source of truth for visual design, assets, screen states, and player-facing behavior.
- Keep changes consistent with the guide. When user-approved design or interaction requirements change, update the guide in the same changeset and keep this file's guidance aligned.
- Distinguish target requirements from existing implementation: an existing mismatch is not permission to redefine the style. Record newly discovered gaps in the guide's implementation-status section and update that section when gaps are resolved.
- For UI or gameplay changes, use the guide's verification checklist and report which checks were actually performed. Documentation-only changes require a documentation/diff review rather than application tests.

## Commands and verification
- Use npm with `package-lock.json`: `npm ci`, then `npm run dev`.
- Checks: `npm run lint` and `npm run build`. Build runs `tsc` (no emit, all of `src`) before Vite; even unused legacy source must typecheck. Output is ignored `dist/`.
- Focused checks: `npx eslint src/path/to/file.tsx`; typecheck only with `npx tsc --noEmit`.
- `npm run test:tracking` runs synthetic tracker tests with Node's built-in test runner. Browser checks are still needed for camera initialization, calibration, countdown, repetitions, tracking loss, timeout/results, and restart.
- `.github/workflows/deploy-pages.yml` gates Pages production (`master`) on audit, warning-free lint, tracker tests, build, and `npm run check:dist`. Chromium `npm run test:smoke` runs only on manual dispatch through `.github/workflows/browser-smoke.yml` and does not gate deployment. Browser smoke tests use the built `dist/` via Vite preview; install Chromium with `npx playwright install chromium` locally. Deployment uses the checked artifact and requires GitHub Cloudflare secrets; see `README.md`.

## Active architecture
- Entry flow: `index.html` → `src/main.tsx` → `src/App.tsx` → `src/hooks/useSitStandGame.ts`. Global styles are imported by `main.tsx` from `src/style.css`.
- The active flow is safety → instructions → countdown → playing → results, with five complete sit/stand cycles within 40 seconds. `useSitStandGame` orchestrates screens and acknowledgements; `usePoseCamera` owns camera/detector lifecycle; `src/game/sitStandTracker.ts` is the pure calibration/repetition engine. `src/game/flowerRound.ts` owns the round clock, random sequence, completed-flower order, and outcome boundaries. Screens live in `src/components/game/`.
- The detector initializes on page load without camera access. Camera initialization/calibration begins only on Check camera, never on safety checkbox changes. `App` keeps one camera video mounted across setup/countdown/gameplay; the camera is disabled on results and full restart. `FlowerVideo` must remount per cycle even when the random flower repeats.
- `GAME.requireCalibration` is `true`: Play now/start/countdown require successful initial calibration. Centered head or shoulder pairs can acquire the player without visible hips; see `STYLE_GUIDE.md`.
- Tracking thresholds, 20 FPS inference, and the fixed symmetric safe zone live in `src/game/config.ts`. `MainPlayer.zone` keeps the broad mask/guide unchanged after acquisition; do not narrow it to player width. The image is masked before inference; the overlay alone is not the exclusion mechanism. The 3:2 setup display crop is independent of inference; keep video/overlay fitting aligned.
- Detection uses MediaPipe `PoseLandmarker` from `@mediapipe/tasks-vision`; the landmark indices are not interchangeable with MoveNet.
- `useMotionInBloomGame.ts`, `CameraPanel`, and `MissionPanel`/`TaskList` belong to the older flow and are not wired into the current app. Shared landmark indices and types remain in `src/types/game.ts`.

## Camera and runtime gotchas
- `predev`/`prebuild` run `scripts/prepare-pose-assets.mjs`: copy matching installed MediaPipe WASM into ignored `public/mediapipe/wasm/` and download the version-1 lite model only if absent. The model is kept in `public/mediapipe/`; built detection has no CDN dependency. GPU initialization falls back to CPU.
- Browser verification needs camera permission and a secure context (localhost or HTTPS). Start seated and centered with a head or shoulder pair visible for calibration; hips and knees are optional. During play, clear vertical motion of a calibrated head, shoulder pair, or hip pair can confirm a rise; head/shoulder clipping can fall back to remaining calibrated anchors. Preserve continuous movement without endpoint pauses and require a previously risen anchor to return before scoring; missing joints alone never count.
- `main.tsx` enables React StrictMode. Preserve effect cleanup for camera tracks, detector instances, animation frames, and timers.
- `usePoseCamera.attachVideo` attaches the current stream to its video element. A separate preload effect owns the detector; camera sessions borrow it. Preserve cancellation cleanup under StrictMode, stop tracks when camera is disabled, and close detectors on preload replacement/unmount (including late async completion).
- `GameQrCode` now renders the supplied `/qrcode.png`; it does not encode session results or the current page URL.
- Keep outcome feedback encouraging; raw performance grades are not part of the player UI.
