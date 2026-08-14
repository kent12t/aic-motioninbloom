# Motion in Bloom

Motion in Bloom is a browser game experience inspired by movement screening tasks:

1. Stand and Sit
2. Walk and Turn
3. Balance on One Leg

The game uses camera-based pose detection with MoveNet (TensorFlow pose-detection package). Progress is visualized as a flower that blooms after each completed task.

## Product behavior

- Timed tasks run in sequence after calibration.
- Internal performance signals are computed for movement completion, quality, and endurance.
- Raw grade values are not shown to players.
- End-of-session feedback is always encouraging.

## Local development

```bash
npm install
npm run dev
```

Open the local Vite URL in a modern browser and allow camera permission.

## Detection notes

- `Stand and Sit`: hip-to-knee vertical relationship is used to estimate stand/sit cycles.
- `Walk and Turn`: shoulder-width change and direction signal changes are used as turn proxies.
- `Balance on One Leg`: ankle height difference and nose sway are used to estimate hold quality.

## Safety checklist

1. Add a clear fail-safe message when pose tracking confidence is low.
2. Provide a seated recovery option between movement tasks.
3. Validate that no discouraging language appears in any user outcome path.
