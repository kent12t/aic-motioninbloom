export function CountdownScreen({ countdown }: { countdown: number }) {
  return (
    <section className="screen countdown-screen" aria-label="Get ready">
      <p className="safety-reminder">Remember, be careful and<br />prioritise your safety</p>
      <div className="countdown-number" role="timer" aria-live="assertive"><span className="windsor">{countdown}</span></div>
    </section>
  )
}
