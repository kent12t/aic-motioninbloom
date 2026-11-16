import { test, expect } from '@playwright/test'

test('standalone dashboard filters, paginates and never loads detector assets', async ({ page }) => {
  const requests = []
  page.on('request', request => requests.push(request.url()))
  await page.goto('/offline-results.html')
  await expect(page.getByRole('heading', { name: 'Offline results', exact: true })).toBeVisible()
  await expect(page.getByText('375 of 375 rounds')).toBeVisible()
  await expect(page.locator('tbody tr')).toHaveCount(25)
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByText('Page 2 of 15')).toBeVisible()
  await page.getByRole('combobox').nth(1).selectOption('interrupted')
  await expect(page.getByText(/Page 1 of/)).toBeVisible()
  for (const status of await page.locator('tbody tr td:nth-child(6)').allTextContents()) expect(status).toBe('interrupted')
  await page.getByRole('button', { name: 'Reset filters' }).click()
  await page.getByLabel('From (UTC+8)', { exact: true }).fill('2030-01-01')
  await expect(page.getByText('No rounds match these filters.')).toBeVisible()
  await page.getByRole('button', { name: 'Reset filters' }).click()
  await page.getByLabel('From (UTC+8)', { exact: true }).fill('2026-10-30')
  await page.getByLabel('To (UTC+8)', { exact: true }).fill('2026-10-30')
  for (const time of await page.locator('tbody tr td:first-child').allTextContents()) expect(time).toContain('30 Oct 2026')
  await page.getByRole('combobox').nth(0).selectOption({ index: 1 })
  await page.getByRole('combobox').nth(2).selectOption('fast')
  for (const outcome of await page.locator('tbody tr td:nth-child(4)').allTextContents()) expect(outcome).toBe('Fast completion')
  expect(requests.some(url => /mediapipe|pose_landmarker|assets\/game-/.test(url))).toBe(false)
  expect(await page.locator('video').count()).toBe(0)
})

for (const size of [{ width: 390, height: 844 }, { width: 1440, height: 900 }, { width: 900, height: 500 }]) {
  test(`dashboard fits ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size)
    await page.goto('/offline-results.html')
    await expect(page.getByRole('button', { name: 'Reset filters' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.evaluate(() => document.fonts.ready)
    expect(await page.locator('h1').evaluate(el => getComputedStyle(el).transform)).toBe('matrix(0.8, 0, 0, 1, 0, 0)')
  })
}
