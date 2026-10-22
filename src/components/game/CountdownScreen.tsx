import type { ReactNode } from 'react'

export function CountdownScreen({ countdown, children }: { countdown: number; children: ReactNode }) {
  return (
    <section className="countdown-content" aria-live="assertive">
      <p>Stay seated. Move slowly when the game starts.</p>
      <strong key={countdown}>{countdown || 'Start!'}</strong>
      <div className="camera-preview">{children}</div>
    </section>
  )
}
