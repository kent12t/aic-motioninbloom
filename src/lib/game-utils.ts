export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function formatTimer(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds))
  const min = String(Math.floor(safe / 60)).padStart(2, '0')
  const sec = String(safe % 60).padStart(2, '0')
  return `${min}:${sec}`
}

export function scoreToMessage(score: number): string {
  if (score > 0.85) {
    return 'Wonderful consistency. Your bloom is glowing with confident movement.'
  }
  if (score > 0.65) {
    return 'Great effort today. Your flower opened beautifully from start to finish.'
  }
  return 'You kept going, and that matters. Your bloom still opened with care and courage.'
}
