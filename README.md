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

### Automatic production deployment (Cloudflare Pages)

Production: **https://aic-motioninbloom.pages.dev** (Pages project `aic-motioninbloom`, production branch `master`).

`.github/workflows/deploy-pages.yml` checks pull requests targeting `master` and every push to `master`. It can also be run manually from the Actions tab; only `master` can deploy. All of these must pass before production is invoked:

1. Locked dependency installation (`npm ci`) and `npm audit --audit-level=high` (includes development dependencies).
2. ESLint with zero warnings, synthetic tracker/round tests, and the TypeScript/Vite production build.
3. Required asset presence, exact copying of public assets, and Pages file-count/25 MiB per-file limits.
4. Chromium smoke tests against **the built site**: startup, safety acknowledgements, instructions, denied-camera feedback, restart, local fonts/images, binary detector asset delivery, and decoding/playback of all five WebMs.

The deploy job depends on successful checks and uploads the **same `dist/` artifact** that passed them. Pull requests never receive deployment credentials or deploy. Production publishes are serialized, and the job rejects a commit if `master` has moved before publishing. Failed checks leave the current live deployment in place and mark the GitHub run as failed; they do not revert the Git commit. Browser failures retain screenshots/traces for seven days.

#### One-time Cloudflare and GitHub setup

1. **Create the Pages project if it does not exist.** Use a Direct Upload project, since GitHub Actions builds and uploads the checked artifact. From a local terminal, run:

   ```sh
   npx wrangler@4.151.3 login
   npx wrangler@4.151.3 pages project create aic-motioninbloom --production-branch master
   ```

   Choose the Cloudflare account that will host the game. If `aic-motioninbloom` already exists, use that project and confirm its production branch is `master`. Keep Pages' separate Git-triggered builds disabled so publishing goes through this workflow's checks.

2. **Copy the account ID** from that account's Cloudflare dashboard (account overview / account menu → **Copy account ID**). Use the account ID, not a domain's zone ID. A custom domain is not required for the `pages.dev` site.

3. **Create a Cloudflare API token.** Under **My Profile → API Tokens → Create Token → Custom token**, grant **Account → Cloudflare Pages → Edit** and restrict account resources to the account containing the project. Copy the token when it is shown.

4. **Add the credentials to GitHub.** In this repository's **Settings → Environments**, create/select **production** (the exact environment name used by the workflow), then add these **environment secrets**. Repository secrets under **Settings → Secrets and variables → Actions** also work.

   | Secret | Value |
   | --- | --- |
   | `CLOUDFLARE_API_TOKEN` | A Cloudflare API token with **Account → Cloudflare Pages → Edit**, restricted to the account containing this project |
   | `CLOUDFLARE_ACCOUNT_ID` | The Cloudflare account ID containing `aic-motioninbloom` |

5. **Run the updated workflow on `master`.** After the fix is committed and pushed, open **Actions → Check and deploy Pages → Run workflow**, select `master`, and run it (the push also starts a run automatically). Confirm both **Production checks** and **Deploy production** succeed, then open the URL printed by Wrangler. The expected URL is `https://aic-motioninbloom.pages.dev`; Cloudflare can assign a suffixed hostname if that name is unavailable, in which case update the documented URL and workflow environment URL to match.

A local Wrangler browser login does not authenticate GitHub Actions. These deployment credentials belong in GitHub secrets; no Cloudflare runtime environment variables are needed by this static app. The workflow reports missing secrets in **Validate deployment credentials**. Re-running an older failed run uses its old test code, so use the updated `master` commit.

To also block merging failing pull requests, configure GitHub branch protection/rulesets for `master` to require the **Production checks** status. The workflow itself already blocks deployment when checks fail.

To run the same checks locally:

```sh
npm ci
npm audit --audit-level=high
npm run lint -- --max-warnings=0
npm run test:tracking
npm run build
npm run check:dist
npx playwright install chromium
npm run test:smoke
```

These checks do not certify real-person tracking, WebM alpha appearance, or booth-hardware performance; continue the manual checks below. They are pre-deployment gates, not automatic rollback after publication. The documented temporary calibration bypass and current-page QR destination remain active.

The camera-persistence smoke test uses the real local MediaPipe detector with a synthetic camera stream. Chromium explicitly uses SwiftShader software WebGL so hosted runners do not need a physical GPU. This test has a 90-second budget and waits up to 60 seconds for successful first-frame inference before checking dialog/countdown continuity; other smoke tests retain their 30-second budget.

## Tracking and booth setup

- Center the chair and camera. Frame shoulders and hips while seated for calibration. Aim to keep the hips visible throughout movement; the head/shoulders may leave the top of the image when standing. Knees are useful setup evidence, but are not required for repetition counting.
- The central 60% of the image is the safe zone. Pixels outside it are blacked out **before inference**, not just hidden in the preview. A guide shows the same boundary.
- Sit still for 1.5 seconds to establish a seated baseline, then press **Play now** after reading the instructions. Return home and recheck the safety options to recalibrate after moving the chair or camera.
- Detection runs at up to 20 FPS on a 640-pixel-wide input. The timer runs independently of inference.
- Clear vertical movement of the calibrated head, shoulders, or hips can confirm a rise, normalized to the seated torso scale. This is a forgiving game interaction rather than a clinical movement assessment. Players can keep moving naturally without pausing at either end.
- Confidence filtering, 60 ms smoothing, 80 ms multi-frame confirmation, and separate rise/return thresholds reject small bobs and single-frame jumps. A cycle scores only when a previously risen body anchor returns to seated height (or lower); missing landmarks alone cannot score. A deeper seat or changed head position does not block a valid return.
- A repetition requires a confirmed sitting → standing → sitting sequence. Losing all usable calibrated anchors for 800 ms discards the pending repetition; return to sitting to resume. Clipping only the head/shoulders does not interrupt counting while another calibrated anchor remains usable. The 40-second timer continues during loss.
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
