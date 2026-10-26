# Motion in Bloom — style and interaction guide

## 1. Authority and maintenance

Read this guide before every task and check the applicable sections before completing work. All agents must follow it, alongside `AGENTS.md`.

This guide captures the user-supplied portrait screen references and requirements. It defines the **target experience**, not a claim that every requirement is already implemented. Explicit user requirements take precedence over sampled colors or inferred details in a screenshot. Preserve the reference composition, wording, and hierarchy wherever specified below.

When the user approves a design or behavior change:

1. Update the relevant requirements here in the same changeset as the implementation.
2. Reuse shared tokens, components, and assets rather than introducing competing styles.
3. Update the implementation-status section when a gap is resolved or discovered.
4. Check affected states and report verification honestly, including any browser checks still needed.

Do not silently amend this guide to justify an implementation mismatch. Keep architecture and command guidance in `AGENTS.md`; keep visual and interaction requirements here.

## 2. Visual foundation

### Palette

| Role | Exact color | Use |
| --- | --- | --- |
| Light yellow | `#fbefcd` | Page background, portrait background outside gameplay, primary button text |
| Purple | `#71308b` | Default headings, primary buttons, selected controls, countdown, score/time panels, flower-frame borders, QR treatment |
| Dark orange | `#ee3d23` | Safety reminders and incomplete-result heading/highlights |
| Green | `#3a8149` | Standard-completion heading and time highlight |

Use black for normal body copy unless a reference explicitly uses a colored emphasis. Safety introduction and bold introductory copy use the reference's dark-purple treatment. Unchecked controls and disabled buttons use a neutral gray, clearly distinct from enabled purple controls; no exact gray or dark-purple shade has been supplied.

Centralize the four exact brand colors in `src/style.css` as CSS custom properties. Use descriptive semantic names such as `--color-background`, `--color-purple`, `--color-orange`, and `--color-green`. Reuse those values throughout the active UI.

The gameplay sky and hills come from `/bg-field.jpg`; their additional colors belong to the artwork. Keep outer viewport space plain light yellow. Avoid unrelated gradients, glass panels, drop shadows, or decorative card containers absent from the references.

### Typography

All fonts are local assets:

| Typeface | Asset | Use |
| --- | --- | --- |
| Windsor Regular | `/fonts/Windsor_Regular.ttf` | Display headings, primary button labels, countdown numeral, emphasized result time |
| Circular Std Book | `/fonts/CircularStd-Book.otf` | Body text, instructions, control labels, supporting text, numeric HUD values |
| Circular Std Black | `/fonts/CircularStd-Black.otf` | Bold supporting headings, safety emphasis, HUD labels |

**Every Windsor text treatment must use 80% horizontal scale.** Preserve its height: use `scaleX(0.8)`, not `scale(0.8)`. This includes headers and button labels, and any other text rendered in Windsor. Do not rely on `font-stretch` with this static font to create the effect.

Apply horizontal scaling to an inner text element rather than to the whole button, layout container, or clickable area. Set `transform-origin: left center` for left-aligned headings and `center` for centered text. Account for the unscaled layout width when fitting and wrapping text; transforms alone do not change layout measurement. Keep all Windsor rules in a shared typography treatment so new screens inherit them consistently.

Body text remains at 100% horizontal scale. Preserve the generous type sizes, readable line lengths, and deliberate line breaks in the references. Scale the composition with the portrait stage rather than letting typography grow with the surrounding landscape viewport.

## 3. Portrait stage and responsive layout

- Design against a **1080 × 1920, 9:16 portrait canvas**.
- Keep the main game composition at 9:16 on every screen, centered horizontally and vertically in the available viewport.
- Fit the complete stage inside the available width and height, like `object-fit: contain`. Extra space is the plain light-yellow page background.
- Scale the main content, backgrounds, HUD, flower, camera preview, and controls together. Do not stretch the stage into a landscape layout or rearrange it into desktop columns.
- A suitable stage size is `width: min(100vw, calc(100dvh * 9 / 16))` with `aspect-ratio: 9 / 16`; include safe-area insets in the available dimensions where necessary.
- Use stage-relative sizing or a proportionally scaled design canvas so text and overlays remain inside the same composition on short or wide viewports.
- Keep reference spacing: generous top breathing room, clearly grouped content, centered calls to action, and bottom-anchored artwork. Standard content pages have approximately 10–11% horizontal inset; gameplay HUD and camera use approximately 6%.
- Avoid clipping essential text, buttons, or the camera. Keep video and artwork in their original proportions.

The optional home control belongs to the **top-left of the portrait stage**, not the far-left of a wide desktop viewport. Keep it small and visually quiet, with an accessible name, keyboard focus, and a usable hit area.

## 4. Assets

All application assets must live under `public/`, including images, fonts, videos, icons, and detector runtime assets. Reference them by public URL (`/bg-flower.png`, not `/public/bg-flower.png`). Preserve existing asset filenames and letter case.

| Public URL | Purpose |
| --- | --- |
| `/bg-flower.png` | Bottom floral border on safety, instructions, countdown, and results |
| `/bg-field.jpg` | Full portrait gameplay landscape and result-frame landscape treatment |
| `/instr1.png` … `/instr4.png` | Four instruction illustrations, in order |
| `/flower-pots.png` | Supplied pot artwork for result flower compositions |
| `/videos/orange.webm` | Transparent flower animation |
| `/videos/pink.webm` | Transparent flower animation |
| `/videos/purple.webm` | Transparent flower animation |
| `/videos/violet.webm` | Transparent flower animation |
| `/videos/yellow.webm` | Transparent flower animation |
| `/videos/*-bud.png`, `/videos/*-bloom.png` | Transparent first/last-frame video derivatives for posters and playback fallback |
| `/videos/*-flower.png` | Cropped bloom derivatives for consistent result-pot composition |
| `/home.svg` | Inconspicuous restart/home control |
| `/close-camera.svg`, `/camera-unavailable.svg` | Setup-camera dialog close control and unavailable-camera illustration |
| `/fonts/…` | Local fonts listed above |
| `/mediapipe/…` | Local model and prepared WASM runtime; see `AGENTS.md` |

Preserve WebM alpha transparency; the field should remain visible behind the flower. Do not replace supplied flower animations with CSS-drawn flowers, hue-rotated duplicates, or opaque video backgrounds. Any additional stills/posters or design reference files added to the repository also belong under `public/`.

Use the updated supplied flower videos (2026-10-26). Orange, Pink, Purple, and Violet retain their full duration; Yellow ends at 00:09. Regenerate each `*-bud.png` from the first decoded frame and each `*-bloom.png` from the last decoded frame of its playback asset, including the trimmed Yellow clip. Regenerate `*-flower.png` from the alpha-trimmed bloom, preserving aspect ratio at 600 pixels high.

The supplied screen attachments are the visual references. Their original filenames are not recorded in this repository guide; the state names below provide the mapping. If reference files are added, record their actual paths here rather than inventing filenames.

### Floral-border opacity

| Screen | `/bg-flower.png` opacity |
| --- | --- |
| Safety check, including partial and complete checkbox states | 100% |
| Instructions | 100% |
| Countdown | **20%** |
| Every result variant | **20%** |
| Playing | Use the field background instead |

Apply opacity to a dedicated decorative image/layer only. Text, buttons, QR codes, and camera must stay fully opaque. Anchor the border to the stage bottom, spanning its width without distortion, behind functional content. Decorative artwork must not intercept input or be announced as content.

## 5. Screens and shared components

### Safety check — initial, partially checked, all checked

- Initial entry and a full restart land here with **all three options cleared**.
- Left-aligned, purple Windsor heading on two lines: “SAFETY CHECK / BEFORE YOU BEGIN”.
- Introduction: “This activity involves sitting down and standing up five times from a chair placed against a wall, without using your arms or armrests for support.”
- Bold prompt: “Check the boxes below if you’re up for it.”
- Three independently toggleable checkboxes, displayed as large circular controls:
  1. “I feel physically fit to do this activity”
  2. “I can sit and stand without using my arms or any support”
  3. “I can do this activity without feeling any pain or discomfort”
- Unchecked: gray ring with transparent/light-yellow center. Checked: purple outer ring and purple center separated by a light-yellow gap.
- The whole associated label should toggle its checkbox. Preserve checkbox semantics even though the visuals are circular.
- Bottom-centered pill button: “I am ready to start”. Gray and genuinely disabled until all three are checked; purple when all are checked. Label is light yellow, Windsor at 80% horizontal scale.
- Full-opacity floral border at the bottom.

### Instructions

- Heading: “How Strong Are Your Legs?” in purple Windsor.
- Bold subtitle: “Stand and sit as quickly as you can”.
- Four rows with purple numbered circles on the left, black instruction copy in the middle, and the corresponding supplied illustration on the right:
  1. “Start by sitting in the middle of the chair” — `/instr1.png`
  2. “Cross your arms or keep them over your chest” — `/instr2.png`
  3. “Stand up fully and sit down again” — `/instr3.png`
  4. “Repeat this five times without stopping and watch the flowers bloom!” — `/instr4.png`
- Centered bold orange reminder: “Remember, be careful and prioritise your safety”.
- Purple pill button: “Play now”. Full-opacity floral border below.

### Countdown

- Light-yellow stage, 20%-opacity floral border.
- Centered bold orange safety reminder above a large purple Windsor numeral: “3”, “2”, “1”.
- Live camera inset at the lower left, above the floral layer, with rounded corners.
- The player remains seated; countdown does not count repetitions or consume the 40-second game time.

### Playing

- `/bg-field.jpg` fills the portrait stage. The transparent flower video is the dominant foreground element, centered and large, with its stem reaching toward the bottom as in the reference.
- HUD: “Time” at top-left and “Score” at top-right, each above a purple rounded rectangular value panel. Labels use bold dark-purple Circular; values use a high-contrast light color.
- Format time as `MM:SS`; keep it driven by the shared game timer. Score is the number of **completed** sit/stand cycles, from 0 to 5.
- Purple Windsor encouragement (“Keep Going!”) below the HUD.
- Camera inset remains at lower left. Reference proportions are approximately 27% of stage width and 27% of stage height, with about 6% left inset and 2% bottom inset; use the same placement in countdown and gameplay.
- Fill the entire camera frame with a centered, aspect-ratio-preserving cover crop, including its full height; do not leave letterbox or pillarbox bars. Landscape feeds crop evenly at the sides in the portrait inset. Apply exactly the same cover sizing, center position, and mirroring to the source-resolution guide canvas and video so inference-mask/overlay alignment is preserved. A portrait camera frame must not distort the player or independently crop the overlay. Keep relevant joints visible and retain useful tracking guidance without competing with the main composition.

### Results — shared composition

- Light-yellow stage and 20%-opacity bottom floral border.
- Centered heading, outcome-specific supporting text, ordered flower gallery, explanatory copy, QR block, and purple “Play again” pill button.
- Center-align the explanatory body copy in every result variant with natural word spacing; do not justify it. Use paragraph wrapping that avoids a single orphaned word on the last line.
- Five completed flowers form a centered **three-over-two** arrangement. Partial results show only completed flowers, centered; do not fabricate flowers to fill empty slots. With **zero completed cycles**, show **one centered empty pot** using `/flower-pots.png`, with no flower overlay; the displayed completion count stays 0.
- Each flower is framed by a thin purple arch with a flat bottom, a landscape background, and a pot. Show the bloomed appearance of the actual recorded flower for that cycle.
- The result flower is the corresponding video's **last frame**, paused or captured as a transparent still. Alpha-trimmed last-frame derivatives are permitted. Bottom-align the frame image within the pot composition, with padding above the pot base so the stem reaches the soil. Preserve its aspect ratio and layer the front pot rim over the stem tip so it looks planted. The current composition uses a 13% bottom inset, shared across flower types and scaled with the pot frame.
- Preserve chronological order left-to-right, then top-to-bottom. Never randomize the gallery during rendering or derive flower identity from its array index.
- Highlight elapsed time to one decimal place; choose the outcome using the unrounded time.
- Purple QR code with supporting label “Scan here / to read more”. Ensure it remains scannable and has an accessible description.

| Outcome | Condition | Heading and support | Accent |
| --- | --- | --- | --- |
| Fast completion | Five complete cycles in less than 12 seconds | “5 STANDS COMPLETED!”; “Your flower has bloomed!”; “Your time: {time} seconds” | Purple |
| Standard completion | Five complete cycles from 12 seconds up to the 40-second deadline | “5 STANDS COMPLETED!”; “Your time: {time} seconds”; “Well done! You’ve completed the challenge!” | Green heading and time highlight |
| Incomplete / timeout | Deadline reached before five complete cycles | “KEEP MOVING!”; “You have completed {count} sets” | Orange heading and completed-count message |

Use these explanatory paragraphs:

- **Fast:** “Getting up from a chair is one simple way to check how we are moving as we age. Regular frailty screening helps us pick up these changes easily.”
- **Standard:** “One activity doesn’t tell us everything about your health. Which is why regular screening is important.”
- **Incomplete:** “Everyone moves at a different pace. What matters is understanding how you are doing and taking steps to stay strong. Regular frailty screening helps us pick up changes early.”

Keep every outcome encouraging. “Failed” is an internal outcome description, not a player-facing grade or diagnosis. Zero completed cycles use the same supportive composition with one empty pot as a visual placeholder, never an awarded flower.

The QR destination has not been supplied. The current `GameQrCode` encodes `window.location.href`; the reference's “read more” destination requires an approved URL. Do not invent a screening-information URL or imply session results are encoded.

## 6. Interaction and animation contract

### Flow and seated calibration

`Safety check → Instructions → Countdown → Playing → Results`

- The player starts **seated**. Begin camera initialization and background seated calibration when a safety checkbox is first checked; the user can continue reading and checking the remaining options while calibration runs.
- Do not count safety-screen, instruction-screen, or countdown movements as game repetitions.
- Require all three acknowledgements to leave safety. Require a ready camera and valid seated calibration before starting the countdown; if still preparing, give concise guidance and allow camera retry when needed.
- **Temporary debugging exception:** `GAME.requireCalibration` in `src/game/config.ts` is currently `false`. This keeps “Play now” enabled and bypasses the start/countdown calibration guards, even if the camera fails or calibration is incomplete, so later screens are accessible while debugging. Camera initialization, calibration feedback, and real pose-based repetition counting still run. Keep the gating feature: restore this flag to `true` to reinstate the intended readiness requirement above. Safety acknowledgements remain required.
- Preserve the seated baseline across instructions and countdown. Do not require a separate standing calibration that conflicts with this flow.
- “Check camera” / “Set up camera” opens a centered, stage-scaled modal with a light-yellow surface, purple border, Windsor heading, and a large undistorted live preview using the same centered cover crop and aligned overlay as the gameplay inset. Keep the close button inside its header; never float a separate hide/close control above the preview. Dim and block the background while open, contain keyboard focus, support Escape, and restore focus to the opener on dismissal.
- Group seated-calibration status/progress below the preview, followed by concise shoulders-and-hips framing guidance. Show camera errors with a clear retry action. A “Done” button dismisses the check regardless of calibration readiness. Dismissal preserves the mounted video, stream, and background calibration; it does not stop the camera or advance the game.
- Start the monotonic game timer when countdown ends. The round targets five complete **seated → standing → seated** cycles within 40 seconds.
- Repetition detection is a forgiving game interaction, not a clinical movement assessment. A clear upward displacement of the calibrated head, shoulders, **or** hips is enough to confirm a rise; knee extension and simultaneous visibility of every joint are not required during play. Use the fixed seated torso scale for displacement thresholds.
- Players may move continuously with **no deliberate pause at the top or bottom**. Short multi-frame debouncing and separated rise/return thresholds reject single-frame spikes and small bobs. Award one cycle only after a previously risen body anchor returns to its seated height (or lower); a deeper seat or modestly changed head position must not block a valid return. Prefer visible risen hips, then shoulders, then head for return evidence, so head bobs while the hips remain raised do not create extra cycles. Do not re-trigger the flower or award another cycle while the same rise remains in progress.
- The head/shoulders may leave the top of the frame during a rise if another calibrated anchor remains visible. Missing landmarks alone never imply a rise or seated return. If all usable anchors are lost for 800 ms, discard the pending cycle and require a seated return before counting again. A brief interruption resets transition confirmation without automatically discarding an already confirmed rise.

### Flower lifecycle

1. Select a flower from the five supplied WebMs for the current cycle, record its identity in session state, and show its first decodable frame **paused** while the player is seated.
2. On a small, sustained upward movement from the seated position, play that flower's animation once, even if the attempt never becomes a confirmed stand. This visual reward is independent of scoring. Require actual upward movement as well as displacement above the visual threshold: descending or resting within the overlapping seated-return/visual-threshold range must not start the next flower. Debounce the early-rise signal and retain existing visibility/tracking safeguards; never trigger from missing joints. Do not replay the flower on repeated attempts within the same cycle.
3. On the confirmed return to sitting, count one completed cycle and commit that flower to the ordered completed-flower list.
4. If fewer than five cycles are complete, keep the previous completed flower's bloom visible while the player is seated. Prepare the next randomly selected flower paused at its first frame but hidden; reveal it and start its animation only when the player begins the next sustained ascent.
5. On the fifth completed cycle, finish immediately. Results use the recorded completed-flower list, not a new random selection.

Randomize the five supplied video assets without replacement: each round uses every flower type exactly once, with no duplicates among its five cycles. Generate a fresh order for each round, not during render. Keep the current attempted flower distinct from the completed list so a timeout while standing does not award an uncompleted cycle.

Use muted, inline video playback, preload enough to show the paused frame, and handle asynchronous loading and rejected playback promises. Preserve a stable first frame before standing and a stable bloomed frame after playback ends; do not loop. Animation loading or duration must not delay, duplicate, or determine pose-based repetition counting. If the player sits before the clip ends, the completed-cycle event still advances the game.

Target approximately three seconds per bloom, normalized to each clip's duration. Give the first 80% about 2.6 seconds and compress the lingering final 20% into about 0.4 seconds, then hold the exact bloom still. Preload the next selected video and bud/bloom stills. On a completed cycle, hold the completed bloom without a timed fade while the next bud is mounted but hidden and ready to respond to movement. Switch to the next flower on its sustained early-rise signal, not on the seated return or a timer. The fifth completion goes immediately to results, where the completed bloom is shown. Failed stand attempts bloom visually but do not add a flower to the completed gallery or change the existing scoring rules.

### Deadline and outcome boundaries

- Fast: five completed cycles with raw elapsed time `< 12` seconds.
- Standard: five completed cycles with raw elapsed time `>= 12` seconds **before the deadline**.
- At `>= 40` seconds, stop accepting repetitions and show the incomplete outcome if five cycles have not already completed. The existing tracker orchestration gives timeout priority at the exact deadline; preserve one consistent boundary across timers and pose callbacks.
- Freeze count, order, and time on finish. Late pose callbacks and video events must not mutate the result.
- Tracking loss must not create a stand, seated return, or completed flower. Preserve existing tracker protections and clear recovery guidance.

### Restart and optional home button

- “Play again” and the optional top-left home button return to safety with all checkboxes cleared.
- Clear calibration, cycle count, timer, countdown, elapsed result, current flower, saved flower order, and pending video playback/events. A new round receives fresh selections.
- Cancel previous round timers, animation frames, and stale asynchronous callbacks. Preserve React StrictMode-safe camera/detector cleanup and stream reattachment.
- Home must work during instructions, countdown, playing, and results. Use an accessible label such as “Return to safety check”.
- Results remain visible until “Play again” or home is pressed; there is no automatic timed restart.

## 7. Verification checklist

For applicable UI/gameplay changes:

- Check the exact four brand colors and local font loading; every Windsor text element is horizontally scaled to 80% without shrinking its parent control.
- Compare safety (none/partial/all checked), instructions, countdown, gameplay, fast result, standard result, and incomplete result against the supplied references.
- Check a 9:16 viewport, a wider desktop viewport, and a short viewport: stage stays centered, fully fitted, and proportional, with plain-yellow excess space.
- Check floral artwork at 100% on safety/instructions and exactly 20% on countdown/all results, with fully opaque controls and content.
- Check keyboard operation, visible focus, checkbox labels, disabled start semantics, accessible home control, and readable/scannable QR.
- In a camera-enabled browser, check first-checkbox initialization, seated calibration, countdown, stand-triggered video playback, sit-triggered advancement, five completed cycles, tracking loss, and restart from each active state.
- Check WebM transparency, paused first frame, no repeated playback per stand, no animation-driven score, and identical gameplay/result flower ordering, including no duplicate selections within a round and partial/zero completion.
- Check outcome boundaries around 12 seconds and the 40-second deadline using raw elapsed time; rounded display must not change the outcome.
- Run `npm run lint` and `npm run build` for application changes. Run `npm run test:tracking` when tracker or repetition orchestration changes. Browser checks remain necessary for camera and video behavior.
- For documentation-only changes, review the diff, asset paths, requirements, and links; application checks are not required.

## 8. Implementation status

Implemented:

- Local fonts and assets, exact brand palette, shared 80%-scaled Windsor treatment, fitted/centered 9:16 stage, and screen-specific floral opacity.
- Safety acknowledgements with deferred camera startup/background calibration, illustrated instructions, readiness-gated countdown, and gameplay HUD/camera inset. An unobtrusive setup status and “Check camera” control expose framing/retry without blocking checkbox completion.
- Setup-camera check uses a centered native modal with an integrated close button, large preview, grouped calibration feedback, framing guidance, retry, and Done. Background controls are inert while open; explicit Tab wrapping, Escape dismissal, and native opener-focus restoration support keyboard use. The same video remains mounted through setup and gameplay.
- Setup, countdown, and gameplay camera frames use a centered cover crop without empty bars; video and source-resolution guide canvas share identical sizing, positioning, and mirroring.
- Sustained early-rise events start the current transparent WebM independently of confirmed stands; seated returns after confirmed stands score and advance. Playback targets three seconds with a compressed ending, holds the bloom still, and preloads the next selection. Completed blooms remain visible until the next sustained ascent reveals and plays the prepared next flower. `FlowerRound` selects all five flower types in random order without replacement, preserves the selected/completed order, enforces the deadline, and prevents late events from mutating results. Rejected playback uses corresponding stills without affecting counting.
- Post-calibration vertical displacement uses independent head/shoulder/hip anchors and the fixed seated torso scale. Knees are optional setup evidence and do not gate repetitions. 60 ms time-based smoothing, 80 ms multi-frame transition debouncing, separate rise/return thresholds, and a previously risen-anchor return latch support continuous movement without endpoint pauses. Visibility, safe-zone, lateral/body-scale continuity, and tracking-loss protections remain active; a clipped head or shoulders can fall back to visible calibrated anchors.
- Purple fast, green standard, and orange incomplete results; actual flowers in ordered pot frames, three-over-two layout, and a two-row partial-result layout for four completed flowers.
- Explanatory body copy is center-aligned with natural word spacing and `text-wrap: pretty` to avoid orphaned final words across all result variants.
- Result flowers use transparent last-frame stills bottom-anchored with pot-relative padding, with the foreground pot lip covering the stem tip.
- Zero-completion results show one centered empty pot, with no flower overlay and a completion count of 0.
- Home/play-again clear acknowledgements, baseline, timers, video, and flower state. Camera tracks/detector are cleaned up at results and full restart.

Verification performed during implementation:

- Descending-return trigger fix (2026-10-26): reproduced the next flower starting after a seated return with a failing synthetic tracker/round regression. Early-rise confirmation now requires sustained upward motion, not height alone, preventing the overlap between seated-return tolerance and bloom thresholds from triggering during descent or rest. The regression passes after the fix; all 24 tracker/round tests, lint, and production build passed. Live camera verification remains pending.
- Ascent-triggered flower handoff (2026-10-26): lint, production build, and diff review passed. Completed blooms now stay visible throughout the seated interval, with the prepared next flower hidden until its early-rise signal. Camera-enabled browser verification of the seated hold and next-ascent switch remains pending.
- Full-frame camera crop (2026-10-26): lint and production build passed; reviewed the shared video/canvas cover sizing and source-resolution overlay geometry. Camera-enabled browser and physical-camera visual checks remain pending.
- Early-rise flower playback (2026-10-26): lint, production build, all 23 tracker/round tests, and all 11 existing Chromium smoke tests passed. New synthetic regressions confirm a sustained partial rise can trigger visual blooming without confirming a stand, scoring a cycle, or adding an attempted flower to timeout results; setup and missing landmarks do not trigger early-rise rewards. Existing browser checks cover source WebM decoding/playback and setup lifecycle, not the new three-second pacing or completed-bloom handoff. Real-person early-rise sensitivity, accelerated playback/transparency, preloading, rapid-cycle handoffs, and fifth-cycle results still need visual verification on booth hardware.
- Updated flower assets (2026-10-26): trimmed Yellow to exactly 9.000 seconds using stream copy to preserve the supplied VP9/alpha data. Regenerated all five first/last-frame PNG pairs and all five alpha-trimmed result flowers. Decoded-frame MD5 comparisons confirmed every bud/bloom matches its video's first/last frame; all 15 PNGs retain transparent and opaque pixels. Result derivatives preserve aspect ratio at 600 pixels high. Asset/documentation diff reviewed; browser playback and visual composition were not rechecked.
- Result-copy alignment/wrapping (2026-10-23): lint and production build passed. A focused Chromium check using the built CSS and local fonts confirmed center alignment, pretty wrapping, and more than one word on the final line for all three explanatory paragraphs at 1080 × 1920, 390 × 844, 1440 × 900, and 900 × 500. Camera/gameplay checks were not repeated for this typography-only change.
- Unique-flower selection (2026-10-23): lint, production build, and all 21 tracker/round tests passed. Automated checks cover all five flowers appearing exactly once even with repeated random values, fresh round state, completed-flower ordering, and partial results. Camera/video browser checks were not repeated for this selection-only change.
- Camera-dialog redesign (2026-10-23): lint, production build, and all 11 Chromium browser tests passed. Added checks at 390 × 844, 1440 × 900, and 900 × 500 for contained dialog/buttons, no internal overflow, initial focus, Tab wrapping, Escape/close/Done dismissal, opener-focus restoration, retained safety acknowledgement, and denied-camera retry. Reviewed screenshots at all three sizes. A synthetic camera stream check confirmed the same live stream/video survives dialog dismissal, reopening on instructions, and transition to countdown without another camera request. Physical-camera calibration and real-person gameplay were not rechecked for this UI change.
- `npm run lint`, `npm run build`, and `npm run test:tracking` (11 synthetic tracker/round tests).
- Chromium checks with a synthetic camera stream and deterministic detector landmarks: first-checkbox startup, calibration, countdown, paused buds, standing playback, sitting advancement, all three results, order preservation, tracking loss, four-flower timeout layout, rejected-playback fallback, home during countdown, and cleared restart.
- Screenshot review of safety states, instructions, countdown, gameplay, and result variants; fitted/centered stage checks at portrait, desktop, and short viewport sizes.
- Result-pot alignment refinement: Chromium checks of all five last-frame images confirm bottom anchoring with 13% padding, preserved aspect ratio, and foreground-rim layering; portrait/mobile screenshots reviewed. Lint and production build passed.
- Separate Chromium check with the actual local MediaPipe model/WASM and a synthetic camera stream: initialization/inference, permission denial/retry, disabled uncalibrated start, local-only asset requests, and stopped tracks after home.
- Temporary calibration-bypass check: with a failed camera, `requireCalibration: false` permits Play now → countdown → gameplay → timeout; a browser-only `true` override restores disabled-button and start-handler gating. Safety acknowledgements stay required. Lint, build, and all 11 tracker/round tests passed after this change.
- Zero-completion empty-pot update: browser timeout check verified exactly one centered empty pot, no flower overlay, and “You have completed 0 sets”; screenshot reviewed. Lint and production build passed.
- Live USB-camera diagnosis and retest (2026-10-23): Chrome with the actual local MediaPipe detector reproduced zero counted cycles despite visible, accepted joints and sufficient hip rise. Per-frame torso normalization suppressed standing extension as the projected torso grew from approximately 0.196 seated to 0.30 standing. After switching to the calibrated seated scale, a second real-person round produced exactly five alternating stand/completed-cycle events and the standard result at 24.7 seconds. Observed stand-triggered flower playback, score advancement on seated returns, five result flowers, stopped USB-camera tracks on results, and Play again returning to safety with all acknowledgements cleared and the start button disabled. Reviewed setup, gameplay, and result screenshots. Lint, build, and all 12 tracker/round tests passed; the new camera-angle regression failed before the fix and passed afterward. Live tracking-loss recovery, other camera angles/participants, and sustained booth operation were not checked in this session.
- Continuous-movement update (2026-10-23): a real-person Chrome/USB-camera retest of independent vertical anchors and short debouncing registered five alternating rise/return events and a standard result at 14.9 seconds, with the player asked to move naturally without endpoint pauses. Subsequent return refinements (lower seated positions, modestly changed head position, hip-first return evidence, and per-anchor rise confirmation) are covered by automated regressions. Final lint, production build, and all 20 tracker/round tests passed. Synthetic coverage includes five no-pause triangular cycles at 0.8, 1.2, and 2.0 seconds per cycle; head-only counting; head/shoulder top clipping with hips visible and unreliable knees; brief/long tracking loss; single-frame spikes; small bobs; threshold chatter; head bobs with raised hips; and disappearance of the risen anchor. Live top-of-frame clipping and live tracking-loss recovery remain unverified.

Deployment automation:

- GitHub Actions checks pull requests and `master` pushes before publishing the verified build artifact to Cloudflare Pages. Gates include dependency audit, zero-warning lint, tracker/round tests, typecheck/build, and required assets/Pages limits. Chromium production smoke tests run only through the separate manually dispatched `Browser smoke tests (manual)` workflow; they do not gate deployment. Normal deployments do not install browsers or their system dependencies. Smoke coverage is limited to startup/setup/restart, asset delivery, and WebM decoding/playback; it does not replace the camera-enabled and real-person verification above. See `README.md` for deployment credentials and manual browser-check instructions.
- Local pipeline verification: locked install, dependency audit (zero reported vulnerabilities), zero-warning lint, all 11 tracker/round tests, production build, asset checks, and all seven Chromium smoke tests passed. A temporary missing-build-asset probe correctly failed the asset gate. Workflow YAML and job/artifact ordering were reviewed locally; a hosted Actions run remains pending activation.
- Hosted camera-smoke failure follow-up (2026-10-23): Actions run `39923805047` passed audit, lint, all 21 tracker/round tests, build, and asset checks, then timed out during the real-detector camera-persistence smoke test. A local GPU-disabled check reproduced a 30-second timeout. Chromium now explicitly uses SwiftShader software WebGL; only the real-detector lifecycle test has a 90-second budget, with a 60-second first-inference assertion before dialog/countdown interactions. Locked install, audit (zero vulnerabilities), zero-warning lint, all 21 tracker/round tests, build, asset checks (45 files), and all 11 Chromium smoke tests passed locally; the camera test took 34.7 seconds and confirmed successful real local inference and retained video/stream through countdown. Physical-camera gameplay was not repeated. A hosted rerun of the updated commit and Cloudflare project/credential setup remain unverified; the one-time setup is documented in `README.md`.
- Decoded-frame deduplication follow-up (2026-10-23): run `39926004340` still timed out at 90 seconds; its trace showed successful initialization followed by 12–14-second browser interactions during repeated synchronous software inference. The live synthetic stream's `currentTime` advanced without new images. Camera inference now deduplicates using decoded-frame counts where available, falling back to media time when no counter is available, while retaining the 20 FPS maximum and existing tracking-loss checks. A regression probe failed against the previous build with hundreds of overlay clears for a static source. Final zero-warning lint, typecheck/build, all 21 tracker/round tests, asset checks, and all 11 Chromium smoke tests passed; the camera lifecycle test took 4.5 seconds. Browser coverage confirms first real inference, new-frame processing with the setup dialog hidden, continued processing after countdown entry, bounded inference of unchanged frames, and preserved stream/video identity. Physical-camera gameplay and a hosted rerun of this follow-up remain unverified. Deployment was skipped in the failed hosted run, so Cloudflare credentials have not yet been exercised.
- Manual-only browser CI policy (2026-10-23, user-approved): run `39927475396` passed all checks and deployed to Cloudflare, confirming hosted camera-smoke recovery and working credentials. Its browser/system-dependency installation took 9 minutes 56 seconds, including a 9-minute-37-second system-package download; the browser tests themselves took 15 seconds. Browser installation, smoke tests, and failure diagnostics now live in `.github/workflows/browser-smoke.yml`, triggered only by `workflow_dispatch`. Deployment retains all fast gates and the same checked-artifact handoff. Parsed both workflow YAML files and validated trigger isolation, retained fast gates, artifact handoff, browser build/install/test ordering, failure diagnostics, and absence of deployment credentials in the browser workflow. Documentation/diff review passed; application tests were not repeated for this CI-only change. A hosted run of the revised workflows remains pending.

Remaining verification/integration:

- Temporary screen-debugging bypass is active (`GAME.requireCalibration: false`). Restore to `true` when finished debugging to re-enable the existing Play now/countdown readiness gates.
- Real-person USB-camera checks cover the initial normalization fix and continuous-motion counting. Broader calibration/repetition accuracy across participants and camera positions, live tracking-loss recovery, live head-out-of-frame movement, and sustained video performance still need checking on the intended booth hardware.
- The QR still links to the current page; the approved “read more” URL remains unspecified.

Update this section as changes land; keep the normative requirements above intact unless the user changes them.
