import { test, expect } from '@playwright/test'

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
  { width: 900, height: 500 },
]) {
  test(`camera dialog contains its controls and restores focus at ${viewport.width}×${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    await page.addInitScript(() => {
      window.cameraAttempts = 0
      navigator.mediaDevices.getUserMedia = async () => {
        window.cameraAttempts += 1
        throw new DOMException('Allow camera access in your browser, then try again.', 'NotAllowedError')
      }
    })
    await page.goto('/')
    await page.getByRole('checkbox').first().check()
    await expect.poll(() => page.evaluate(() => window.cameraAttempts)).toBe(0)
    const opener = page.locator('.setup-status button')
    await opener.click()
    const dialog = page.getByRole('dialog', { name: 'Check your camera' })
    const close = dialog.getByRole('button', { name: 'Close camera check' })
    await expect(dialog).toBeVisible()
    await expect(close).toBeFocused()
    await expect(dialog.getByRole('status')).toHaveText('Camera needs attention')
    await expect(dialog).toContainText('Allow camera access in your browser')
    await expect(page.locator('.camera-dialog')).toHaveJSProperty('scrollHeight', await dialog.evaluate((element) => element.clientHeight))

    const bounds = await dialog.boundingBox()
    expect(bounds.x).toBeGreaterThanOrEqual(0)
    expect(bounds.y).toBeGreaterThanOrEqual(0)
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width)
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height)
    for (const button of await dialog.getByRole('button').all()) {
      const box = await button.boundingBox()
      expect(box.x).toBeGreaterThanOrEqual(bounds.x)
      expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width)
      expect(box.y + box.height).toBeLessThanOrEqual(bounds.y + bounds.height)
    }
    await page.screenshot({ path: testInfo.outputPath('camera-dialog.png') })
    await page.keyboard.press('Shift+Tab')
    await expect(dialog.getByRole('button', { name: 'Done', exact: true })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(close).toBeFocused()

    const attempts = await page.evaluate(() => window.cameraAttempts)
    await dialog.getByRole('button', { name: 'Retry camera' }).click()
    await expect.poll(() => page.evaluate(() => window.cameraAttempts)).toBe(attempts + 1)
    await expect(dialog.getByRole('status')).toHaveText('Camera needs attention')
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(opener).toBeFocused()
    await opener.click()
    await close.click()
    await expect(opener).toBeFocused()
    await opener.click()
    await dialog.getByRole('button', { name: 'Done', exact: true }).click()
    await expect(opener).toBeFocused()
    await expect(page.getByRole('checkbox').first()).toBeChecked()
  })
}

test('camera starts only on request and persists through setup and instructions with uncalibrated start blocked', async ({ page }) => {
  // Real model initialization/inference can block the page on software-only CI.
  // Keep the normal smoke-test budget for the other tests.
  test.setTimeout(90_000)
  await page.addInitScript(() => {
    window.cameraAttempts = 0
    window.processedCameraFrames = 0
    const clearRect = CanvasRenderingContext2D.prototype.clearRect
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas.matches('.camera-stage canvas') && args[0] === 0 && args[1] === 0) {
        window.processedCameraFrames += 1
      }
      return clearRect.apply(this, args)
    }
    navigator.mediaDevices.getUserMedia = async () => {
      window.cameraAttempts += 1
      const canvas = document.createElement('canvas')
      window.cameraCanvas = canvas
      canvas.width = 720
      canvas.height = 1280
      const context = canvas.getContext('2d')
      context.fillStyle = '#fbefcd'
      context.fillRect(0, 0, canvas.width, canvas.height)
      window.cameraStream = canvas.captureStream(20)
      return window.cameraStream
    }
  })
  await page.goto('/')
  await page.getByRole('checkbox').first().check()
  expect(await page.evaluate(() => window.cameraAttempts)).toBe(0)
  await page.getByRole('button', { name: 'Check camera' }).click()
  await expect.poll(() => page.locator('.camera-stage video').evaluate((video) => video.readyState)).toBeGreaterThanOrEqual(2)
  // The guide is resized only after detectForVideo succeeds. Video readiness
  // alone does not prove that the asynchronous detector has initialized.
  await expect.poll(() => page.locator('.camera-stage canvas').evaluate((canvas) => canvas.width), {
    timeout: 60_000,
    message: 'the real local MediaPipe detector should process a camera frame',
  }).toBe(720)
  const preview = await page.locator('.camera-stage').boundingBox()
  expect(preview.width / preview.height).toBeCloseTo(1.5, 2)
  await page.getByRole('button', { name: 'Done', exact: true }).click()
  // Background calibration must keep receiving new frames with the dialog closed.
  const initialFrames = await page.evaluate(() => window.processedCameraFrames)
  await page.evaluate(() => {
    const context = window.cameraCanvas.getContext('2d')
    context.fillStyle = '#ee3d23'
    context.fillRect(0, 0, 20, 20)
  })
  await expect.poll(() => page.evaluate(() => window.processedCameraFrames)).toBeGreaterThan(initialFrames)
  await page.evaluate(() => {
    window.originalVideo = document.querySelector('.camera-stage video')
    window.firstInferenceVideoTime = window.originalVideo.currentTime
  })
  await page.getByRole('button', { name: 'Check camera' }).click()
  await expect(page.getByRole('dialog', { name: 'Check your camera' })).toBeVisible()
  await page.getByRole('button', { name: 'Done', exact: true }).click()
  for (const option of await page.getByRole('checkbox').all()) await option.check()
  await page.getByRole('button', { name: 'I am ready to start' }).click()
  await page.getByRole('button', { name: 'Check camera' }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Play now' })).toBeDisabled()
  await expect(page.locator('.stage-instructions')).toBeVisible()
  expect(await page.evaluate(() => ({
    sameVideo: window.originalVideo === document.querySelector('.camera-stage video'),
    sameStream: window.originalVideo.srcObject === window.cameraStream,
    trackState: window.cameraStream.getVideoTracks()[0].readyState,
    attempts: window.cameraAttempts,
  }))).toEqual({ sameVideo: true, sameStream: true, trackState: 'live', attempts: 1 })
  // The static canvas stops producing frames while the live clock advances.
  // Allow one initial inference before decoded-frame counters become available.
  await expect.poll(() => page.evaluate(() => window.originalVideo.currentTime - window.firstInferenceVideoTime)).toBeGreaterThan(0.1)
  const frames = await page.evaluate(() => ({
    processed: window.processedCameraFrames,
    decoded: window.originalVideo.getVideoPlaybackQuality().totalVideoFrames,
  }))
  expect(frames.processed).toBeLessThanOrEqual(frames.decoded + 1)

  // A genuinely new source frame must still be processed after deduplication.
  await page.evaluate(() => {
    const context = window.cameraCanvas.getContext('2d')
    context.fillStyle = '#71308b'
    context.fillRect(0, 0, 20, 20)
  })
  await expect.poll(() => page.evaluate(() => window.processedCameraFrames)).toBeGreaterThan(frames.processed)
})
