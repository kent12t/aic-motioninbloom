import { test, expect } from '@playwright/test'

test('production app loads, enforces acknowledgements, and restarts cleanly', async ({ page }) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('requestfailed', (request) => errors.push(`${request.url()}: ${request.failure()?.errorText}`))
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`)
  })
  // Exercise denied-camera handling without needing a physical camera in CI.
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException('Camera denied for smoke test', 'NotAllowedError')
    }
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /SAFETY CHECK/ })).toBeVisible()
  const start = page.getByRole('button', { name: 'I am ready to start' })
  const options = page.getByRole('checkbox')
  await expect(options).toHaveCount(3)
  await expect(start).toBeDisabled()
  await options.nth(0).check()
  await expect(start).toBeDisabled()
  await options.nth(1).check()
  await expect(start).toBeDisabled()
  await options.nth(2).check()
  await expect(start).toBeEnabled()
  await start.click()
  await expect(page.getByRole('heading', { name: 'How Strong Are Your Legs?' })).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(4)
  await expect(page.getByRole('button', { name: 'Play now' })).toBeDisabled()
  await page.getByRole('button', { name: 'Check camera' }).click()
  await expect(page.getByRole('dialog').getByRole('status')).toHaveText('Camera needs attention')
  await page.getByRole('button', { name: 'Done', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Camera needs attention.')
  await page.evaluate(async () => {
    await document.fonts.ready
    const images = [...document.images].filter((image) => image.getClientRects().length)
    await Promise.all(images.map((image) => image.decode()))
    for (const font of ['Windsor', 'Circular']) {
      const loaded = await document.fonts.load(`16px ${font}`)
      if (!loaded.length) throw new Error(`Local font did not load: ${font}`)
    }
  })
  await page.getByRole('button', { name: 'Return to safety check' }).click()
  await expect(page.getByRole('heading', { name: /SAFETY CHECK/ })).toBeVisible()
  for (const option of await options.all()) await expect(option).not.toBeChecked()
  await expect(start).toBeDisabled()
  expect(errors).toEqual([])
})

test('local detector assets are served as binary files', async ({ request }) => {
  for (const path of [
    '/mediapipe/pose_landmarker_lite.task',
    '/mediapipe/wasm/vision_wasm_internal.wasm',
  ]) {
    const response = await request.get(path)
    expect(response.ok(), path).toBeTruthy()
    expect(response.headers()['content-type']).not.toContain('text/html')
    const body = await response.body()
    expect(body.length).toBeGreaterThan(1_000_000)
    if (path.endsWith('.wasm')) expect([...body.subarray(0, 4)]).toEqual([0, 97, 115, 109])
  }
})

for (const flower of ['orange', 'pink', 'purple', 'violet', 'yellow']) {
  test(`${flower} WebM decodes and plays in the production build`, async ({ page }) => {
    await page.goto('/')
    await page.evaluate(async (name) => {
      const video = document.createElement('video')
      video.muted = true
      video.playsInline = true
      document.body.append(video)
      video.src = `/videos/${name}.webm`
      await video.play()
    }, flower)
    const video = page.locator('body > video')
    await expect.poll(() => video.evaluate((element) => element.currentTime)).toBeGreaterThan(0)
    expect(await video.evaluate((element) => element.videoWidth)).toBeGreaterThan(0)
  })
}
